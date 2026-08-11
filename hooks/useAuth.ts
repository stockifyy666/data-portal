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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return { user, loading, signOut }
}
