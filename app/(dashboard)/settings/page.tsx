'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  User, Mail, Shield, Bell, Palette, Link2, LogOut,
  ChevronRight, Check, Moon, Sun, Monitor, AlertTriangle,
  Clock, Key, Trash2, Smartphone, Save, Loader2,
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

function ComingSoonBadge() {
  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
      Coming soon
    </span>
  )
}

function DisabledRow({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1" style={{ opacity: 0.6 }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
      <ComingSoonBadge />
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

/* ── Delete confirmation modal ────────────────────────────────────── */
function DeleteModal({ email, onConfirm, onCancel, deleting }: {
  email: string; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  const [typed, setTyped] = useState('')
  const match = typed === 'DELETE'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
           style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
               style={{ backgroundColor: '#ef444420', border: '1px solid #ef444440' }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Delete Account</p>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone</p>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          All your data — portfolio, watchlist, alerts, and profile — will be permanently deleted.
          Your account <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> will be removed.
        </p>
        <div>
          <p className="text-[11px] mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Type <strong style={{ color: '#ef4444' }}>DELETE</strong> to confirm
          </p>
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
            style={{
              backgroundColor: 'var(--bg-hover)',
              border: `1px solid ${match ? '#ef4444' : 'var(--bg-border)'}`,
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{ border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={!match || deleting}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: match ? '#ef4444' : 'var(--bg-hover)',
                    color: match ? 'white' : 'var(--text-secondary)',
                    opacity: match && !deleting ? 1 : 0.5,
                    cursor: match && !deleting ? 'pointer' : 'not-allowed',
                  }}>
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── main page ────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [user,    setUser]    = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [theme,   setTheme]   = useState<'light' | 'dark' | 'system'>('light')
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // Profile edit state
  const [fullName,   setFullName]   = useState('')
  const [username,   setUsername]   = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saveMsg,    setSaveMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  // Delete modal
  const [showDelete, setShowDelete] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      ;(supabase as any).from('profiles').select('full_name,username,avatar_url').eq('id', session.user.id).single()
        .then(({ data }: { data: any }) => {
          setProfile(data)
          setFullName(data?.full_name ?? '')
          setUsername(data?.username  ?? '')
          setLoading(false)
        })
        .catch(() => setLoading(false))
    })
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

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true)
    setSaveMsg(null)
    const trimName = fullName.trim()
    const trimUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ full_name: trimName || null, username: trimUser || null, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setSaveMsg({ ok: false, text: error.message })
    } else {
      setProfile((p: any) => ({ ...p, full_name: trimName, username: trimUser }))
      setUsername(trimUser)
      setSaveMsg({ ok: true, text: 'Profile saved.' })
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  async function handleDeleteAccount() {
    if (!user) return
    setDeleting(true)
    try {
      // Sign out first so the session is cleared
      await supabase.auth.signOut()
      // Call the admin delete endpoint (server-side, uses service role)
      await fetch('/api/auth/delete-account', { method: 'DELETE' })
    } catch { /* best effort */ }
    router.push('/login')
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const memberSince = user
    ? new Date(user.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const profileDirty = fullName.trim() !== (profile?.full_name ?? '') ||
                       username.trim()  !== (profile?.username  ?? '')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor: '#FEA500', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="w-full space-y-5 pb-10">

      {showDelete && (
        <DeleteModal
          email={user?.email ?? ''}
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your account and preferences</p>
      </div>

      {/* ── Profile card ── */}
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
                  style={{ backgroundColor: '#FEA50018', color: '#FEA500' }}>Free Plan</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
              Member since {memberSince}
            </span>
          </div>
        </div>
      </div>

      {/* ── Profile Details (editable) ── */}
      <SectionCard title="Profile" icon={User}>
        {/* Full Name */}
        <div>
          <label className="text-[11px] font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Full Name
          </label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
            style={{
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--bg-border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        {/* Username */}
        <div>
          <label className="text-[11px] font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Username
          </label>
          <div className="flex items-center rounded-xl overflow-hidden"
               style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-hover)' }}>
            <span className="px-3 text-sm select-none" style={{ color: 'var(--text-secondary)' }}>@</span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              className="flex-1 py-2 pr-3 text-sm outline-none bg-transparent"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Only lowercase letters, numbers, and underscores.
          </p>
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        {/* Email (read-only) */}
        <div className="flex items-center justify-between py-1">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Email Address</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.email}</span>
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        {/* User ID (read-only) */}
        <div className="flex items-center justify-between py-1">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>User ID</span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            {user?.id?.slice(0, 8)}…
          </span>
        </div>

        {/* Save button */}
        {saveMsg && (
          <div className="text-[11px] px-3 py-2 rounded-lg"
               style={{
                 backgroundColor: saveMsg.ok ? '#22c55e18' : '#ef444418',
                 color: saveMsg.ok ? '#22c55e' : '#ef4444',
                 border: `1px solid ${saveMsg.ok ? '#22c55e30' : '#ef444430'}`,
               }}>
            {saveMsg.text}
          </div>
        )}
        <button
          onClick={handleSaveProfile}
          disabled={!profileDirty || saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: profileDirty && !saving ? 'linear-gradient(135deg,#FEA500,#986300)' : 'var(--bg-hover)',
            color: profileDirty && !saving ? 'white' : 'var(--text-secondary)',
            opacity: profileDirty && !saving ? 1 : 0.6,
            cursor: profileDirty && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : <><Save size={14} /> Save Profile</>
          }
        </button>
      </SectionCard>

      {/* ── Appearance ── */}
      <SectionCard title="Appearance" icon={Palette}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Choose your preferred theme for the dashboard.</p>
        <div className="flex gap-3 pt-1">
          <ThemeOption icon={Sun}     label="Light"  active={theme === 'light'}  onClick={() => applyTheme('light')} />
          <ThemeOption icon={Moon}    label="Dark"   active={theme === 'dark'}   onClick={() => applyTheme('dark')} />
          <ThemeOption icon={Monitor} label="System" active={theme === 'system'} onClick={() => applyTheme('system')} />
        </div>
      </SectionCard>

      {/* ── Notifications (Coming Soon) ── */}
      <SectionCard title="Notifications" icon={Bell}>
        <DisabledRow label="Price Alerts" sub="Get notified when your watched stocks hit target prices" />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <DisabledRow label="Market News" sub="Breaking news about your portfolio holdings" />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <DisabledRow label="Portfolio Updates" sub="Daily summary of your portfolio performance" />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <DisabledRow label="Weekly Report" sub="Weekly digest of market highlights and your holdings" />
      </SectionCard>

      {/* ── Broker Account (Coming Soon) ── */}
      <SectionCard title="Broker Account" icon={Link2}>
        <div className="flex items-center justify-between p-3 rounded-xl"
             style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)', opacity: 0.6 }}>
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
          <ComingSoonBadge />
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          Link your Capital Stake broker account to enable one-click trading via SSO. Available soon.
        </p>
      </SectionCard>

      {/* ── Security (Coming Soon) ── */}
      <SectionCard title="Security" icon={Shield}>
        <DisabledRow label="Change Password" sub="Update your account password" />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <DisabledRow label="Two-Factor Authentication" sub="Add an extra layer of security to your account" />
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <DisabledRow label="Active Sessions" sub="Manage devices where you're signed in" />
      </SectionCard>

      {/* ── Account ── */}
      <SectionCard title="Account" icon={Key}>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Member since</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{memberSince}</p>
          </div>
          <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <div className="flex items-center justify-between py-1" style={{ opacity: 0.6 }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Subscription Plan</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Free — basic market data access</p>
          </div>
          <ComingSoonBadge />
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--bg-border)' }} />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: '#ef4444' }}>Delete Account</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Permanently remove all your data</p>
          </div>
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ border: '1px solid #ef444440', color: '#ef4444', backgroundColor: '#ef444410' }}>
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </SectionCard>

      {/* ── Sign out ── */}
      <button onClick={handleSignOut} disabled={signingOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
        <LogOut size={15} />
        {signingOut ? 'Signing out…' : 'Sign Out'}
      </button>

    </div>
  )
}
