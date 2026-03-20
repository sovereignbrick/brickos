'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'

import type { InfluenceFactor, CreateInfluenceFactorInput } from '@/lib/types'
import { useTranslations } from 'next-intl'

const FREQUENCY_KEYS: { value: string; labelKey: string }[] = [
  { value: '1x daily', labelKey: 'frequencies.onceDaily' },
  { value: '2x daily', labelKey: 'frequencies.twiceDaily' },
  { value: '3x daily', labelKey: 'frequencies.thriceDaily' },
  { value: 'weekly', labelKey: 'frequencies.weekly' },
  { value: 'as needed', labelKey: 'frequencies.asNeeded' },
  { value: 'custom', labelKey: 'frequencies.custom' },
]

const FORM_KEYS = [
  'tablet', 'capsule', 'liquid', 'powder', 'injection', 'patch', 'cream', 'inhaler', 'drops', 'other',
]

const UNIT_KEYS = ['mg', 'g', 'mcg', 'ml', 'iu', 'pct', 'mmol', 'noUnit']

function SourceBadge({ source }: { source: string }) {
  const tMeds = useTranslations('medications')
  const colorMap: Record<string, string> = {
    manual: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300',
    ai_import: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400',
    photo: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400',
  }
  const labelMap: Record<string, string> = {
    manual: 'source.manual',
    ai_import: 'source.aiImport',
    photo: 'source.photo',
  }
  const color = colorMap[source] || colorMap.manual
  const label = tMeds(labelMap[source] as 'source.manual' || 'source.manual')
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${color}`}>
      {label}
    </span>
  )
}

function TypeBadge({ factorType }: { factorType: string }) {
  const tMeds = useTranslations('medications')
  if (factorType === 'supplement') {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400">
        {'\uD83C\uDF3F'} {tMeds('typeSupplement')}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400">
      {'\uD83D\uDC8A'} {tMeds('typeMedication')}
    </span>
  )
}

interface IngredientRow {
  name: string
  amount: string
  role: 'active' | 'auxiliary'
  notes: string
}

const emptyForm: CreateInfluenceFactorInput = { name: '', factor_type: 'medication' }

// ── Ingredient Tree Display ──

function IngredientsTree({ ingredients }: { ingredients: InfluenceFactor['ingredients'] }) {
  const tMeds = useTranslations('medications')

  if (!ingredients || ingredients.length === 0) return null

  const sorted = [...ingredients].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="mt-2 ml-1">
      {sorted.map((ing, idx) => {
        const isLast = idx === sorted.length - 1
        const prefix = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '
        const roleLabel = ing.role === 'active'
          ? tMeds('roleActive')
          : tMeds('roleAuxiliary')
        const roleColor = ing.role === 'active'
          ? 'text-blue-400'
          : 'text-zinc-500'

        return (
          <div key={ing.id} className="flex items-baseline gap-1 text-xs font-mono text-muted-foreground">
            <span className="text-zinc-600 select-none">{prefix}</span>
            <span className="text-foreground">{ing.name}</span>
            {ing.amount && <span className="text-muted-foreground">{ing.amount}</span>}
            <span className={`text-[10px] ${roleColor}`}>({roleLabel})</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Card ──

function InfluenceFactorCard({
  factor,
  onEdit,
  onArchive,
  onRestore,
}: {
  factor: InfluenceFactor
  onEdit: () => void
  onArchive: () => void
  onRestore?: () => void
}) {
  const tMeds = useTranslations('medications')
  const tCommon = useTranslations('common')
  const [confirmArchive, setConfirmArchive] = useState(false)

  return (
    <div className={`border rounded-lg p-4 ${
      factor.factor_type === 'supplement'
        ? 'border-emerald-300 dark:border-emerald-800/60'
        : 'border-purple-300 dark:border-purple-800/60'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{factor.name}</h3>
            <TypeBadge factorType={factor.factor_type} />
            <SourceBadge source={factor.source} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mt-2 text-xs">
            {factor.brand && <div><span className="text-muted-foreground/70">{tMeds('brandField')}</span> <span className="text-muted-foreground">{factor.brand}</span></div>}
            {factor.dosage && <div><span className="text-muted-foreground/70">{tMeds('dosageField')}</span> <span className="text-muted-foreground">{factor.dosage}</span></div>}
            {factor.frequency && <div><span className="text-muted-foreground/70">{tMeds('freqField')}</span> <span className="text-muted-foreground">{factor.frequency}</span></div>}
            {factor.form && <div><span className="text-muted-foreground/70">{tMeds('formField')}</span> <span className="capitalize text-muted-foreground">{factor.form}</span></div>}
            {factor.start_date && (
              <div><span className="text-muted-foreground/70">{tMeds('sinceField')}</span> <span className="text-muted-foreground">{new Date(factor.start_date).toLocaleDateString()}</span></div>
            )}
            {factor.factor_type === 'medication' && factor.prescriber && (
              <div><span className="text-muted-foreground/70">{tMeds('prescriberField')}</span> <span className="text-muted-foreground">{factor.prescriber}</span></div>
            )}
          </div>

          {factor.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">{factor.notes}</p>
          )}

          <IngredientsTree ingredients={factor.ingredients} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {factor.is_active ? (
            <>
              <button
                onClick={onEdit}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {tCommon('edit')}
              </button>
              {!confirmArchive ? (
                <button
                  onClick={() => setConfirmArchive(true)}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                >
                  {tMeds('archive')}
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { onArchive(); setConfirmArchive(false) }}
                    className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                  >
                    {tCommon('confirm')}
                  </button>
                  <button
                    onClick={() => setConfirmArchive(false)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {tCommon('cancel')}
                  </button>
                </div>
              )}
            </>
          ) : (
            onRestore && (
              <button
                onClick={onRestore}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {tMeds('restore')}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function FieldTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex ml-1">
      <button
        type="button"
        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
      </button>
      {show && (
        <span className="absolute bottom-full left-0 mb-1 px-2.5 py-1.5 rounded bg-card border border-border text-[11px] leading-snug text-foreground z-50 w-[280px] shadow-lg" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ── Form ──

function InfluenceFactorForm({
  initial,
  initialIngredients,
  onSubmit,
  onCancel,
  saving,
}: {
  initial: CreateInfluenceFactorInput
  initialIngredients?: IngredientRow[]
  onSubmit: (data: CreateInfluenceFactorInput) => void
  onCancel: () => void
  saving: boolean
}) {
  const tMeds = useTranslations('medications')
  const tCommon = useTranslations('common')
  const [form, setForm] = useState<CreateInfluenceFactorInput>(initial)
  const [ingredients, setIngredients] = useState<IngredientRow[]>(initialIngredients || [])
  const isEdit = initial.name !== ''

  const set = (field: keyof CreateInfluenceFactorInput, value: string) => {
    setForm(prev => ({ ...prev, [field]: value || undefined }))
  }

  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: '', amount: '', role: 'active', notes: '' }])
  }

  const removeIngredient = (idx: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  const updateIngredient = (idx: number, field: keyof IngredientRow, value: string) => {
    setIngredients(prev => prev.map((row, i) =>
      i === idx ? { ...row, [field]: value } : row
    ))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error(tMeds('nameRequired'))
      return
    }

    const validIngredients = ingredients
      .filter(ing => ing.name.trim() !== '')
      .map((ing, idx) => ({
        name: ing.name.trim(),
        amount: ing.amount.trim() || undefined,
        role: ing.role,
        sort_order: idx,
      }))

    onSubmit({
      ...form,
      name: form.name.trim(),
      ingredients: validIngredients.length > 0 ? validIngredients : undefined,
    })
  }

  const isSup = form.factor_type === 'supplement'
  const fieldBorder = isSup ? 'border-emerald-800 focus:border-emerald-500' : 'border-purple-800 focus:border-purple-500'
  const fieldClass = `w-full bg-white dark:bg-zinc-900 border rounded-lg px-3 py-2 text-sm focus:outline-none ${fieldBorder}`

  return (
    <form onSubmit={handleSubmit} className={`rounded-lg p-4 bg-muted/50 space-y-4 border ${isSup ? 'border-emerald-300 dark:border-emerald-800/50' : 'border-purple-300 dark:border-purple-800/50'}`}>
      <h3 className="text-sm font-semibold">
        {isEdit ? tMeds('editTitle') : tMeds('addTitle')}
      </h3>

      {/* Type selector */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">{tMeds('typeLabel')}</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, factor_type: 'medication' }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
              form.factor_type === 'medication'
                ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'border-border bg-white dark:bg-zinc-900 text-muted-foreground hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            {'\uD83D\uDC8A'} {tMeds('typeMedication')}
          </button>
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, factor_type: 'supplement' }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
              form.factor_type === 'supplement'
                ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'border-border bg-white dark:bg-zinc-900 text-muted-foreground hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            {'\uD83C\uDF3F'} {tMeds('typeSupplement')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Product Name */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            {tMeds('productName')} <span className="text-red-400">*</span>
            <FieldTooltip text={tMeds('tooltips.productName')} />
          </label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            className={fieldClass} placeholder={isSup ? tMeds('placeholders.nameSup') : tMeds('placeholders.nameMed')} required />
        </div>

        {/* Brand */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            {tMeds('brandLabel')} <FieldTooltip text={tMeds('tooltips.brand')} />
          </label>
          <input type="text" value={form.brand || ''} onChange={e => set('brand', e.target.value)}
            className={fieldClass} placeholder={isSup ? tMeds('placeholders.brandSup') : tMeds('placeholders.brandMed')} />
        </div>

        {/* Dosage */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            {tMeds('dosageLabel')} <FieldTooltip text={tMeds('tooltips.dosage')} />
          </label>
          <input type="text" value={form.dosage || ''} onChange={e => set('dosage', e.target.value)}
            className={fieldClass} placeholder={isSup ? tMeds('placeholders.dosageSup') : tMeds('placeholders.dosageMed')} />
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            {tMeds('frequencyLabel')} <FieldTooltip text={tMeds('tooltips.frequency')} />
          </label>
          <select value={form.frequency || ''} onChange={e => set('frequency', e.target.value)} className={fieldClass}>
            <option value="">{tMeds('selectFrequency')}</option>
            {FREQUENCY_KEYS.map(f => (
              <option key={f.value} value={f.value}>{tMeds(f.labelKey as 'frequencies.onceDaily')}</option>
            ))}
          </select>
        </div>

        {/* Form */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            {tMeds('formLabel')} <FieldTooltip text={tMeds('tooltips.form')} />
          </label>
          <select value={form.form || ''} onChange={e => set('form', e.target.value)} className={fieldClass}>
            <option value="">{tMeds('selectForm')}</option>
            {FORM_KEYS.map(f => (
              <option key={f} value={f}>{f === 'other' ? tCommon('other') : tMeds(`forms.${f}` as 'forms.tablet')}</option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            {tMeds('startDateLabel')} <FieldTooltip text={tMeds('tooltips.startDate')} />
          </label>
          <input type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} className={`${fieldClass} [color-scheme:light] dark:[color-scheme:dark]`} />
        </div>

        {/* Prescriber - only for medications */}
        {!isSup && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {tMeds('prescriberLabel')} <FieldTooltip text={tMeds('tooltips.prescriber')} />
            </label>
            <input type="text" value={form.prescriber || ''} onChange={e => set('prescriber', e.target.value)}
              className={fieldClass} placeholder={tMeds('placeholders.prescriber')} />
          </div>
        )}

        {/* Reason - only for medications */}
        {!isSup && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {tMeds('reasonLabel')} <FieldTooltip text={tMeds('tooltips.reason')} />
            </label>
            <input type="text" value={form.reason || ''} onChange={e => set('reason', e.target.value)}
              className={fieldClass} placeholder={tMeds('placeholders.reason')} />
          </div>
        )}
      </div>

      {/* Notes - full width */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          {tCommon('notesLabel')} <FieldTooltip text={tMeds('tooltips.notes')} />
        </label>
        <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
          className={`${fieldClass} min-h-[60px]`} rows={2} placeholder={tMeds('notesPlaceholder')} />
      </div>

      {/* Ingredients section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            {tMeds('ingredientsTitle')}
          </label>
          <button
            type="button"
            onClick={addIngredient}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            + {tMeds('addIngredient')}
          </button>
        </div>

        {ingredients.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">{tMeds('noIngredients')}</p>
        ) : (
          <div className="space-y-2">
            {/* Column headers */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="flex-1">{tMeds('ingredientName')} <FieldTooltip text={tMeds('tooltips.ingredientName')} /></span>
              <span className="w-20">{tMeds('ingredientAmount')} <FieldTooltip text={tMeds('tooltips.ingredientAmount')} /></span>
              <span className="w-20">{tMeds('ingredientUnit')} <FieldTooltip text={tMeds('tooltips.ingredientUnit')} /></span>
              <span className="w-36">{tMeds('ingredientRole')} <FieldTooltip text={tMeds('tooltips.ingredientRole')} /></span>
              <span className="w-8"></span>
            </div>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={ing.name}
                  onChange={e => updateIngredient(idx, 'name', e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-border rounded-lg px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder={tMeds('placeholders.ingredientName')}
                />
                <input
                  type="text"
                  value={(ing.amount || '').replace(/\s*(mg|g|µg|mcg|ml|IU|IE|%|mmol)$/i, '')}
                  onChange={e => {
                    const unit = (ing.amount || '').match(/\s*(mg|g|µg|mcg|ml|IU|IE|%|mmol)$/i)?.[1] || ''
                    updateIngredient(idx, 'amount', unit ? `${e.target.value} ${unit}` : e.target.value)
                  }}
                  className="w-20 bg-white dark:bg-zinc-900 border border-border rounded-lg px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder={tMeds('placeholders.ingredientAmount')}
                />
                <select
                  value={(ing.amount || '').match(/\s*(mg|g|µg|mcg|ml|IU|IE|%|mmol)$/i)?.[1]?.toLowerCase().replace('µg', 'mcg').replace('ie', 'iu') || 'mg'}
                  onChange={e => {
                    const numPart = (ing.amount || '').replace(/\s*(mg|g|µg|mcg|ml|IU|IE|%|mmol)$/i, '').trim()
                    const unitLabel = e.target.value === 'noUnit' ? '' : tMeds(`units.${e.target.value}` as 'units.mg')
                    updateIngredient(idx, 'amount', unitLabel ? `${numPart} ${unitLabel}`.trim() : numPart)
                  }}
                  className="w-20 bg-white dark:bg-zinc-900 border border-border rounded-lg px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                >
                  {UNIT_KEYS.map(u => (
                    <option key={u} value={u}>{tMeds(`units.${u}` as 'units.mg')}</option>
                  ))}
                </select>
                <select
                  value={ing.role}
                  onChange={e => updateIngredient(idx, 'role', e.target.value)}
                  className="w-36 bg-white dark:bg-zinc-900 border border-border rounded-lg px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                >
                  <option value="active">{tMeds('roleActive')}</option>
                  <option value="auxiliary">{tMeds('roleAuxiliary')}</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  className="text-zinc-500 hover:text-red-400 transition-colors shrink-0 p-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={ing.notes || ''}
                onChange={e => updateIngredient(idx, 'notes', e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-border rounded-lg px-3 py-1 text-[11px] text-zinc-400 italic focus:border-zinc-500 focus:outline-none ml-6"
                placeholder={tMeds('ingredientNotes')}
              />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className={`disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors ${
            isSup ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-purple-600 hover:bg-purple-500'
          }`}
        >
          {saving ? tCommon('saving') : isEdit ? (isSup ? tMeds('saveSup') : tMeds('saveMed')) : (isSup ? tMeds('addSup') : tMeds('addMed'))}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tCommon('cancel')}
        </button>
      </div>
    </form>
  )
}

// ── Section (grouped by type) ──

function InfluenceFactorSection({
  title,
  icon,
  items,
  editingId,
  saving,
  onEdit,
  onArchive,
  onUpdate,
  onCancelEdit,
  getFormInitial,
  getIngredientRows,
}: {
  title: string
  icon: string
  items: InfluenceFactor[]
  editingId: string | null
  saving: boolean
  onEdit: (id: string) => void
  onArchive: (id: string) => void
  onUpdate: (id: string, data: CreateInfluenceFactorInput) => void
  onCancelEdit: () => void
  getFormInitial: (f: InfluenceFactor) => CreateInfluenceFactorInput
  getIngredientRows: (f: InfluenceFactor) => IngredientRow[]
}) {
  const tMeds = useTranslations('medications')

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        {icon} {title} ({items.length})
      </h3>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground/60 italic py-4 text-center border border-dashed border-border rounded-lg">
          {tMeds('noItemsInCategory')}
        </p>
      )}
      {items.map(factor =>
        editingId === factor.id ? (
          <InfluenceFactorForm
            key={factor.id}
            initial={getFormInitial(factor)}
            initialIngredients={getIngredientRows(factor)}
            onSubmit={data => onUpdate(factor.id, data)}
            onCancel={onCancelEdit}
            saving={saving}
          />
        ) : (
          <InfluenceFactorCard
            key={factor.id}
            factor={factor}
            onEdit={() => onEdit(factor.id)}
            onArchive={() => onArchive(factor.id)}
          />
        )
      )}
    </div>
  )
}

// ── Main Tab ──

export function MedicationsTab() {
  const tMeds = useTranslations('medications')
  const tCommon = useTranslations('common')
  const [factors, setFactors] = useState<InfluenceFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [saving, setSaving] = useState(false)

  const [sortBy, setSortBy] = useState<'date' | 'name'>('date')

  const sortFn = (a: InfluenceFactor, b: InfluenceFactor) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }

  const activeFactors = factors.filter(f => f.is_active)
  const archivedFactors = factors.filter(f => !f.is_active)

  const activeMedications = activeFactors.filter(f => f.factor_type === 'medication').sort(sortFn)
  const activeSupplements = activeFactors.filter(f => f.factor_type === 'supplement').sort(sortFn)

  const fetchFactors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.influenceFactors.list()
      setFactors(res.data)
    } catch {
      toast.error(tMeds('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [tMeds])

  useEffect(() => {
    fetchFactors()
  }, [fetchFactors])

  const handleCreate = async (data: CreateInfluenceFactorInput) => {
    setSaving(true)
    try {
      await api.influenceFactors.create({ ...data, source: 'manual' })
      toast.success(tMeds('added'))
      setShowForm(false)
      fetchFactors()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tMeds('addFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string, data: CreateInfluenceFactorInput) => {
    setSaving(true)
    try {
      await api.influenceFactors.update(id, data)
      toast.success(tMeds('updated'))
      setEditingId(null)
      fetchFactors()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tMeds('updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (id: string) => {
    try {
      await api.influenceFactors.archive(id)
      toast.success(tMeds('archived'))
      fetchFactors()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tMeds('archiveFailed'))
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await api.influenceFactors.restore(id)
      toast.success(tMeds('restored'))
      fetchFactors()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tMeds('restoreFailed'))
    }
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
    setShowForm(false)
  }

  const getFormInitial = (f: InfluenceFactor): CreateInfluenceFactorInput => ({
    name: f.name,
    factor_type: f.factor_type,
    brand: f.brand || undefined,
    dosage: f.dosage || undefined,
    frequency: f.frequency || undefined,
    form: f.form || undefined,
    prescriber: f.prescriber || undefined,
    start_date: f.start_date || undefined,
    reason: f.reason || undefined,
    notes: f.notes || undefined,
  })

  const getIngredientRows = (f: InfluenceFactor): IngredientRow[] => {
    if (!f.ingredients || f.ingredients.length === 0) return []
    return [...f.ingredients]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(ing => ({
        name: ing.name,
        amount: ing.amount || '',
        role: (ing.role || 'active') as 'active' | 'auxiliary',
        notes: ing.notes || '',
      }))
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">{tCommon('loading')}</p>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{tMeds('title')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {tMeds('subtitle')}
          </p>
        </div>
        {!showForm && !editingId && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + {tMeds('addButton')}
          </button>
        )}
      </div>

      {/* Explanation: medications vs supplements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium flex items-center gap-1.5"><span>💊</span> {tMeds('typeMedication')}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{tMeds('explanationMedication')}</p>
        </div>
        <div className="border border-border rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium flex items-center gap-1.5"><span>🌿</span> {tMeds('typeSupplement')}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{tMeds('explanationSupplement')}</p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <InfluenceFactorForm
          initial={emptyForm}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Active items grouped by type */}
      {activeFactors.length === 0 && !showForm ? (
        <div className="border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground text-sm">{tMeds('noActive')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {tMeds('noActiveHint')}
          </p>
        </div>
      ) : (
        <>
          {/* Sort controls */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{tMeds('sortBy')}:</span>
            <button
              onClick={() => setSortBy('date')}
              className={`px-2 py-1 rounded transition-colors ${sortBy === 'date' ? 'bg-blue-600/20 text-blue-400 font-medium' : 'hover:text-foreground'}`}
            >
              {tMeds('sortDate')}
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 py-1 rounded transition-colors ${sortBy === 'name' ? 'bg-blue-600/20 text-blue-400 font-medium' : 'hover:text-foreground'}`}
            >
              {tMeds('sortName')}
            </button>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfluenceFactorSection
              title={tMeds('sectionMedications')}
              icon={'\uD83D\uDC8A'}
              items={activeMedications}
              editingId={editingId}
              saving={saving}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onUpdate={handleUpdate}
              onCancelEdit={() => setEditingId(null)}
              getFormInitial={getFormInitial}
              getIngredientRows={getIngredientRows}
            />

            <InfluenceFactorSection
              title={tMeds('sectionSupplements')}
              icon={'\uD83C\uDF3F'}
              items={activeSupplements}
              editingId={editingId}
              saving={saving}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onUpdate={handleUpdate}
              onCancelEdit={() => setEditingId(null)}
              getFormInitial={getFormInitial}
              getIngredientRows={getIngredientRows}
            />
          </div>
        </>
      )}

      {/* Archived section */}
      {archivedFactors.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-xs">{showArchived ? '\u25B2' : '\u25BC'}</span>
            {tMeds('archivedCount', { count: archivedFactors.length })}
          </button>

          {showArchived && (
            <div className="space-y-3 mt-3">
              {archivedFactors.map(factor => (
                <InfluenceFactorCard
                  key={factor.id}
                  factor={factor}
                  onEdit={() => {}}
                  onArchive={() => {}}
                  onRestore={() => handleRestore(factor.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
