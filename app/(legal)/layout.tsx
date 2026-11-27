// Shared layout for public legal pages (/privacy, /terms).
// Public: listed in middleware PUBLIC_ROUTES so Google OAuth verification can read them.

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#ffffff', color: '#0f172a' }}>
      <header className="border-b" style={{ borderColor: '#e5e7eb' }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/login" aria-label="Stockifyy home">
            <Image src="/images/logo.svg" alt="Stockifyy" width={130} height={36} style={{ objectFit: 'contain' }} priority />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium" style={{ color: '#475569' }}>
            <Link href="/privacy" className="hover:text-[#c27c00]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#c27c00]">Terms</Link>
            <Link href="/login" className="font-semibold" style={{ color: '#c27c00' }}>Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 sm:py-14">{children}</main>

      <footer className="border-t" style={{ borderColor: '#e5e7eb' }}>
        <div className="max-w-3xl mx-auto px-5 py-6 text-xs flex flex-wrap items-center justify-between gap-2" style={{ color: '#64748b' }}>
          <span>© {new Date().getFullYear()} Stockifyy (Pvt.) Limited. All rights reserved.</span>
          <span>Market data provided by Capital Stake.</span>
        </div>
      </footer>
    </div>
  )
}
