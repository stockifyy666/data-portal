'use client'

import Link          from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, BookMarked,
  Briefcase, SlidersHorizontal, Bell, Settings, LogOut, User,
  Grid2x2, Sun, Moon, X, Calculator, BookOpen, BarChart2, PanelTopOpen,
  Newspaper,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme }     from '@/components/providers/ThemeProvider'
import logo from "../../public/images/logo.svg"
import Image from 'next/image'

const NAV_ITEMS = [
  { icon: LayoutDashboard,   label: 'Dashboard',       href: '/dashboard'  },
  { icon: TrendingUp,        label: 'Stocks',           href: '/stocks'     },
  { icon: BookMarked,        label: 'Watchlist',        href: '/watchlist'  },
  { icon: Briefcase,         label: 'Portfolio',        href: '/portfolio'  },
  { icon: Grid2x2,           label: 'Heatmap',          href: '/heatmap'    },
  { icon: SlidersHorizontal, label: 'Screener',         href: '/screener'   },
  { icon: Bell,              label: 'Alerts',           href: '/alerts'     },
  { icon: Calculator,        label: 'Tools',            href: '/tools'      },
  { icon: BookOpen,          label: 'Reports',          href: '/reports'    },
  { icon: Newspaper,         label: 'News',             href: '/news'       },
  { icon: BarChart2,         label: 'Technical Chart',  href: '/chart'      },
  { icon: PanelTopOpen,      label: 'Multi Chart',      href: '/multichart' },
]

function StockifyySVGLogo() {
  return (
    <Image src={logo} alt='logo image' width={100} height={100} />
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
      <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-border)' }}>
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
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
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
                ${isActive ? 'text-white' : 'hover:bg-[var(--bg-hover)]'}
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
      <div className="px-2 pb-2 space-y-0.5 border-t pt-2" style={{ borderColor: 'var(--bg-border)' }}>

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

        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${pathname.startsWith('/settings') ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          <Settings size={16} className="shrink-0" />
          Settings
        </Link>

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
