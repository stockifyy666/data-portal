// =============================================================================
// FILE: components/layout/Header.tsx
// PURPOSE: Top header bar shown on all dashboard pages.
//          Shows current user name, a logout button, and market status badge.
//          On mobile, shows the Stockifyy logo (sidebar is hidden on mobile).
// =============================================================================

'use client'

import { useRouter }    from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type HeaderProps = {
  userName:  string
  userEmail: string
}

export default function Header({ userName, userEmail }: HeaderProps) {
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 h-14
                       bg-[#0f172a] border-b border-[#1e293b] shrink-0">

      {/* Mobile logo — hidden on desktop (sidebar shows it) */}
      <div className="lg:hidden">
        <span className="text-white font-bold text-base tracking-tight">Stockifyy</span>
      </div>

      {/* Desktop: page is identified by sidebar — show nothing on left */}
      <div className="hidden lg:block" />

      {/* Right side: user info + logout */}
      <div className="flex items-center gap-3">

        {/* User info */}
        <div className="flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-white text-xs font-medium leading-none">{userName}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">{userEmail}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                     text-slate-400 hover:text-white hover:bg-[#1e293b]
                     transition-colors cursor-pointer"
          title="Sign out"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign out</span>
        </button>

      </div>
    </header>
  )
}
