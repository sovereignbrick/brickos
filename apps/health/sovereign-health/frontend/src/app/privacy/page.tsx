'use client'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 inline-flex items-center gap-1"
        >
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground">
          Privacy Policy coming soon. Your data is encrypted at rest and never shared.
        </p>
      </main>
      <Footer />
    </div>
  )
}
