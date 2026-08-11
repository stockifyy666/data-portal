// =============================================================================
// FILE: app/api/auth/callback/route.ts
// PURPOSE: Supabase Auth callback handler — exchanges the one-time code from
//          the email confirmation link (or OAuth provider) for a session.
//          Supabase sends the user here after they click the verification email.
//          We exchange the code, then redirect to /dashboard.
//          If anything fails, redirect to /login with an error flag.
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code         = searchParams.get('code')
  const redirectTo   = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Code missing or exchange failed — back to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
