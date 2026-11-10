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

      {/* ── Top bar: logo (desktop) + ticker ─────────────────────────────── */}
      <header
        className="flex shrink-0 sticky top-0 z-40 border-b"
        style={{ borderColor: 'var(--bg-border)', height: 48 }}
      >
        {/* Logo cell — matches sidebar width on desktop */}
        <div
          className="hidden md:flex w-56 shrink-0 items-center px-4 border-r"
          style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--bg-border)' }}
        >
          <Link href="/dashboard">
            <Image src={logo} alt="Stockifyy" width={100} height={100} />
          </Link>
        </div>

        {/* Mobile hamburger cell */}
        <div
          className="flex md:hidden items-center px-4"
          style={{ backgroundColor: 'var(--bg-sidebar)' }}
        >
          <button onClick={() => setOpen(true)} className="p-1 rounded" style={{ color: 'var(--text-primary)' }}>
            <Menu size={22} />
          </button>
        </div>

        {/* Ticker — fills remaining width */}
        <div className="flex-1 overflow-hidden">
          <StockTicker />
        </div>
      </header>

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

          {/* Capital Stake attribution — required by data agreement */}
          <div className="w-full px-4 py-2 flex items-center gap-2"
               style={{ borderTop: '1px solid var(--bg-border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
              Market data provided by{' '}
              <a
                href="https://capitalstake.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                Capital Stake
              </a>
              . Data is for informational purposes only.
            </span>
          </div>
        </main>
      </div>
    </div>
  )
}
