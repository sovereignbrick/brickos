'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'
import { usePlatformFilter } from '@/app/platform/platform-context'

interface LinkItem {
  id: string
  code: string
  target_url: string
  link_type: string
  domain: string
  app_key: string
  affiliate_code: string | null
  title: string | null
  is_active: boolean
  total_clicks: number
  clicks_7d: number
  clicks_30d: number
  created_at: string
}

interface SummaryItem {
  prefix: string
  link_type: string
  link_count: number
  total_clicks: number
}

type SubTab = 'links' | 'campaign'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

const TYPE_COLORS: Record<string, string> = {
  affiliate: 'bg-blue-500/20 text-blue-300',
  vanity: 'bg-purple-500/20 text-purple-300',
  campaign: 'bg-green-500/20 text-green-300',
  generic: 'bg-zinc-500/20 text-zinc-300',
}

export function LinksTab() {
  const t = useTranslations('admin')
  const { appFilter, orgFilter } = usePlatformFilter()
  const [subTab, setSubTab] = useState<SubTab>('links')
  const [links, setLinks] = useState<LinkItem[]>([])
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  // Campaign form
  const [campaignCode, setCampaignCode] = useState('')
  const [campaignUrl, setCampaignUrl] = useState('')
  const [campaignTitle, setCampaignTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const loadLinks = useCallback(async () => {
    try {
      const res = await api.admin.links(appFilter, orgFilter)
      setLinks(res.data.links)
      setSummary(res.data.summary)
    } catch {
      toast.error('Failed to load links')
    } finally {
      setLoading(false)
    }
  }, [appFilter, orgFilter])

  useEffect(() => { loadLinks() }, [loadLinks])

  const handleCreateCampaign = async () => {
    if (!campaignCode.trim() || !campaignUrl.trim()) return
    setCreating(true)
    try {
      await api.admin.createCampaignLink({
        code: campaignCode.trim().toLowerCase(),
        target_url: campaignUrl.trim(),
        title: campaignTitle.trim() || undefined,
      })
      toast.success('Campaign link created')
      setCampaignCode('')
      setCampaignUrl('')
      setCampaignTitle('')
      await loadLinks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create campaign link')
    } finally {
      setCreating(false)
    }
  }

  const filteredLinks = filter === 'all' ? links : links.filter(l => l.link_type === filter)

  const totalClicks = links.reduce((sum, l) => sum + l.total_clicks, 0)
  const totalLinks = links.length

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{totalLinks}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Links</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Clicks</p>
        </div>
        {summary.slice(0, 2).map(s => (
          <div key={`${s.prefix}-${s.link_type}`} className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{s.total_clicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.prefix} / {s.link_type}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(['links', 'campaign'] as SubTab[]).map(st => (
          <button
            key={st}
            onClick={() => setSubTab(st)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              subTab === st ? 'bg-blue-600/10 text-blue-400 font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {st === 'links' ? 'All Links' : 'Create Campaign'}
          </button>
        ))}
      </div>

      {subTab === 'links' && (
        <div className="space-y-3">
          {/* Filter bar */}
          <div className="flex gap-2">
            {['all', 'affiliate', 'vanity', 'campaign'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filter === f ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? `All (${links.length})` : `${f} (${links.filter(l => l.link_type === f).length})`}
              </button>
            ))}
          </div>

          {/* Links table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">Code</th>
                    <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">Type</th>
                    <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">Clicks (7d)</th>
                    <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">Clicks (30d)</th>
                    <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">Total</th>
                    <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">Target</th>
                    <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link, i) => (
                    <tr key={link.id} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-accent/30'}`}>
                      <td className="px-3 py-2.5 text-xs font-mono">
                        {link.code}
                        {link.title && <span className="ml-1.5 text-muted-foreground">({link.title})</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[link.link_type] || TYPE_COLORS.generic}`}>
                          {link.link_type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-mono">{link.clicks_7d}</td>
                      <td className="px-3 py-2.5 text-xs text-right font-mono">{link.clicks_30d}</td>
                      <td className="px-3 py-2.5 text-xs text-right font-mono font-bold">{link.total_clicks}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">{link.target_url}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(link.created_at)}</td>
                    </tr>
                  ))}
                  {filteredLinks.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">No links found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'campaign' && (
        <div className="rounded-xl border border-border p-4 space-y-4 max-w-lg">
          <h3 className="text-sm font-medium">Create Campaign Link</h3>
          <div>
            <label className="text-sm font-medium block mb-1">Code</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">brickos.io/r/</span>
              <input
                type="text"
                value={campaignCode}
                onChange={e => setCampaignCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="btc-prague-2026"
                className="flex-1 bg-accent border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Target URL</label>
            <input
              type="url"
              value={campaignUrl}
              onChange={e => setCampaignUrl(e.target.value)}
              placeholder="https://sovereignhealth.io/pricing?utm_campaign=..."
              className="w-full bg-accent border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Label (optional)</label>
            <input
              type="text"
              value={campaignTitle}
              onChange={e => setCampaignTitle(e.target.value)}
              placeholder="BTC Prague 2026"
              className="w-full bg-accent border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCreateCampaign}
            disabled={creating || !campaignCode.trim() || !campaignUrl.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {creating ? 'Creating...' : 'Create Campaign Link'}
          </button>
        </div>
      )}
    </div>
  )
}
