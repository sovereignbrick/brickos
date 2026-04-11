'use client'

// Sprint 040 #481 -- Invoices tab for the platform admin Org detail page.
//
// Lists past invoices and provides a "new invoice" form that creates either
// a local draft or pushes through to the Stripe Invoices API. Stripe sync
// requires the org's stripe_customer_id (entered manually for now -- a
// future iteration could read it from a Stripe customer search).
//
// design 022 §3.9 + §7.2 Screen 2 (Invoices tab).

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date-format'

interface Product {
  slug: string
  name: string
  default_unit_amount_cents: number
  billing_period: 'monthly' | 'yearly' | 'one-time'
  description: string
}

const PERIOD_BADGE: Record<Product['billing_period'], { label: string; color: string }> = {
  monthly: { label: 'monthly', color: 'bg-blue-400/10 text-blue-300' },
  yearly: { label: 'yearly', color: 'bg-purple-400/10 text-purple-300' },
  'one-time': { label: 'one-time', color: 'bg-zinc-700 text-zinc-300' },
}

interface InvoiceRow {
  id: string
  stripe_invoice_id: string | null
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void' | 'failed'
  line_items: Array<{
    product_slug: string
    name: string
    quantity: number
    unit_amount_cents: number
  }>
  total_amount_cents: number
  due_days: number
  memo: string | null
  created_at: string
  sent_at: string | null
  paid_at: string | null
}

interface LineItemDraft {
  product_slug: string
  name: string
  quantity: number
  unit_amount_cents: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  sent: 'bg-blue-400/10 text-blue-400',
  paid: 'bg-green-400/10 text-green-400',
  overdue: 'bg-amber-400/10 text-amber-400',
  void: 'bg-zinc-800 text-zinc-500',
  failed: 'bg-red-400/10 text-red-400',
}

const CURRENCIES = ['eur', 'usd', 'chf']

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export interface InvoicesTabProps {
  orgId: string
}

