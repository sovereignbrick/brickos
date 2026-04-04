import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#070707',
}

export const metadata: Metadata = {
  title: 'BrickOS - Building sovereignty, brick by brick',
  description: 'Privacy-first software platform for health, finance, and infrastructure. Your data, your server. Open source, self-hostable, encrypted by default.',
  keywords: ['BrickOS', 'privacy', 'health', 'biomarkers', 'self-hosted', 'open source', 'Rust', 'sovereignty', 'Bitcoin'],
  authors: [{ name: 'Sovereign Brick' }],
  openGraph: {
    type: 'website',
    title: 'BrickOS - Building sovereignty, brick by brick',
    description: 'Privacy-first software platform for health, finance, and infrastructure.',
    url: 'https://brickos.io',
    siteName: 'BrickOS',
    images: [{
      url: 'https://brickos.io/og-image.png',
      width: 1280,
      height: 640,
      alt: 'BrickOS - Privacy-first sovereignty platform',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BrickOS - Building sovereignty, brick by brick',
    description: 'Privacy-first software platform for health, finance, and infrastructure.',
    images: ['https://brickos.io/og-image.png'],
  },
  icons: {
    icon: '/blockos-favicon.ico',
    apple: '/assets/blockos-favicon-64.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text font-mono text-sm antialiased leading-relaxed">
        {children}
      </body>
    </html>
  )
}
