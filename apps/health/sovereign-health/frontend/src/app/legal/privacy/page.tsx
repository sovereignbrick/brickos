import Link from 'next/link'

export default function PrivacyPage() {
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
      <h2 className="text-xl font-bold mb-2">Privacy Policy</h2>
      <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>
      <div className="rounded-2xl border p-8 text-center">
        <p className="text-muted-foreground">
          Full Privacy Policy coming soon. Your health data is stored securely and never
          shared with third parties. Admin staff cannot view your measurement values.
          You can request data deletion at any time.
        </p>
      </div>
    </main>
  )
}
