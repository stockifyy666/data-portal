'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  User, Mail, Shield, Bell, Palette, Link2, LogOut,
  ChevronRight, Check, Moon, Sun, Monitor, Eye, EyeOff,
  Smartphone, AlertTriangle, Clock, Key, Trash2,
} from 'lucide-react'

/* ── helpers ──────────────────────────────────────────────────────── */
function Avatar({ name, email }: { name?: string; email?: string }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (email?.[0] ?? '?').toUpperCase()
  return (
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0"
         style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
      {initials}
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-card)' }}>
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid var(--bg-border)' }}>
        <Icon size={15} style={{ color: '#FEA500' }} />
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${mono ? 'font-mono text-xs' : ''}`}
              style={{ color: 'var(--text-primary)' }}>{value}</span>
      </div>
    </div>
  )
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
      <button onClick={onChange}
              className="relative w-10 h-5.5 rounded-full transition-all duration-200 shrink-0"
              style={{
                width: 40, height: 22,
                backgroundColor: checked ? '#FEA500' : 'var(--bg-border)',
              }}>
        <span className="absolute top-0.5 transition-all duration-200 w-4.5 h-4.5 rounded-full bg-white shadow"
              style={{ width: 18, height: 18, left: checked ? 19 : 2 }} />
      </button>
    </div>
  )
}

function ThemeOption({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all"
      style={{
        border: `1.5px solid ${active ? '#FEA500' : 'var(--bg-border)'}`,
        backgroundColor: active ? '#FEA50012' : 'var(--bg-hover)',
      }}>
      <Icon size={18} style={{ color: active ? '#FEA500' : 'var(--text-secondary)' }} />
      <span className="text-[11px] font-semibold" style={{ color: active ? '#FEA500' : 'var(--text-secondary)' }}>{label}</span>
      {active && <Check size={12} style={{ color: '#FEA500' }} />}
    </button>
  )
}

/* ── main page ────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [user,    setUser]    = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [theme,   setTheme]   = useState<'light' | 'dark' | 'system'>('light')
  const [notifs,  setNotifs]  = useState({ priceAlerts: true, news: false, portfolio: true, weekly: true })
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      supabase.from('profiles').select('full_name,username,avatar_url').eq('id', session.user.id).single()
        .then(({ data }) => setProfile(data))
        .finally(() => setLoading(false))
    })
    // read saved theme
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    setTheme(saved ?? 'light')
  }, [])

  function applyTheme(t: 'light' | 'dark' | 'system') {
    setTheme(t)
    if (t === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', dark)
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } else {
      document.documentElement.classList.toggle('dark', t === 'dark')
      localStorage.setItem('theme', t)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const memberSince = user
    ? new Date(user.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#FEA500', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="w-full space-y-5 pb-10">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your account and preferences</p>
        </div>
      </div>

      {/* ── Profile card ──────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 flex items-center gap-4"
           style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-card)' }}>
        <Avatar name={profile?.full_name} email={user?.email} />
        <div className="flex-1 min-w-0">
          <p className="text-base font-black truncate" style={{ color: 'var(--text-primary)' }}>
            {profile?.full_name || user?.email?.split('@')[0] || 'User'}
          </p>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: '#FEA50018', color: '#FEA500' }}>
              Free Plan
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
              Member since {memberSince}
            </span>
          </div>
        </div>
      </div>

      {/* ── Profile Details ───────────────────────────────────────── */}
      <SectionCard title="Profile" icon={User}>
        <Field label="Full Name" value={profile?.full_name || '—'} />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <Field label="Email Address" value={user?.email || '—'} />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <Field label="Username" value={profile?.username || '—'} />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <Field label="User ID" value={user?.id?.slice(0, 8) + '…' || '—'} mono />
        <div className="pt-1">
          <p className="text-[11px] px-3 py-2 rounded-lg"
             style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
            Profile editing coming soon. Contact <span style={{ color: '#FEA500' }}>support@stockifyy.com</span> to update your details.
          </p>
        </div>
      </SectionCard>

      {/* ── Appearance ────────────────────────────────────────────── */}
      <SectionCard title="Appearance" icon={Palette}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Choose your preferred theme for the dashboard.</p>
        <div className="flex gap-3 pt-1">
          <ThemeOption icon={Sun}     label="Light"  active={theme === 'light'}  onClick={() => applyTheme('light')} />
          <ThemeOption icon={Moon}    label="Dark"   active={theme === 'dark'}   onClick={() => applyTheme('dark')} />
          <ThemeOption icon={Monitor} label="System" active={theme === 'system'} onClick={() => applyTheme('system')} />
        </div>
      </SectionCard>

      {/* ── Notifications ─────────────────────────────────────────── */}
      <SectionCard title="Notifications" icon={Bell}>
        <Toggle
          label="Price Alerts"
          sub="Get notified when your watched stocks hit target prices"
          checked={notifs.priceAlerts}
          onChange={() => setNotifs(n => ({ ...n, priceAlerts: !n.priceAlerts }))}
        />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <Toggle
          label="Market News"
          sub="Breaking news about your portfolio holdings"
          checked={notifs.news}
          onChange={() => setNotifs(n => ({ ...n, news: !n.news }))}
        />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <Toggle
          label="Portfolio Updates"
          sub="Daily summary of your portfolio performance"
          checked={notifs.portfolio}
          onChange={() => setNotifs(n => ({ ...n, portfolio: !n.portfolio }))}
        />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <Toggle
          label="Weekly Report"
          sub="Weekly digest of market highlights and your holdings"
          checked={notifs.weekly}
          onChange={() => setNotifs(n => ({ ...n, weekly: !n.weekly }))}
        />
        <p className="text-[11px] pt-1" style={{ color: 'var(--text-secondary)' }}>
          Email notification delivery coming soon.
        </p>
      </SectionCard>

      {/* ── Broker Account ────────────────────────────────────────── */}
      <SectionCard title="Broker Account" icon={Link2}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Link your Capital Stake broker account to enable one-click trading directly from the dashboard via SSO.
        </p>
        <div className="flex items-center justify-between p-3 rounded-xl"
             style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: 'var(--bg-border)' }}>
              <Smartphone size={14} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Capital Stake</p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>No broker linked</p>
            </div>
          </div>
          <button className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }}>
            Link Account
          </button>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-xl"
             style={{ backgroundColor: '#FEA50010', border: '1px solid #FEA50030' }}>
          <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: '#FEA500' }} />
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Broker linking is currently in beta. Trading via SSO will be available after verification.
          </p>
        </div>
      </SectionCard>

      {/* ── Security ──────────────────────────────────────────────── */}
      <SectionCard title="Security" icon={Shield}>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Password</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Last changed: never</p>
          </div>
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)' }}>
            Change
          </button>
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Two-Factor Auth</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Add an extra layer of security to your account</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
            Coming soon
          </span>
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Active Sessions</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage devices where you're signed in</p>
          </div>
          <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)' }}>
            View <ChevronRight size={11} />
          </button>
        </div>
      </SectionCard>

      {/* ── Account ───────────────────────────────────────────────── */}
      <SectionCard title="Account" icon={Key}>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Member since</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{memberSince}</p>
          </div>
          <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Subscription Plan</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Free — basic market data access</p>
          </div>
          <button className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }}>
            Upgrade
          </button>
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: '#ef4444' }}>Delete Account</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Permanently remove all your data</p>
          </div>
          <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ border: '1px solid #ef444440', color: '#ef4444', backgroundColor: '#ef444410' }}>
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </SectionCard>

      {/* ── Sign out ──────────────────────────────────────────────── */}
      <button onClick={handleSignOut} disabled={signingOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
        <LogOut size={15} />
        {signingOut ? 'Signing out…' : 'Sign Out'}
      </button>

    </div>
  )
}
