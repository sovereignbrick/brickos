'use client'

import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.sovereignhealth.io'

function Logo() {
  return (
    <iframe
      src="/assets/blockos-logo-v2.html"
      className="w-full max-w-[500px] aspect-[744/624] border-0 pointer-events-none"
      title="BrickOS Logo Animation"
      loading="eager"
    />
  )
}

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subject: 'general' }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
      setForm({ name: '', email: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center py-12">
        <p className="text-hi text-lg font-serif">Message sent.</p>
        <p className="text-dim mt-2">We will get back to you.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      <input
        type="text"
        placeholder="Name"
        required
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        className="w-full bg-surface border border-border rounded px-4 py-3 text-hi placeholder:text-dim focus:outline-none focus:border-border-hi transition-colors"
      />
      <input
        type="email"
        placeholder="Email"
        required
        value={form.email}
        onChange={e => setForm({ ...form, email: e.target.value })}
        className="w-full bg-surface border border-border rounded px-4 py-3 text-hi placeholder:text-dim focus:outline-none focus:border-border-hi transition-colors"
      />
      <textarea
        placeholder="Message"
        required
        rows={4}
        value={form.message}
        onChange={e => setForm({ ...form, message: e.target.value })}
        className="w-full bg-surface border border-border rounded px-4 py-3 text-hi placeholder:text-dim focus:outline-none focus:border-border-hi transition-colors resize-none"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-white text-bg font-bold py-3 rounded tracking-wider uppercase text-xs hover:bg-hi transition-colors disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending...' : 'Send Message'}
      </button>
      {status === 'error' && (
        <p className="text-red-400 text-xs text-center">Failed to send. Please try again.</p>
      )}
    </form>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        <Logo />
        <h1 className="font-serif text-white text-5xl sm:text-7xl font-light tracking-tight mt-8 text-center leading-[0.9]">
          Brick<span className="text-dim">OS</span>
        </h1>
        <p className="text-text text-xs tracking-[0.4em] uppercase mt-6">
          Building sovereignty, brick by brick
        </p>
        <div className="flex gap-6 mt-12">
          <a
            href="https://sovereignhealth.io"
            className="border border-border px-6 py-2.5 text-hi text-xs tracking-wider uppercase hover:border-border-hi hover:text-white transition-colors"
          >
            Get Started Free
          </a>
          <a
            href="https://github.com/sovereignbrick/brickos"
            className="border border-border px-6 py-2.5 text-dim text-xs tracking-wider uppercase hover:border-border-hi hover:text-hi transition-colors"
          >
            View Source
          </a>
        </div>
        <div className="absolute bottom-8 text-text/60 text-xs tracking-widest uppercase animate-bounce">
          Scroll
        </div>
      </section>

      {/* ── PHILOSOPHY ──────────────────────────────────────────── */}
      <section className="border-t border-border py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-text text-[9px] tracking-[0.45em] uppercase mb-8">Philosophy</p>
          <h2 className="font-serif text-white text-2xl sm:text-4xl font-light mb-8 leading-snug">
            Your most sensitive data should live on servers <em className="text-dim italic">you</em> control.
          </h2>
          <div className="grid sm:grid-cols-2 gap-8 mt-12">
            {[
              { title: 'Sovereign-first', desc: 'You own your data. Export it, self-host it, delete it. No vendor lock-in, no data hostage.' },
              { title: 'Privacy by design', desc: 'AES-256-GCM encryption at rest, Row-Level Security, field-level encryption. Zero third-party tracking.' },
              { title: 'Self-hostable', desc: 'Every app runs in Docker on any Linux machine. Your VPS, a Raspberry Pi via Start9, or your laptop.' },
              { title: 'Open source', desc: 'AGPL-3.0 licensed. Read the code, audit the security, fork it. Transparency is not optional.' },
            ].map(p => (
              <div key={p.title} className="border-t border-border pt-6">
                <h3 className="text-hi text-xs tracking-wider uppercase mb-3">{p.title}</h3>
                <p className="text-text leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ────────────────────────────────────────────── */}
      <section className="border-t border-border py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-text text-[9px] tracking-[0.45em] uppercase mb-8">Products</p>

          {/* Sovereign Health */}
          <div className="border border-border rounded p-8 mb-6 hover:border-border-hi transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-white text-2xl font-light">Sovereign Health Intelligence</h3>
                <p className="text-dim text-xs tracking-wider uppercase mt-1">Health Pillar</p>
              </div>
              <span className="text-[9px] tracking-wider uppercase px-3 py-1 border border-green-800 text-green-400 rounded">Live</span>
            </div>
            <p className="text-text mb-6">
              Personal health data platform. Import lab PDFs, track 100+ biomarkers across 8 health zones,
              get AI-powered insights from Dr. Alex. Encrypted at rest, GDPR compliant, self-hostable.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://sovereignhealth.io" className="text-hi text-xs tracking-wider uppercase hover:text-white transition-colors">Website &rarr;</a>
              <span className="text-border">|</span>
              <a href="https://app.sovereignhealth.io" className="text-hi text-xs tracking-wider uppercase hover:text-white transition-colors">Launch App &rarr;</a>
            </div>
          </div>

          {/* Sovereign Link */}
          <div className="border border-border rounded p-8 mb-6 hover:border-border-hi transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-white text-2xl font-light">Sovereign Link</h3>
                <p className="text-dim text-xs tracking-wider uppercase mt-1">Infrastructure Pillar</p>
              </div>
              <span className="text-[9px] tracking-wider uppercase px-3 py-1 border border-green-800 text-green-400 rounded">Live</span>
            </div>
            <p className="text-text">
              URL shortener with QR code generation and affiliate link tracking. Privacy-respecting, no third-party redirects.
            </p>
          </div>

          {/* BTC Tracker */}
          <div className="border border-border rounded p-8 opacity-60 hover:border-border-hi transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-white text-2xl font-light">BTC Tracker</h3>
                <p className="text-dim text-xs tracking-wider uppercase mt-1">Finance Pillar</p>
              </div>
              <span className="text-[9px] tracking-wider uppercase px-3 py-1 border border-border text-dim rounded">Planned</span>
            </div>
            <p className="text-text">
              Bitcoin portfolio tracking. Privacy-first, no API keys to exchanges, local-first data.
            </p>
          </div>
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────────── */}
      <section className="border-t border-border py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-text text-[9px] tracking-[0.45em] uppercase mb-8">Technology</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
            {[
              { label: 'Backend', value: 'Rust' },
              { label: 'Frontend', value: 'Next.js 16' },
              { label: 'Database', value: 'PostgreSQL' },
              { label: 'AI', value: 'Claude API' },
              { label: 'Payments', value: 'Stripe + BTC' },
              { label: 'PWA', value: 'Offline-first' },
              { label: 'Encryption', value: 'AES-256-GCM' },
              { label: 'License', value: 'AGPL-3.0' },
            ].map(t => (
              <div key={t.label} className="bg-bg p-6 text-center">
                <p className="text-white text-sm mb-1">{t.value}</p>
                <p className="text-dim text-[9px] tracking-wider uppercase">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────────────── */}
      <section className="border-t border-border py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-text text-[9px] tracking-[0.45em] uppercase mb-8">Contact</p>
          <h2 className="font-serif text-white text-3xl font-light mb-8 text-center">Get in touch</h2>
          <ContactForm />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-dim text-xs tracking-wider uppercase">
            <a href="https://sovereignhealth.io" className="hover:text-hi transition-colors">Sovereign Health</a>
            <a href="https://github.com/sovereignbrick/brickos" className="hover:text-hi transition-colors">GitHub</a>
            <a href="https://sovereignhealth.io/privacy/" className="hover:text-hi transition-colors">Privacy</a>
            <a href="https://sovereignhealth.io/terms/" className="hover:text-hi transition-colors">Terms</a>
            <a href="https://app.sovereignhealth.io/donate" className="hover:text-hi transition-colors">Donate</a>
          </div>
          <blockquote className="border-t border-border-hi pt-6 mt-4">
            <p className="font-serif text-hi text-base sm:text-lg italic leading-relaxed">
              &ldquo;Bitcoin introduced Proof of Work.<br />
              Health needs Proof of Blood.<br />
              Infrastructure needs Proof of Ownership.&rdquo;
            </p>
          </blockquote>
          <p className="text-text/40 text-xs mt-6">
            &copy; {new Date().getFullYear()} Sovereign Brick. AGPL-3.0.
          </p>
        </div>
      </footer>
    </div>
  )
}
