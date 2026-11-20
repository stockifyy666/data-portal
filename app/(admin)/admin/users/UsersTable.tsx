'use client'

import { useMemo, useState } from 'react'
import { Search, Users, UserCheck, ShieldCheck, UserPlus, Mail } from 'lucide-react'
import RoleSelect       from './RoleSelect'
import DeleteUserButton from './DeleteUserButton'

export type AdminUser = {
  id: string; email: string; full_name: string; role: string; is_active: boolean
  last_sign_in: string | null; created_at: string; provider: string
}

const ROLE_FILTERS = ['all', 'user', 'admin', 'superadmin'] as const
type RoleFilter = typeof ROLE_FILTERS[number]

const AVATAR_COLORS = ['#FEA500', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6']

function initials(name: string, email: string) {
  const src = name && name !== '—' ? name : email
  const parts = src.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}
function colorFor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function relative(iso: string | null) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

function GoogleMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

function Stat({ icon: Icon, label, value, sub, accent }: {
  icon: typeof Users; label: string; value: number; sub: string; accent: string
}) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3.5 min-w-0"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}1f`, color: accent }}>
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <p className="text-2xl font-extrabold leading-tight font-number" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      </div>
    </div>
  )
}

export default function UsersTable({ users, viewerRole, viewerId }: {
  users: AdminUser[]; viewerRole: string; viewerId: string
}) {
  const [q, setQ]           = useState('')
  const [roleF, setRoleF]   = useState<RoleFilter>('all')

  const stats = useMemo(() => {
    const monthAgo = Date.now() - 30 * 86_400_000
    return {
      total:   users.length,
      active:  users.filter(u => u.last_sign_in && new Date(u.last_sign_in).getTime() > monthAgo).length,
      staff:   users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
      newbies: users.filter(u => new Date(u.created_at).getTime() > monthAgo).length,
      google:  users.filter(u => u.provider === 'google').length,
    }
  }, [users])

  const counts = useMemo(() => {
    const c: Record<RoleFilter, number> = { all: users.length, user: 0, admin: 0, superadmin: 0 }
    for (const u of users) if (u.role in c) c[u.role as RoleFilter]++
    return c
  }, [users])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return users.filter(u =>
      (roleF === 'all' || u.role === roleF) &&
      (!s || u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)))
  }, [users, q, roleF])

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat icon={Users}       label="Total users"     value={stats.total}   sub={`${stats.google} via Google · ${stats.total - stats.google} via email`} accent="#FEA500" />
        <Stat icon={UserCheck}   label="Active (30 days)" value={stats.active}  sub="Signed in during the last 30 days" accent="#10b981" />
        <Stat icon={UserPlus}    label="New (30 days)"   value={stats.newbies} sub="Joined in the last 30 days"       accent="#3b82f6" />
        <Stat icon={ShieldCheck} label="Admins"          value={stats.staff}   sub="Admin and superadmin accounts"    accent="#8b5cf6" />
      </div>

      {/* Table card */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
            {ROLE_FILTERS.map(r => {
              const on = roleF === r
              return (
                <button key={r} onClick={() => setRoleF(r)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors"
                  style={on ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.15)' }
                            : { color: 'var(--text-secondary)' }}>
                  {r === 'all' ? 'All' : r}
                  <span className="ml-1.5 text-[10px] font-bold" style={{ color: on ? 'var(--brand)' : 'var(--text-muted)' }}>{counts[r]}</span>
                </button>
              )
            })}
          </div>
          <label className="relative flex items-center w-full sm:w-72">
            <Search size={14} className="absolute left-3 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email…"
              className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ minWidth: 860, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                {['User', 'Sign-in method', 'Role', 'Status', 'Last sign in', 'Joined', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(u => {
                const color = colorFor(u.id)
                const isYou = u.id === viewerId
                return (
                  <tr key={u.id} className="transition-colors" style={{ borderTop: '1px solid var(--bg-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
                          {initials(u.full_name, u.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold truncate flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                            {u.full_name}
                            {isYou && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(254,165,0,0.15)', color: 'var(--brand)' }}>YOU</span>}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Provider */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
                        {u.provider === 'google' ? <GoogleMark /> : <Mail size={12} />}
                        {u.provider === 'google' ? 'Google' : u.provider === 'facebook' ? 'Facebook' : 'Email'}
                      </span>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <RoleSelect userId={u.id} currentRole={u.role} viewerRole={viewerRole} />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: u.is_active ? '#16a34a' : '#dc2626' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: u.is_active ? '#22c55e' : '#ef4444' }} />
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    {/* Last sign in */}
                    <td className="px-4 py-3 whitespace-nowrap" title={u.last_sign_in ? new Date(u.last_sign_in).toLocaleString('en-PK') : ''}>
                      <span style={{ color: 'var(--text-primary)' }}>{relative(u.last_sign_in)}</span>
                    </td>
                    {/* Joined */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmtDate(u.created_at)}</td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <DeleteUserButton userId={u.id} userEmail={u.email} viewerRole={viewerRole} targetRole={u.role} viewerId={viewerId} />
                    </td>
                  </tr>
                )
              })}
              {shown.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                  {users.length ? 'No users match your search.' : 'No users found.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 text-[11px]" style={{ borderTop: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>
          Showing {shown.length} of {users.length} users
        </div>
      </div>
    </div>
  )
}
