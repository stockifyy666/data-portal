'use client'

import { useState }  from 'react'
import { Menu }      from 'lucide-react'
import Link          from 'next/link'
import Image         from 'next/image'
import logo          from '@/public/images/logo.svg'
import Sidebar       from '@/components/layout/Sidebar'
import StockTicker   from '@/components/layout/StockTicker'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-page)' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header
        className="flex shrink-0 sticky top-0 z-40 border-b"
        style={{ borderColor: 'var(--bg-border)', height: 56 }}
      >
        {/* Logo cell — desktop sidebar width */}
        <div
          className="hidden md:flex w-56 shrink-0 items-center px-4 border-r"
          style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--bg-border)' }}
        >
          <Link href="/dashboard">
            <Image src={logo} alt="Stockifyy" width={100} height={100} />
          </Link>
        </div>

        {/* Mobile: hamburger + centered logo */}
        <div
          className="flex md:hidden items-center px-4 relative w-full"
          style={{ backgroundColor: 'var(--bg-sidebar)' }}
        >
          <button onClick={() => setOpen(true)} className="p-1 rounded" style={{ color: 'var(--text-primary)' }}>
            <Menu size={22} />
          </button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <Link href="/dashboard">
              <Image src={logo} alt="Stockifyy" width={150} height={150} />
            </Link>
          </div>
        </div>

        {/* Ticker — desktop only */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <StockTicker />
        </div>
      </header>

      {/* Mobile ticker bar — below navbar */}
      <div
        className="md:hidden shrink-0 overflow-hidden"
        style={{ height: 44, borderBottom: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-sidebar)' }}
      >
        <StockTicker />
      </div>

      {/* ── Below header: sidebar + main ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar — no logo header (it's in the top bar above) */}
        <div className="hidden md:flex h-full">
          <Sidebar noHeader />
        </div>

        {/* Mobile sidebar overlay */}
        {open && (
          <div className="fixed inset-0 z-[60] flex md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="relative z-10 flex h-full">
              <Sidebar onClose={() => setOpen(false)} />
            </div>
          </div>
        )}

        {/* Main scroll area */}
        <main className="flex-1 overflow-y-auto flex flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>

          {/* Page content */}
          <div className="flex-1 w-full px-4 py-4">
            {children}
          </div>

          {/* Footer — attribution + disclaimer */}
          <div className="w-full px-4 pt-3 pb-4" style={{ borderTop: '1px solid var(--bg-border)' }}>

            {/* Attribution row */}
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.01em', marginBottom: 10 }}>
              Market data provided by{' '}
              <a
                href="https://capitalstake.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FEA500', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                Capital Stake
              </a>
              . Data is for informational purposes only.
            </p>

            {/* Disclaimer */}
            <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                Disclaimer
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Stockifyy (Pvt.) Ltd. reserves the right to determine the criteria under which users may access its platform and services.
                Stockifyy and its owners/affiliates shall not be liable for any damages arising from performance failures, errors, omissions,
                interruptions, delays, computer viruses, communication failures, or unauthorized access to user accounts.
                Users are solely responsible for maintaining the confidentiality of their credentials; Stockifyy is not responsible for any
                loss or misuse resulting from compromised passwords. All content, data, and analysis presented on this platform represent
                informational views only and should not be construed as investment advice. Users are advised to exercise independent judgment
                when making investment decisions — investments discussed may not be suitable for all investors. Stockifyy does not warrant the
                timeliness, accuracy, or completeness of data, nor does it guarantee any specific investment outcome, profit, or protection from loss.
                Stockifyy reserves the right to suspend or terminate accounts of users who violate its terms of service or proprietary rights,
                in addition to pursuing any necessary legal remedies.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
