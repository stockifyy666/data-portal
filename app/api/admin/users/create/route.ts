import { cookies }            from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  const viewerRole = session?.user?.app_metadata?.role as string | undefined
  if (!session || (viewerRole !== 'admin' && viewerRole !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { email, password, full_name, role } = await request.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (role === 'superadmin' && viewerRole !== 'superadmin') {
    return NextResponse.json({ error: 'Only superadmin can assign superadmin role' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: role || 'user' },
    user_metadata: { full_name: full_name || '' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // upsert profile row
  if (data.user) {
    await service.from('profiles').upsert({
      id:        data.user.id,
      full_name: full_name || '',
      role:      role || 'user',
    })
  }

  return NextResponse.json({ user: data.user })
}
