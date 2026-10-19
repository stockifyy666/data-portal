import { cookies }            from 'next/headers'
import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import RoleSelect              from './RoleSelect'
import CreateUserModal         from './CreateUserModal'

export default async function UsersPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  const currentRole = session?.user?.app_metadata?.role as string | undefined
  if (!session || (currentRole !== 'admin' && currentRole !== 'superadmin')) redirect('/dashboard')

  const service = createServiceClient()
  const [{ data: profiles }, { data: authData }] = await Promise.all([
    service.from('profiles').select('id, full_name, username, role, is_active, created_at'),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // Use auth.users as source of truth, enrich with profiles data
  const users = (authData?.users ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(u => {
      const p = profileMap.get(u.id)
      return {
        id:           u.id,
        email:        u.email ?? '—',
        full_name:    p?.full_name || u.user_metadata?.full_name || u.user_metadata?.name || '—',
        role:         (u.app_metadata?.role as string) || p?.role || 'user',
        is_active:    p?.is_active ?? true,
        last_sign_in: u.last_sign_in_at ?? null,
        created_at:   u.created_at,
        provider:     u.app_metadata?.provider ?? 'email',
      }
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>User Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{users.length} {users.length === 1 ? 'user' : 'users'} registered</p>
        </div>
        <CreateUserModal viewerRole={currentRole!} />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {['Name', 'Email', 'Provider', 'Role', 'Status', 'Last Sign In', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--bg-border)' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {u.full_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{u.provider}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <RoleSelect userId={u.id} currentRole={u.role} viewerRole={currentRole!} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', fontWeight: 600,
                      background: u.is_active ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.1)',
                      color: u.is_active ? '#16a34a' : '#dc2626',
                      border: `1px solid ${u.is_active ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.2)'}`,
                    }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(u.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
