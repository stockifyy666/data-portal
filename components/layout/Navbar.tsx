'use client'

import Link            from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, LayoutDashboard, TrendingUp, PieChart, BookMarked,
         Briefcase, SlidersHorizontal, Bell, Settings, LogOut, User,
         Grid2x2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { icon: LayoutDashboard,   label: 'Dashboard',    href: '/dashboard' },
  { icon: TrendingUp,        label: 'Stocks',        href: '/stocks' },
  { icon: PieChart,          label: 'Mutual Funds',  href: '/mutual-funds' },
  { icon: BookMarked,        label: 'Watchlist',     href: '/watchlist' },
  { icon: Briefcase,         label: 'Portfolio',     href: '/portfolio' },
  { icon: Grid2x2,           label: 'Heatmap',       href: '/heatmap' },
  { icon: SlidersHorizontal, label: 'Screener',      href: '/screener' },
  { icon: Bell,              label: 'Alerts',        href: '/alerts' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center h-14 px-4 lg:px-6 gap-4">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-2">
          <BarChart3 className="text-blue-600" size={20} />
          <span className="text-slate-900 font-bold text-base tracking-tight">Stockifyy</span>
        </Link>

        {/* Nav links — scrollable on mobile */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto hide-scrollbar">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                            whitespace-nowrap transition-colors shrink-0
                            ${isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Link
            href="/settings"
            className={`p-1.5 rounded-lg transition-colors
              ${pathname.startsWith('/settings')
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Settings size={16} />
          </Link>

          <div className="w-px h-5 bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                         text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
