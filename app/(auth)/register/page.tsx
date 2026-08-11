// =============================================================================
// FILE: app/(auth)/register/page.tsx
// PURPOSE: New user registration page.
//          Collects name, email, and password. Creates a Supabase auth account.
//          The database trigger (001_initial_schema.sql) automatically creates
//          a profile row when the auth user is created.
// =============================================================================

'use client'

import { useState }     from 'react'
import { useRouter }    from 'next/navigation'
import Link             from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This gets passed to the handle_new_user trigger as raw_user_meta_data
        data: { full_name: fullName },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Show success message — user needs to verify email before logging in
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-sm text-slate-400 mb-6">
            We sent a confirmation link to <span className="text-white">{email}</span>.
            Click it to activate your account.
          </p>
          <Link
            href="/login"
            className="text-blue-500 hover:text-blue-400 text-sm font-medium"
          >
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Stockifyy</h1>
          <p className="text-sm text-slate-400 mt-1">Create your free account</p>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Get started for free</h2>

          <form onSubmit={handleRegister} className="space-y-4">

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Ahmed Khan"
                className="w-full bg-[#0f1117] border border-[#1e293b] rounded-lg px-3 py-2.5
                           text-sm text-white placeholder-slate-600
                           focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

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

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Password <span className="text-slate-600">(min 8 characters)</span>
              </label>
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

            {error && (
              <div className="bg-red-950 border border-red-800 rounded-lg px-3 py-2.5">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                         text-white text-sm font-semibold rounded-lg px-4 py-2.5
                         transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
