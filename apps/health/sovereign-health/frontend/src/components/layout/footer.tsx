'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { APP_NAME } from '@/lib/mode'
import { APP_CONFIG } from '@/lib/config'
import { useTranslations } from 'next-intl'

function useApiVersion() {
  const [version, setVersion] = useState<string | null>(null)
  useEffect(() => {
    // Sprint 046 hotfix 2026-04-20: backend health is at /health (root),
    // not /api/health. APP_CONFIG.apiUrl was `/api` on staging builds,
    // so `${apiUrl}/health` produced a 404. Hit the root path same-origin
    // -- works on *.brickos.io + *.sovereignhealth.io wildcards via the
    // nginx backend regex.
    fetch('/health')
      .then(r => r.json())
      .then(d => { if (d.version) setVersion(d.version) })
      .catch(() => {})
  }, [])
  return version ? `v${version}` : null
}

export function Footer() {
  const year = new Date().getFullYear()
  const t = useTranslations('footer')
  const version = useApiVersion()

  return (
    <footer className="border-t border-muted/20 py-6 px-4">
      <div className="max-w-5xl mx-auto text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          &copy; {year} {APP_NAME}. {t('copyright')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <a href="https://sovereignhealth.io/terms/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            {t('terms')}
          </a>
          <span className="hidden sm:inline">&middot;</span>
          <a href="https://sovereignhealth.io/privacy/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            {t('privacy')}
          </a>
          <span className="hidden sm:inline">&middot;</span>
          {version && <span>{version}</span>}
          <span className="hidden sm:inline">&middot;</span>
          <Link href="/donate" className="text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-1">
            &#8383; {t('donate')}
          </Link>
          <span className="hidden sm:inline">&middot;</span>
          <a
            href={APP_CONFIG.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            GitHub
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
