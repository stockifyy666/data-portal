import { NextResponse }    from 'next/server'
import { createClient }    from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url        = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceKey || !url) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const admin = createAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}
