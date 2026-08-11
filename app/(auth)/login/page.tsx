// =============================================================================
// FILE: app/(auth)/login/page.tsx
// PURPOSE: The login page — first thing a user sees when not logged in.
//          Handles both regular email/password login AND broker SSO login.
//          Uses Supabase Auth for session management.
//          After login, redirects to dashboard or the page they came from.
// =============================================================================

'use client'

import { useState }       from 'react'
import { useRouter }      from 'next/navigation'
import Link               from 'next/link'
import { createClient }   from '@/lib/supabase/client'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      // Small delay so Supabase can finish writing the session cookie
      await new Promise(resolve => setTimeout(resolve, 100))
      window.location.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Stockifyy</h1>
          <p className="text-sm text-slate-400 mt-1">Pakistan Stock Analytics Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-[#0f1117] border border-[#1e293b] rounded-lg px-3 py-2.5
                           text-sm text-white placeholder-slate-600
                           focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-400">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-500 hover:text-blue-400"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0f1117] border border-[#1e293b] rounded-lg px-3 py-2.5
                           text-sm text-white placeholder-slate-600
                           focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-950 border border-red-800 rounded-lg px-3 py-2.5">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                         text-white text-sm font-semibold rounded-lg px-4 py-2.5
                         transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#1e293b]" />
            <span className="text-xs text-slate-600">or</span>
            <div className="flex-1 h-px bg-[#1e293b]" />
          </div>

          {/* Broker SSO note */}
          <div className="bg-[#0d2137] border border-blue-900 rounded-lg px-3 py-3">
            <p className="text-xs text-slate-400">
              <span className="text-blue-400 font-semibold">Broker users: </span>
              Log into your broker terminal first. You will be redirected here automatically
              via your broker&apos;s platform.
            </p>
          </div>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-slate-500 mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium">
            Create one
          </Link>
        </p>

      </div>
    </div>
  )
}
