'use client'

import Link          from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, BookMarked,
  Briefcase, SlidersHorizontal, Bell, Settings, LogOut, User,
  Grid2x2, Sun, Moon, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme }     from '@/components/providers/ThemeProvider'

const NAV_ITEMS = [
  { icon: LayoutDashboard,   label: 'Dashboard', href: '/dashboard' },
  { icon: TrendingUp,        label: 'Stocks',    href: '/stocks'    },
  { icon: BookMarked,        label: 'Watchlist', href: '/watchlist' },
  { icon: Briefcase,         label: 'Portfolio', href: '/portfolio' },
  { icon: Grid2x2,           label: 'Heatmap',   href: '/heatmap'   },
  { icon: SlidersHorizontal, label: 'Screener',  href: '/screener'  },
  { icon: Bell,              label: 'Alerts',    href: '/alerts'    },
]

function StockifyySVGLogo() {
  return (
    <svg
      width="140"
      height="39"
      viewBox="0 0 181 51"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Stockifyy"
    >
      <defs>
        {/* Orange → Dark-gold gradient used by all logo paths */}
        <linearGradient id="sb_g1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#FEA500" />
          <stop offset="100%" stopColor="#986300" />
        </linearGradient>
      </defs>

      {/* Hexagonal icon mark — left side */}
      <g>
        <path d="M18.25 2.89L5.25 10.39C3.85 11.19 3 12.7 3 14.3V29.3C3 30.9 3.85 32.41 5.25 33.21L18.25 40.71C19.65 41.51 21.35 41.51 22.75 40.71L35.75 33.21C37.15 32.41 38 30.9 38 29.3V14.3C38 12.7 37.15 11.19 35.75 10.39L22.75 2.89C21.35 2.09 19.65 2.09 18.25 2.89Z" fill="url(#sb_g1)" opacity="0.9" />
        <path d="M12 19.8L20.5 14.8L29 19.8V29.8L20.5 34.8L12 29.8V19.8Z" fill="white" opacity="0.3" />
        <path d="M20.5 18L26 21.5V28.5L20.5 32L15 28.5V21.5L20.5 18Z" fill="white" opacity="0.6" />
      </g>

      {/* Wordmark — "Stockifyy" text paths rendered as text for simplicity */}
      <text
        x="46"
        y="34"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="26"
        letterSpacing="-0.5"
        fill="url(#sb_g1)"
      >
        Stockifyy
      </text>
    </svg>
  )
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="flex flex-col h-screen w-56 shrink-0 border-r"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        borderColor:     'var(--bg-border)',
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-border)' }}>
        <Link href="/dashboard" className="flex items-center" onClick={onClose}>
          <StockifyySVGLogo />
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded md:hidden" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${isActive
                  ? 'text-white'
                  : 'hover:bg-[var(--bg-hover)]'
                }
              `}
              style={isActive ? {
                background: 'linear-gradient(135deg, #FEA500, #986300)',
                color: 'white',
              } : {
                color: 'var(--text-secondary)',
              }}
            >
              <item.icon size={16} className="shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 space-y-0.5 border-t pt-3" style={{ borderColor: 'var(--bg-border)' }}>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                     transition-colors duration-150 w-full text-left
                     hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {theme === 'dark'
            ? <Sun  size={16} className="shrink-0 text-amber-400" />
            : <Moon size={16} className="shrink-0" />
          }
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${pathname.startsWith('/settings')
                        ? 'bg-[var(--bg-hover)]'
                        : 'hover:bg-[var(--bg-hover)]'
                      }`}
          style={{ color: 'var(--text-secondary)' }}
        >
          <Settings size={16} className="shrink-0" />
          Settings
        </Link>

        {/* User + logout */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
                     hover:bg-[var(--bg-hover)] transition-colors"
          onClick={handleLogout}
          title="Sign out"
          style={{ color: 'var(--text-secondary)' }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #FEA500, #986300)' }}
          >
            <User size={12} className="text-white" />
          </div>
          <span className="flex-1 text-sm font-medium truncate">My Account</span>
          <LogOut size={14} />
        </div>
      </div>
    </aside>
  )
}