export function InvoicesTab({ orgId }: InvoicesTabProps) {
  const t = useTranslations('platform.orgDetail.invoicesTab')
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [currency, setCurrency] = useState('eur')
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([])
  const [dueDays, setDueDays] = useState(30)
  const [memo, setMemo] = useState('')
  const [stripeCustomerId, setStripeCustomerId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Sync state per row
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const res = await api.admin.listOrgInvoices(orgId)
      setInvoices(res.data)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
    api.admin
      .listInvoiceProducts()
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const subtotal = lineItems.reduce(
    (acc, li) => acc + Math.max(0, li.quantity) * Math.max(0, li.unit_amount_cents),
    0,
  )

  const addLine = () => {
    const first = products[0]
    if (!first) return
    setLineItems((prev) => [
      ...prev,
      {
        product_slug: first.slug,
        name: first.name,
        quantity: 1,
        unit_amount_cents: first.default_unit_amount_cents,
      },
    ])
  }

  const updateLine = (idx: number, patch: Partial<LineItemDraft>) => {
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, ...patch } : li)))
  }

  const removeLine = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleProductChange = (idx: number, slug: string) => {
    const product = products.find((p) => p.slug === slug)
    if (!product) return
    updateLine(idx, {
      product_slug: product.slug,
      name: product.name,
      unit_amount_cents: product.default_unit_amount_cents,
    })
  }

  const resetForm = () => {
    setLineItems([])
    setMemo('')
    setStripeCustomerId('')
    setDueDays(30)
    setShowForm(false)
  }

  const handleSaveDraft = async () => {
    if (lineItems.length === 0) return
    setSubmitting(true)
    try {
      await api.admin.createOrgInvoice(orgId, {
        currency,
        line_items: lineItems,
        due_days: dueDays,
        memo: memo || undefined,
      })
      toast.success(t('form.draftCreated'))
      resetForm()
      await fetchInvoices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveAndSync = async () => {
    if (lineItems.length === 0) return
    if (!stripeCustomerId.trim()) {
      toast.error(t('syncStripeMissing'))
      return
    }
    setSubmitting(true)
    try {
      const created = await api.admin.createOrgInvoice(orgId, {
        currency,
        line_items: lineItems,
        due_days: dueDays,
        memo: memo || undefined,
      })
      await api.admin.syncOrgInvoiceToStripe(orgId, created.data.id, stripeCustomerId.trim())
      toast.success(t('form.syncedSuccess'))
      resetForm()
      await fetchInvoices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditDraft = (inv: InvoiceRow) => {
    // Load the draft's line items into the form. We don't have a PUT
    // endpoint, so editing means: load -> discard the original ->
    // save as a new draft. The user must click "Save draft" again to
    // persist the new version. The discard happens here, atomically
    // with the form open.
    setLineItems(
      inv.line_items.map((li) => ({
        product_slug: li.product_slug,
        name: li.name,
        quantity: li.quantity,
        unit_amount_cents: li.unit_amount_cents,
      })),
    )
    setCurrency(inv.currency)
    setDueDays(inv.due_days)
    setMemo(inv.memo ?? '')
    setShowForm(true)
    // Discard original after the form is populated.
    api.admin
      .deleteOrgInvoice(orgId, inv.id)
      .then(() => fetchInvoices())
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to discard original draft'),
      )
  }

  const handleDiscardDraft = async (id: string) => {
    if (!confirm('Discard this draft invoice? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await api.admin.deleteOrgInvoice(orgId, id)
      toast.success('Draft discarded')
      await fetchInvoices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to discard')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSyncDraft = async (id: string) => {
    const cid = prompt(t('form.stripeCustomerId'))
    if (!cid) return
    setSyncingId(id)
    try {
      await api.admin.syncOrgInvoiceToStripe(orgId, id, cid.trim())
      toast.success(t('form.syncedSuccess'))
      await fetchInvoices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          {t('title')}
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true)
              if (lineItems.length === 0) addLine()
            }}
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded transition-colors"
          >
            {t('newButton')}
          </button>
        )}
      </div>

      {/* New invoice form */}
      {showForm && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-orange-300">{t('form.title')}</h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              ×
            </button>
          </div>

          {/* Billing period clarifier */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-blue-200/90 space-y-1">
            <p className="font-semibold">How is this invoice billed?</p>
            <p className="text-blue-300/80">
              The invoice is sent ONCE for the totals shown. Each line item is independently
              tagged as monthly / yearly / one-time -- the badges next to the product name
              tell you which. Mixing periods on a single invoice is supported (e.g. one-time
              onboarding + monthly base on the first invoice). Stripe will create a
              subscription only for recurring lines when you sync.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">{t('form.currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm uppercase"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">{t('form.dueDays')}</label>
              <input
                type="number"
                value={dueDays}
                onChange={(e) => setDueDays(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-500">{t('form.lineItems')}</label>
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-orange-400 hover:text-orange-300"
              >
                {t('form.addLine')}
              </button>
            </div>
            <div className="space-y-3">
              {lineItems.map((li, idx) => {
                const product = products.find((p) => p.slug === li.product_slug)
                const periodBadge = product ? PERIOD_BADGE[product.billing_period] : null
                return (
                  <div key={idx} className="space-y-1 rounded-lg border border-zinc-800/50 p-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <select
                        value={li.product_slug}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="col-span-6 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.slug} value={p.slug} title={p.description}>
                            {p.name} ({p.billing_period})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={li.quantity}
                        onChange={(e) =>
                          updateLine(idx, { quantity: Number(e.target.value) })
                        }
                        placeholder={t('form.quantity')}
                        className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs tabular-nums"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={(li.unit_amount_cents / 100).toFixed(2)}
                        onChange={(e) =>
                          updateLine(idx, {
                            unit_amount_cents: Math.round(Number(e.target.value) * 100),
                          })
                        }
                        placeholder={t('form.unitPrice')}
                        className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="col-span-1 text-zinc-500 hover:text-red-400 text-sm"
                        title="Remove this line item"
                      >
                        {t('form.removeLine')}
                      </button>
                    </div>
                    {product && (
                      <div className="flex items-start gap-2 pl-1">
                        {periodBadge && (
                          <span
                            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap ${periodBadge.color}`}
                          >
                            {periodBadge.label}
                          </span>
                        )}
                        <p className="text-[11px] text-zinc-500 italic">{product.description}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {lineItems.length > 0 && (
              <div className="flex items-center justify-end text-xs text-zinc-300 pt-2 border-t border-zinc-800/50">
                <span className="text-zinc-500 mr-2">{t('form.subtotal')}:</span>
                <span className="font-semibold tabular-nums">
                  {formatCents(subtotal, currency)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('form.memo')}</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('form.stripeCustomerId')}</label>
            <input
              type="text"
              value={stripeCustomerId}
              onChange={(e) => setStripeCustomerId(e.target.value)}
              placeholder="cus_..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting || lineItems.length === 0}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {submitting ? '...' : t('form.saveDraft')}
            </button>
            <button
              type="button"
              onClick={handleSaveAndSync}
              disabled={submitting || lineItems.length === 0}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {submitting ? '...' : t('form.saveAndSync')}
            </button>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div className="rounded-2xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.created')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.memo')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2.5 px-4">
                {t('col.amount')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.status')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.stripe')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2.5 px-4">
                {t('col.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500">
                  {t('noInvoices')}
                </td>
              </tr>
            )}
            {!loading &&
              invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="py-2.5 px-4 text-zinc-400 text-xs">
                    {formatDate(inv.created_at)}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-zinc-300">{inv.memo ?? '—'}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    {formatCents(inv.total_amount_cents, inv.currency)}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        STATUS_COLORS[inv.status] || 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-zinc-400 font-mono">
                    {inv.stripe_invoice_id ?? '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {inv.status === 'draft' ? (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleEditDraft(inv)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                          title="Reopen this draft in the form. The original is discarded; save the new version to keep changes."
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSyncDraft(inv.id)}
                          disabled={syncingId === inv.id}
                          className="text-xs text-orange-400 hover:text-orange-300 disabled:opacity-50"
                        >
                          {syncingId === inv.id ? '...' : t('syncToStripe')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscardDraft(inv.id)}
                          disabled={deletingId === inv.id}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                          title="Permanently discard this draft"
                        >
                          {deletingId === inv.id ? '...' : 'Discard'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">{t('synced')}</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
