import { cookies }            from 'next/headers'
import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import { Users, UserPlus, Activity, ShieldCheck } from 'lucide-react'

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  const role = session?.user?.app_metadata?.role as string | undefined
  if (!session || (role !== 'admin' && role !== 'superadmin')) redirect('/dashboard')

  const service = createServiceClient()
  const { data: authData } = await service.auth.admin.listUsers({ perPage: 1000 })
  const allUsers = authData?.users ?? []

  const today     = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const totalUsers    = allUsers.length
  const joinedToday   = allUsers.filter(u => new Date(u.created_at) >= today).length
  const activeWeek    = allUsers.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= weekAgo).length
  const admins        = allUsers.filter(u => u.app_metadata?.role === 'admin' || u.app_metadata?.role === 'superadmin').length

  const stats = [
    { label: 'Total Users',      value: totalUsers,  icon: Users,       color: '#60a5fa' },
    { label: 'Joined Today',     value: joinedToday, icon: UserPlus,    color: '#34d399' },
    { label: 'Active This Week', value: activeWeek,  icon: Activity,    color: '#FEA500' },
    { label: 'Admins',           value: admins,      icon: ShieldCheck, color: '#a78bfa' },
  ]

  const recent = [...allUsers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Welcome back. Here's what's happening on Stockifyy.</p>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5,
            padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
              <div style={{
                width: 40, height: 40, borderRadius: 5, flexShrink: 0,
                background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={20} color={s.color} strokeWidth={1.8} />
              </div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent signups */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Signups</span>
          <a href="/admin/users" style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>View all →</a>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {['Email', 'Provider', 'Role', 'Last Sign In', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--bg-border)' : 'none' }}>
                  <td style={{ padding: '11px 20px', color: 'var(--text-primary)' }}>{u.email ?? '—'}</td>
                  <td style={{ padding: '11px 20px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.app_metadata?.provider ?? '—'}</td>
                  <td style={{ padding: '11px 20px' }}>
                    <RoleBadge role={u.app_metadata?.role ?? 'user'} />
                  </td>
                  <td style={{ padding: '11px 20px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td style={{ padding: '11px 20px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(u.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    superadmin: { bg: 'rgba(254,165,0,.15)',   color: '#FEA500', border: 'rgba(254,165,0,.3)' },
    admin:      { bg: 'rgba(96,165,250,.12)',   color: '#60a5fa', border: 'rgba(96,165,250,.25)' },
    user:       { bg: 'var(--bg-hover)',        color: 'var(--text-muted)', border: 'var(--bg-border)' },
  }
  const c = map[role] ?? map.user
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}`, textTransform: 'capitalize' }}>
      {role}
    </span>
  )
}
