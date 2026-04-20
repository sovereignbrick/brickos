'use client'

/**
 * Org-level affiliate management.
 * Links to the existing /affiliate page for individual user affiliate features,
 * but scoped to the org context.
 */

import Link from 'next/link'
import { useOrg } from '@/lib/org-context'

export default function OrgAffiliatePage() {
  const org = useOrg()

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Affiliate Program</h2>

      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium">Organization Referral Link</h3>
        <p className="text-sm text-muted-foreground">
          Share your organization's referral link to earn commissions on new signups.
        </p>
        {org.isOrg && (
          <div className="bg-muted/30 rounded px-3 py-2">
            <code className="text-sm">https://{org.orgSlug}.brickos.io/register?ref=org</code>
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium">Your Affiliate Dashboard</h3>
        <p className="text-sm text-muted-foreground">
          View your personal affiliate stats, conversions, and payout settings.
        </p>
        <Link
          href="/affiliate"
          className="inline-block brand-primary-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          Open Affiliate Dashboard
        </Link>
      </div>
    </div>
  )
}
