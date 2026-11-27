'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { createClient } from '@/lib/supabase/client'
import { SHOW_FACEBOOK_LOGIN } from '@/lib/features'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'

export default function RegisterPage() {
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [fLoading, setFLoading] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  function safeRedirect(fallback = '/dashboard') {
    const next = new URLSearchParams(window.location.search).get('next') ?? ''
    const destination = next.startsWith('/') && !next.startsWith('//') ? next : fallback
    window.location.replace(destination)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false); return
    }
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } },
      })
      if (signUpError) { setError(signUpError.message); return }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); return }
      safeRedirect()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally { setLoading(false) }
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    const setBusy = provider === 'google' ? setGLoading : setFLoading
    setBusy(true); setError(null)
    const next = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'
    const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(destination)}` },
    })
    if (oauthError) { setError(oauthError.message); setBusy(false) }
  }

  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 8 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e', '#16a34a']

  return (
    <AuthShell
      title="Welcome to Stockifyy Data Portal"
      subtitle="Create your free account for PSX prices, analytics and company research."
      footer={
        <p className="a-switch">
          Already have an account?{' '}
          <Link href="/login" className="a-link">Sign in</Link>
        </p>
      }>
      <button type="button" className="a-google" onClick={() => handleOAuth('google')} disabled={gLoading || fLoading || loading}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
        {gLoading ? 'Redirecting…' : 'Sign up with Google'}
      </button>

      {SHOW_FACEBOOK_LOGIN && (
      <button type="button" className="a-google mt-3" onClick={() => handleOAuth('facebook')} disabled={gLoading || fLoading || loading}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
          <path fill="#fff" d="M16.671 15.563l.532-3.49h-3.328V9.806c0-.955.465-1.886 1.956-1.886h1.513V4.949s-1.374-.236-2.686-.236c-2.741 0-4.533 1.672-4.533 4.697v2.663H7.078v3.49h3.047V24a12.1 12.1 0 0 0 3.75 0v-8.437h2.796z"/>
        </svg>
        {fLoading ? 'Redirecting…' : 'Sign up with Facebook'}
      </button>
      )}

      <div className="a-divider">
        <span className="a-divider-line" />
        <span className="a-divider-text">or sign up with email</span>
        <span className="a-divider-line" />
      </div>

      <form onSubmit={handleRegister} className="a-form">
        <div className="a-field">
          <label className="a-label" htmlFor="reg-name">Full name</label>
          <div className="a-input-wrap">
            <span className="a-input-icon"><User size={16} /></span>
            <input id="reg-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              required autoComplete="name" placeholder="Your full name" className="a-input" />
          </div>
        </div>

        <div className="a-field">
          <label className="a-label" htmlFor="reg-email">Email address</label>
          <div className="a-input-wrap">
            <span className="a-input-icon"><Mail size={16} /></span>
            <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" placeholder="you@example.com" className="a-input" />
          </div>
        </div>

        <div className="a-field">
          <label className="a-label" htmlFor="reg-password">Password</label>
          <div className="a-input-wrap">
            <span className="a-input-icon"><Lock size={16} /></span>
            <input id="reg-password" type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete="new-password"
              placeholder="At least 8 characters" className="a-input" style={{ paddingRight: 44 }} />
            <button type="button" className="a-eye" onClick={() => setShowPw(p => !p)}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-1">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-colors"
                    style={{ background: i <= strength ? strengthColor[strength] : 'var(--bg-border)' }} />
                ))}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: strengthColor[strength] }}>
                {strengthLabel[strength]} password
              </span>
            </div>
          )}
        </div>

        {error && <div className="a-error" role="alert">{error}</div>}

        <button type="submit" disabled={loading || gLoading || fLoading} className="a-submit">
          {loading ? 'Creating account…' : 'Create free account'}
        </button>

        <p className="a-tos">
          By creating an account you agree to our{' '}
          <span style={{ color: 'var(--brand)' }}>Terms of Service</span> and{' '}
          <span style={{ color: 'var(--brand)' }}>Privacy Policy</span>.
        </p>
      </form>
    </AuthShell>
  )
}
