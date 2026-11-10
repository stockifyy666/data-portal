// =============================================================================
// FILE: hooks/useAuth.ts
// PURPOSE: Hook for accessing the current Supabase auth session in client
//          components. Returns the user object and a logout function.
//          The middleware already handles route protection, so this hook is
//          primarily for showing user info (name, email) in the UI.
// =============================================================================

'use client'

import { useState, useEffect }  from 'react'
import { useRouter }            from 'next/navigation'
import { createClient }         from '@/lib/supabase/client'
import type { User }            from '@supabase/supabase-js'

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router  = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial user (verified server-side)
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes — use getUser() to get the verified user,
    // not session.user which comes directly from storage and is unverified.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: { user: verified } } = await supabase.auth.getUser()
        setUser(verified ?? null)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return { user, loading, signOut }
}
