import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { createServiceClient }       from '@/lib/supabase/service'
import { cookies }                   from 'next/headers'

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.app_metadata?.role as string | undefined
    if (!user || (role !== 'admin' && role !== 'superadmin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await req.json()
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const service = createServiceClient()

    // Check target user's role — admins cannot delete superadmins
    const { data: targetAuth } = await service.auth.admin.getUserById(userId)
    const targetRole = targetAuth?.user?.app_metadata?.role as string | undefined
    if (targetRole === 'superadmin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmins can delete superadmin accounts' }, { status: 403 })
    }

    const { error } = await service.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
