'use client'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground">Terms of Service coming soon.</p>
      </main>
      <Footer />
    </div>
  )
}
