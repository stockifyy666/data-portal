'use client'

import { useState } from 'react'
import { Menu, X }  from 'lucide-react'
import Sidebar       from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-page)' }}>

      {/* Desktop sidebar — always visible ≥ md */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <div className="relative z-10 flex">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Main scroll area */}
      <main className="flex-1 overflow-y-auto flex flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>

        {/* Mobile top bar */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
             style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--bg-border)' }}>
          <button onClick={() => setOpen(true)} className="p-1 rounded" style={{ color: 'var(--text-primary)' }}>
            <Menu size={22} />
          </button>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Stockifyy</span>
          {/* spacer to centre the title */}
          <div className="w-8" />
        </div>

        {/* Page content */}
        <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 md:px-5 lg:px-6 py-5">
          {children}
        </div>
      </main>
    </div>
  )
}
