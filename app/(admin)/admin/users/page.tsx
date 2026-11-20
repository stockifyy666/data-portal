import { cookies }            from 'next/headers'
import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import CreateUserModal         from './CreateUserModal'
import UsersTable              from './UsersTable'

export default async function UsersPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const currentRole = user?.app_metadata?.role as string | undefined
  const currentId   = user?.id ?? ''
  if (!user || (currentRole !== 'admin' && currentRole !== 'superadmin')) redirect('/dashboard')

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
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage accounts, roles and access</p>
        </div>
        <CreateUserModal viewerRole={currentRole!} />
      </div>

      <UsersTable users={users} viewerRole={currentRole!} viewerId={currentId} />

    </div>
  )
}
