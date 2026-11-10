import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import { cookies }             from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const VALID_ROLES = ['user', 'admin', 'superadmin']

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const callerRole = user?.app_metadata?.role as string | undefined

  if (!user || (callerRole !== 'admin' && callerRole !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, role } = await request.json()

  if (!userId || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  if (callerRole === 'admin' && role === 'superadmin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const service = createServiceClient()

  // Update app_metadata in auth.users — this is what the JWT reads
  const { error: authError } = await service.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  })
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Also upsert profiles row so it stays in sync
  await service.from('profiles').upsert({ id: userId, role })

  return NextResponse.json({ success: true })
}
