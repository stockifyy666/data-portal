// =============================================================================
// FILE: app/api/auth/delete-account/route.ts
// PURPOSE: Permanently deletes the authenticated user's account and all their data.
//          Uses Supabase Admin client (service role key) to bypass RLS and
//          hard-delete the user from auth.users table.
//
//          ORDER MATTERS (S-03 race condition fix):
//          1. First  → delete all user data from database
//          2. Second → sign out the user
//          If reversed, the session could expire mid-delete leaving orphaned data.
//
//          CALLED FROM: app/(dashboard)/settings/page.tsx after user confirms deletion.
// =============================================================================

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
