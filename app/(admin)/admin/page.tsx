import { cookies }            from 'next/headers'
import { redirect }           from 'next/navigation'
import Link                   from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import { getCSAPIUsage }      from '@/lib/utils/rateLimit'
import { Users, UserPlus, Activity, ShieldCheck, Gauge, ArrowRight, Mail } from 'lucide-react'

const DAILY_LIMIT = 10_000   // Capital Stake contract: requests per day
const DAY = 86_400_000

const AVATAR_COLORS = ['#FEA500', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6']
function colorFor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(name: string | undefined, email: string) {
  const src = name || email
  const p = src.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((p[0]?.[0] ?? '?') + (p[1]?.[0] ?? '')).toUpperCase()
}
function relative(iso: string | null | undefined) {
  if (!iso) return 'Never'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtHours = (s: number) => s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m`

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!user || (role !== 'admin' && role !== 'superadmin')) redirect('/dashboard')

  const service = createServiceClient()
  const [{ data: authData }, usage] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 1000 }),
    getCSAPIUsage(),
  ])
  const allUsers = authData?.users ?? []

  // ── Metrics ────────────────────────────────────────────────────────────────
  const now      = Date.now()
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const weekAgo  = now - 7 * DAY
  const monthAgo = now - 30 * DAY

  const totalUsers  = allUsers.length
  const joinedToday = allUsers.filter(u => new Date(u.created_at) >= today).length
  const joinedMonth = allUsers.filter(u => new Date(u.created_at).getTime() >= monthAgo).length
  const activeWeek  = allUsers.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() >= weekAgo).length
  const admins      = allUsers.filter(u => u.app_metadata?.role === 'admin' || u.app_metadata?.role === 'superadmin').length
  const google      = allUsers.filter(u => u.app_metadata?.provider === 'google').length
  const emailUsers  = totalUsers - google
  const activePct   = totalUsers ? Math.round((activeWeek / totalUsers) * 100) : 0

  // Signups per day, last 14 days (local dates)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today.getTime() - (13 - i) * DAY)
    return { key: d.toDateString(), label: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }), count: 0 }
  })
  const byKey = new Map(days.map(d => [d.key, d]))
  for (const u of allUsers) {
    const k = new Date(u.created_at); k.setHours(0, 0, 0, 0)
    const slot = byKey.get(k.toDateString())
    if (slot) slot.count++
  }
  const maxDay = Math.max(1, ...days.map(d => d.count))
  const signups14 = days.reduce((s, d) => s + d.count, 0)

  // API usage
  const usedPct  = Math.min(100, (usage.used / DAILY_LIMIT) * 100)
  const usageCol = usedPct >= 90 ? '#ef4444' : usedPct >= 70 ? '#f59e0b' : '#10b981'
  const topEndpoints = usage.endpoints.slice(0, 4)

  const recent = [...allUsers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  const stats = [
    { label: 'Total Users',        value: totalUsers,  sub: `${joinedMonth} joined in the last 30 days`, icon: Users,       accent: '#3b82f6' },
    { label: 'Joined Today',       value: joinedToday, sub: `${signups14} in the last 14 days`,           icon: UserPlus,    accent: '#10b981' },
    { label: 'Active This Week',   value: activeWeek,  sub: `${activePct}% of all users`,                 icon: Activity,    accent: '#FEA500' },
    { label: 'Admins',             value: admins,      sub: 'Admin and superadmin accounts',              icon: ShieldCheck, accent: '#8b5cf6' },
  ]

  const card = 'rounded-xl'
  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>Overview</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Users, sign-ins and data usage across Stockifyy.
          </p>
        </div>
        <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl p-5 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${s.accent}24 0%, ${s.accent}08 55%, var(--bg-card) 100%)`,
                     border: `1px solid ${s.accent}40` }}>
            {/* decorative rings */}
            <span className="absolute -right-8 -top-8 w-28 h-28 rounded-full" style={{ border: `14px solid ${s.accent}14` }} />
            <span className="absolute -right-2 -bottom-10 w-20 h-20 rounded-full" style={{ background: `${s.accent}0f` }} />

            <div className="relative flex items-start gap-4">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: s.accent, color: '#fff', boxShadow: `0 8px 20px ${s.accent}55` }}>
                <s.icon size={22} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                <p className="text-[32px] font-extrabold leading-tight font-number tabular-nums" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
              </div>
            </div>
            <p className="relative text-xs mt-3 pt-3 font-medium" style={{ color: 'var(--text-primary)', opacity: 0.75, borderTop: `1px dashed ${s.accent}40` }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Signups chart + API usage */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Signups — last 14 days */}
        <div className={`${card} p-5`} style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New signups</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last 14 days</p>
            </div>
            <span className="text-2xl font-extrabold font-number" style={{ color: 'var(--text-primary)' }}>{signups14}</span>
          </div>
          <div className="flex items-end gap-1.5 h-36">
            {days.map((d, i) => {
              const isToday = i === days.length - 1
              return (
                <div key={d.key} className="flex-1 h-full flex flex-col justify-end items-center gap-1 min-w-0" title={`${d.label}: ${d.count}`}>
                  {d.count > 0 && <span className="text-[10px] font-bold font-number" style={{ color: 'var(--text-secondary)' }}>{d.count}</span>}
                  <div className="w-full rounded-t-md" style={{
                    height: d.count ? `${Math.max(8, (d.count / maxDay) * 100)}%` : 3,
                    background: d.count ? (isToday ? 'linear-gradient(180deg,#FEA500,#986300)' : 'linear-gradient(180deg,#3b82f6,#1d4ed8)') : 'var(--bg-border)',
                    opacity: d.count ? 1 : 0.7,
                  }} />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span>{days[0].label}</span><span>{days[6].label}</span><span>Today</span>
          </div>

          {/* Sign-in method split */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--bg-border)' }}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Sign-in method</span>
              <span style={{ color: 'var(--text-muted)' }}>{totalUsers} users</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
              {totalUsers > 0 && <>
                <div style={{ width: `${(google / totalUsers) * 100}%`, background: '#4285F4' }} />
                <div style={{ width: `${(emailUsers / totalUsers) * 100}%`, background: '#FEA500' }} />
              </>}
            </div>
            <div className="flex gap-5 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="inline-flex items-center gap-1.5"><GoogleMark size={12} />Google <b style={{ color: 'var(--text-primary)' }}>{google}</b></span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#FEA500' }} />Email <b style={{ color: 'var(--text-primary)' }}>{emailUsers}</b></span>
            </div>
          </div>
        </div>

        {/* API usage today */}
        <div className={`${card} p-5 flex flex-col`} style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Capital Stake API today</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Resets in {fmtHours(usage.resetIn)}</p>
            </div>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${usageCol}1f`, color: usageCol }}>
              <Gauge size={18} />
            </span>
          </div>
          <p className="font-number tabular-nums">
            <span className="text-[34px] font-extrabold" style={{ color: 'var(--text-primary)' }}>{usage.used.toLocaleString()}</span>
            <span className="text-sm font-semibold ml-1" style={{ color: 'var(--text-muted)' }}>/ {DAILY_LIMIT.toLocaleString()}</span>
          </p>
          <div className="h-2.5 rounded-full overflow-hidden mt-3" style={{ background: 'var(--bg-border)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(usedPct, 1)}%`, background: usageCol }} />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            {usedPct.toFixed(1)}% used · <b style={{ color: 'var(--text-primary)' }}>{usage.remaining.toLocaleString()}</b> requests left
          </p>

          <div className="mt-5 pt-4 flex-1" style={{ borderTop: '1px solid var(--bg-border)' }}>
            <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--text-secondary)' }}>Top endpoints</p>
            {topEndpoints.length ? (
              <ul className="space-y-2">
                {topEndpoints.map(e => (
                  <li key={e.endpoint} className="flex items-center gap-3 text-xs">
                    <span className="flex-1 truncate font-mono" style={{ color: 'var(--text-primary)' }} title={e.endpoint}>
                      {e.endpoint.replace(/^GET\s+/, '').replace(/^https?:\/\/[^/]+/, '')}
                    </span>
                    <span className="font-bold font-number" style={{ color: 'var(--text-secondary)' }}>{e.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No API calls yet today.</p>
            )}
          </div>
          <Link href="/admin/api-usage" className="mt-4 inline-flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--brand)' }}>
            Full usage report <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Recent signups */}
      <div className={`${card} overflow-hidden`} style={cardStyle}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Recent signups</p>
          <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--brand)' }}>
            Manage users <ArrowRight size={13} />
          </Link>
        </div>
        <ul>
          {recent.map((u, i) => {
            const color = colorFor(u.id)
            const r = (u.app_metadata?.role as string) ?? 'user'
            const name = (u.user_metadata?.full_name || u.user_metadata?.name) as string | undefined
            return (
              <li key={u.id} className="flex items-center gap-3 px-5 py-3" style={{ borderTop: i ? '1px solid var(--bg-border)' : 'none' }}>
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
                  {initials(name, u.email ?? '?')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name || u.email}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{u.email}</p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
                  {u.app_metadata?.provider === 'google' ? <><GoogleMark size={11} /> Google</> : <><Mail size={11} /> Email</>}
                </span>
                <RoleBadge role={r} />
                <div className="text-right w-28 shrink-0 hidden md:block">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{relative(u.created_at)}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>joined</p>
                </div>
              </li>
            )
          })}
          {recent.length === 0 && (
            <li className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No users yet</li>
          )}
        </ul>
      </div>
    </div>
  )
}

function GoogleMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    superadmin: { bg: 'rgba(254,165,0,.14)',  color: '#FEA500',            border: 'rgba(254,165,0,.35)' },
    admin:      { bg: 'rgba(96,165,250,.12)', color: '#60a5fa',            border: 'rgba(96,165,250,.3)' },
    user:       { bg: 'var(--bg-hover)',      color: 'var(--text-secondary)', border: 'var(--bg-border)' },
  }
  const c = map[role] ?? map.user
  return (
    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize shrink-0"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {role}
    </span>
  )
}
