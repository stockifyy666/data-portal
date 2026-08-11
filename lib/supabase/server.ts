// =============================================================================
// FILE: lib/supabase/server.ts
// PURPOSE: Creates a Supabase client for use on the SERVER ONLY.
//          Server components, API routes, and middleware use this.
//          This reads session cookies to identify the logged-in user.
//          NEVER import this in a 'use client' component — it uses cookies
//          which are only accessible server-side.
// =============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can fail in Server Components — this is expected and safe
          }
        },
      },
    }
  )
}

// =============================================================================
// createAdminClient — Uses the SERVICE ROLE key (bypasses RLS)
// ONLY use this for admin operations that need to read/write any user's data.
// Examples: background jobs, admin panel, sending emails.
// NEVER use this in a regular user-facing API route.
// =============================================================================
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Bypasses RLS — server only
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}
