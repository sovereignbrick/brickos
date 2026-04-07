/**
 * BrickOS Platform Admin GUI - Design Tokens
 *
 * Website baseline aesthetic + SHI dashboard accent colors.
 * All admin components should import from here, not hardcode colors.
 *
 * Reference: docs/design/014-brickos-platform-gui.md Section 9
 */

export const colors = {
  // Base (website dark theme)
  background: '#09090b',      // zinc-950
  surface: '#18181b',          // zinc-900
  surfaceHover: '#27272a',     // zinc-800
  border: '#27272a',           // zinc-800
  borderLight: '#3f3f46',      // zinc-700

  // Text
  textPrimary: '#fafafa',      // zinc-50
  textSecondary: '#a1a1aa',    // zinc-400
  textMuted: '#71717a',        // zinc-500

  // Brand (BrickOS orange)
  brand: '#f97316',            // orange-500
  brandHover: '#ea580c',       // orange-600
  brandLight: '#fb923c',       // orange-400

  // Status (SHI dashboard accents)
  success: '#4ade80',          // green-400
  successBg: 'rgba(74, 222, 128, 0.1)',
  warning: '#fbbf24',          // amber-400
  warningBg: 'rgba(251, 191, 36, 0.1)',
  error: '#ef4444',            // red-400
  errorBg: 'rgba(239, 68, 68, 0.1)',
  info: '#60a5fa',             // blue-400
  infoBg: 'rgba(96, 165, 250, 0.1)',
} as const

export const layout = {
  sidebarWidth: 240,
  sidebarCollapsed: 64,
  borderRadius: '0.75rem',     // rounded-xl
  cardRadius: '1rem',          // rounded-2xl
  cardPadding: '1.25rem',      // p-5
  contentMaxWidth: '1280px',
} as const

export const fonts = {
  heading: 'var(--font-geist-sans)',
  body: 'var(--font-geist-sans)',
  mono: 'var(--font-geist-mono)',
} as const

/** Tailwind class helpers for consistent admin styling */
export const tw = {
  // Cards
  card: 'rounded-2xl border border-zinc-800 bg-zinc-900 p-5',
  cardHover: 'rounded-2xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors',

  // Stat cards (dashboard)
  statCard: 'rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center',
  statValue: 'text-2xl font-bold tabular-nums',
  statLabel: 'text-xs text-zinc-400 mb-1',

  // Status indicators
  statusDot: (status: 'healthy' | 'degraded' | 'down' | 'unknown') => {
    const map = { healthy: 'bg-green-400', degraded: 'bg-amber-400', down: 'bg-red-400', unknown: 'bg-zinc-500' }
    return `w-2.5 h-2.5 rounded-full ${map[status]}`
  },

  // Tables
  table: 'w-full text-sm',
  th: 'text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2 px-3',
  td: 'py-2.5 px-3 border-t border-zinc-800',

  // Sidebar
  sidebarSection: 'text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-3 pt-4 pb-1',
  sidebarItem: 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors',
  sidebarItemActive: 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-50 bg-zinc-800',

  // Buttons
  btnPrimary: 'bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors',
  btnSecondary: 'border border-zinc-700 hover:border-zinc-600 text-zinc-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors',
  btnDanger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors',

  // Badges
  badge: (variant: 'success' | 'warning' | 'error' | 'info' | 'neutral') => {
    const map = {
      success: 'bg-green-400/10 text-green-400',
      warning: 'bg-amber-400/10 text-amber-400',
      error: 'bg-red-400/10 text-red-400',
      info: 'bg-blue-400/10 text-blue-400',
      neutral: 'bg-zinc-700 text-zinc-300',
    }
    return `text-xs font-medium px-2 py-0.5 rounded-full ${map[variant]}`
  },

  // Uptime bar segment
  uptimeSegment: (status: 'healthy' | 'degraded' | 'down') => {
    const map = { healthy: 'bg-green-500', degraded: 'bg-amber-400', down: 'bg-red-500' }
    return `h-6 ${map[status]}`
  },
} as const
