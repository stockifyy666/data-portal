'use client'

import Link            from 'next/link'
import Image           from 'next/image'
import { usePathname } from 'next/navigation'
import { useState }    from 'react'
import { LayoutDashboard, Users, Settings, LogOut, ChevronRight, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/admin',          label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/admin/users',    label: 'User Management', icon: Users },
  { href: '/admin/settings', label: 'Settings',        icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname()
  const supabase    = createClient()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const sidebar = (
    <aside style={{
      width: 240, flexShrink: 0,
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--bg-border)',
      display: 'flex', flexDirection: 'column',
      height: '100%',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Image src="/images/logo.svg" alt="Stockifyy" width={110} height={30} style={{ objectFit: 'contain' }} />
          <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--brand)' }}>
            Admin Panel
          </div>
        </div>
        {/* Close button — mobile only */}
        <button className="admin-close-btn" onClick={() => setOpen(false)} style={{
          display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
        }}>
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              color: active ? 'var(--brand)' : 'var(--text-secondary)',
              backgroundColor: active ? 'rgba(254,165,0,.10)' : 'transparent',
              borderLeft: active ? '2px solid var(--brand)' : '2px solid transparent',
              fontSize: 13, fontWeight: active ? 600 : 400,
              textDecoration: 'none', transition: 'all .15s',
            }}>
              <Icon size={16} />
              {label}
              {active && <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: .5 }} />}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--bg-border)' }}>
        <button onClick={handleSignOut} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '10px 12px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 13, fontFamily: 'inherit',
        }}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <style>{`
        /* Mobile topbar — hidden on desktop */
        .admin-topbar { display: none; }

        /* Desktop: sidebar always visible */
        .admin-sidebar-desktop { display: flex; }

        /* Mobile overlay sidebar */
        .admin-sidebar-overlay {
          display: none;
          position: fixed; inset: 0; z-index: 100;
        }
        .admin-sidebar-overlay.open { display: flex; }
        .admin-sidebar-backdrop {
          position: absolute; inset: 0;
          background: rgba(0,0,0,.45);
        }
        .admin-sidebar-panel {
          position: relative; z-index: 1; height: 100%;
        }

        @media (max-width: 768px) {
          .admin-topbar {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 16px;
            background: var(--bg-sidebar);
            border-bottom: 1px solid var(--bg-border);
            position: sticky; top: 0; z-index: 50;
          }
          .admin-sidebar-desktop { display: none !important; }
          .admin-close-btn { display: flex !important; }
          .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 480px) {
          .admin-stats-grid { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 768px) {
          .admin-main-pad { padding: 20px 16px !important; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-page)' }}>

        {/* Mobile topbar */}
        <div className="admin-topbar">
          <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 4 }}>
            <Menu size={22} />
          </button>
          <Image src="/images/logo.svg" alt="Stockifyy" width={100} height={26} style={{ objectFit: 'contain' }} />
          <div style={{ width: 30 }} />
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Desktop sidebar */}
          <div className="admin-sidebar-desktop">
            {sidebar}
          </div>

          {/* Mobile overlay sidebar */}
          <div className={`admin-sidebar-overlay${open ? ' open' : ''}`}>
            <div className="admin-sidebar-backdrop" onClick={() => setOpen(false)} />
            <div className="admin-sidebar-panel">
              {sidebar}
            </div>
          </div>

          {/* Main content */}
          <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
            <div className="admin-main-pad" style={{ width: '100%', padding: '28px 20px 28px 8px' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
