'use client'

type Status = 'compliant' | 'partial' | 'non-compliant' | 'not-applicable'

interface Framework {
  name: string
  status: Status
  description: string
  lastAudit: string | null
  nextReview: string | null
  items: { label: string; status: Status; note?: string }[]
}

const STATUS_STYLE: Record<Status, { bg: string; text: string; label: string }> = {
  compliant: { bg: 'bg-green-400/10', text: 'text-green-400', label: 'Compliant' },
  partial: { bg: 'bg-amber-400/10', text: 'text-amber-400', label: 'Partial' },
  'non-compliant': { bg: 'bg-red-400/10', text: 'text-red-400', label: 'Non-Compliant' },
  'not-applicable': { bg: 'bg-zinc-700', text: 'text-zinc-400', label: 'N/A' },
}

const FRAMEWORKS: Framework[] = [
  {
    name: 'GDPR',
    status: 'compliant',
    description: 'EU General Data Protection Regulation',
    lastAudit: '2026-04-01',
    nextReview: '2026-07-01',
    items: [
      { label: 'Privacy policy', status: 'compliant' },
      { label: 'Cookie consent', status: 'compliant' },
      { label: 'Data processing agreements', status: 'compliant' },
      { label: 'Right to erasure (Art. 17)', status: 'compliant' },
      { label: 'Data portability (Art. 20)', status: 'compliant' },
      { label: 'DPO appointment', status: 'partial', note: 'Planned for Q3 2026' },
      { label: 'Sub-processor registry', status: 'partial', note: '#0317' },
      { label: 'International transfers', status: 'partial', note: '#0319' },
    ],
  },
  {
    name: 'EU AI Act',
    status: 'compliant',
    description: 'Artificial Intelligence Act - Limited Risk (Art. 50)',
    lastAudit: '2026-04-07',
    nextReview: '2026-06-01',
    items: [
      { label: 'Risk classification', status: 'compliant', note: 'Limited Risk' },
      { label: 'Transparency notice', status: 'compliant', note: '/health endpoint' },
      { label: 'Human oversight', status: 'compliant', note: 'Not medical device disclaimer' },
      { label: 'Data scope documentation', status: 'compliant' },
    ],
  },
  {
    name: 'NIS2',
    status: 'partial',
    description: 'Network and Information Security Directive',
    lastAudit: null,
    nextReview: '2026-06-01',
    items: [
      { label: 'Risk management framework', status: 'partial', note: '#0320' },
      { label: 'Incident reporting channel', status: 'partial', note: '#0325' },
      { label: 'Business continuity plan', status: 'partial', note: '#0321' },
      { label: 'Supply chain policy', status: 'partial', note: '#0326' },
    ],
  },
  {
    name: 'CRA',
    status: 'partial',
    description: 'Cyber Resilience Act',
    lastAudit: null,
    nextReview: '2026-09-01',
    items: [
      { label: 'SBOM (CycloneDX)', status: 'compliant', note: 'Generated in CI' },
      { label: 'Self-hosted update mechanism', status: 'partial', note: '#0323' },
      { label: 'Vulnerability handling', status: 'compliant', note: 'Dependabot + cargo audit' },
      { label: 'Build provenance', status: 'partial', note: '#0283' },
    ],
  },
  {
    name: 'ePrivacy',
    status: 'compliant',
    description: 'ePrivacy Directive (Cookie Law)',
    lastAudit: '2026-04-01',
    nextReview: '2026-07-01',
    items: [
      { label: 'Cookie audit', status: 'compliant' },
      { label: 'Consent mechanism', status: 'compliant' },
      { label: 'Analytics privacy', status: 'compliant', note: 'No third-party analytics' },
    ],
  },
]

export default function CompliancePage() {
  const overallCompliant = FRAMEWORKS.filter(f => f.status === 'compliant').length
  const overallPartial = FRAMEWORKS.filter(f => f.status === 'partial').length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compliance Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {FRAMEWORKS.map(f => {
          const s = STATUS_STYLE[f.status]
          return (
            <div key={f.name} className="rounded-xl border border-zinc-800 p-4 text-center">
              <p className="text-xs text-zinc-400 mb-1">{f.name}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        {FRAMEWORKS.map(f => (
          <div key={f.name} className="rounded-2xl border border-zinc-800 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold">{f.name}</h2>
                <p className="text-xs text-zinc-400">{f.description}</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[f.status].bg} ${STATUS_STYLE[f.status].text}`}>
                {STATUS_STYLE[f.status].label}
              </span>
            </div>
            {(f.lastAudit || f.nextReview) && (
              <div className="flex gap-4 mb-3 text-xs text-zinc-500">
                {f.lastAudit && <span>Last audit: {f.lastAudit}</span>}
                {f.nextReview && <span>Next review: {f.nextReview}</span>}
              </div>
            )}
            <div className="space-y-1.5">
              {f.items.map(item => {
                const is = STATUS_STYLE[item.status]
                return (
                  <div key={item.label} className="flex items-center justify-between text-sm py-1">
                    <span className="text-zinc-300">{item.label}</span>
                    <div className="flex items-center gap-2">
                      {item.note && <span className="text-[10px] text-zinc-500">{item.note}</span>}
                      <span className={`w-2 h-2 rounded-full ${item.status === 'compliant' ? 'bg-green-400' : item.status === 'partial' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
