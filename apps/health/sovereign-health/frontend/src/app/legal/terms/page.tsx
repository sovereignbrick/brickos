import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
      </div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">⚡ Sovereign Health Intelligence</h1>
      </div>
      <h2 className="text-xl font-bold mb-2">Terms of Service</h2>
      <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>
      <div className="rounded-2xl border p-8 text-center">
        <p className="text-muted-foreground">
          Full Terms of Service coming soon. By registering, you agree to use this service
          responsibly and acknowledge that health data is for informational purposes only
          and does not constitute medical advice.
        </p>
      </div>
    </main>
  )
}
