// =============================================================================
// FILE: lib/supabase/client.ts
// PURPOSE: Creates a Supabase client for use in BROWSER (client) components.
//          Uses the ANON key — this key is safe to expose to the browser
//          because Supabase's Row Level Security (RLS) policies ensure users
//          can only access their OWN data, even if someone has the anon key.
//          Import this in any 'use client' component that needs Supabase.
// =============================================================================

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// We use a singleton pattern so we don't create multiple Supabase connections
// in the same browser session — one connection is enough.
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
