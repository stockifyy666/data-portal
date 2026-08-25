'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)
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

  async function handleGoogle() {
    setGLoading(true); setError(null)
    const next = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'
    const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(destination)}` },
    })
    if (oauthError) { setError(oauthError.message); setGLoading(false) }
  }

  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 8 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e', '#16a34a']

  return (
    <div className="a-page">

      {/* ── Background ── */}
      <div className="a-bg" aria-hidden>
        <div className="a-blob a-blob-1" />
        <div className="a-blob a-blob-2" />
        <div className="a-blob a-blob-3" />
      </div>

      <div className="a-card">

        {/* Logo */}
        <div className="a-logo">
          <Image src="/images/logo.svg" alt="Stockifyy" width={160} height={44} style={{ objectFit: 'contain' }} />
        </div>

        <h1 className="a-title">Create your free account</h1>

        {/* Google */}
        <button className="a-google" onClick={handleGoogle} disabled={gLoading || loading}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          {gLoading ? 'Redirecting…' : 'Sign up with Google'}
        </button>

        {/* Divider */}
        <div className="a-divider">
          <span className="a-divider-line" />
          <span className="a-divider-text">or continue with email</span>
          <span className="a-divider-line" />
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="a-form">
          <div className="a-field">
            <label className="a-label">Full Name</label>
            <input
              type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              required placeholder="Ahmed Khan" className="a-input"
            />
          </div>

          <div className="a-field">
            <label className="a-label">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@example.com" className="a-input"
            />
          </div>

          <div className="a-field">
            <label className="a-label">Password</label>
            <div className="a-input-wrap">
              <input
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                required placeholder="Min 8 characters" className="a-input" style={{ paddingRight: 42 }}
              />
              <button type="button" className="a-eye" onClick={() => setShowPw(p => !p)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ marginTop: 7 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3,
                      background: i <= strength ? strengthColor[strength] : 'var(--bg-border)',
                      transition: 'background .2s',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
              </div>
            )}
          </div>

          {error && <div className="a-error">{error}</div>}

          <button type="submit" disabled={loading || gLoading} className="a-submit">
            {loading ? 'Creating account…' : 'Create Free Account'}
          </button>

          <p className="a-tos">
            By signing up you agree to our{' '}
            <span style={{ color: 'var(--brand)' }}>Terms of Service</span>{' '}
            and{' '}
            <span style={{ color: 'var(--brand)' }}>Privacy Policy</span>
          </p>
        </form>

        <p className="a-switch">
          Already have an account?{' '}
          <Link href="/login" className="a-link">Sign in</Link>
        </p>

        {/* Trust bar */}
        <div className="a-trust">
          <span>🔒 Secured by Supabase</span>
          <span>·</span>
          <span>PSX Live Data</span>
          <span>·</span>
          <span>Free forever</span>
        </div>
      </div>

      <style>{`
        .a-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background-color: var(--bg-page);
          position: relative;
          overflow: hidden;
        }

        .a-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .a-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
        }
        .a-blob-1 {
          width: 750px; height: 750px;
          top: -300px; left: -200px;
          background: radial-gradient(circle, #FEA500AA 0%, #FEA50055 35%, transparent 65%);
        }
        .a-blob-2 {
          width: 650px; height: 650px;
          bottom: -250px; right: -180px;
          background: radial-gradient(circle, #FEA50099 0%, #FEA50044 35%, transparent 65%);
        }
        .a-blob-3 {
          width: 500px; height: 500px;
          top: 30%; left: 52%;
          background: radial-gradient(circle, #98630055 0%, transparent 60%);
        }

        .a-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: var(--bg-card);
          border: 1px solid var(--bg-border);
          padding: 40px 36px 32px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.08);
        }

        .a-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 28px;
        }

        .a-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          text-align: center;
          margin: 0 0 24px;
          letter-spacing: -.01em;
        }

        .a-google {
          width: 100%;
          padding: 11px 16px;
          background: var(--bg-hover);
          border: 1px solid var(--bg-border);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: border-color .15s, background .15s;
          font-family: inherit;
        }
        .a-google:hover:not(:disabled) {
          border-color: var(--brand);
          background: var(--bg-card);
        }
        .a-google:disabled { opacity: .6; cursor: not-allowed; }

        .a-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 20px 0;
        }
        .a-divider-line {
          flex: 1;
          height: 1px;
          background: var(--bg-border);
          display: block;
        }
        .a-divider-text {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .a-form { display: flex; flex-direction: column; gap: 16px; }
        .a-field { display: flex; flex-direction: column; gap: 6px; }

        .a-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          display: block;
        }

        .a-input-wrap { position: relative; }

        .a-input {
          width: 100%;
          padding: 10px 14px;
          background: var(--bg-page);
          border: 1px solid var(--bg-border);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: border-color .15s;
          font-family: inherit;
          box-sizing: border-box;
        }
        .a-input:focus { border-color: var(--brand); }
        .a-input::placeholder { color: var(--text-muted); }

        .a-eye {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          padding: 0;
        }
        .a-eye:hover { color: var(--text-secondary); }

        .a-error {
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 13px;
          line-height: 1.5;
        }
        .dark .a-error {
          background: #1a0808;
          border-color: #7f1d1d;
          color: #f87171;
        }

        .a-submit {
          width: 100%;
          padding: 11px 16px;
          margin-top: 4px;
          background: linear-gradient(135deg, #FEA500, #986300);
          border: none;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: .02em;
          cursor: pointer;
          transition: opacity .15s;
          font-family: inherit;
        }
        .a-submit:hover:not(:disabled) { opacity: .9; }
        .a-submit:disabled { opacity: .6; cursor: not-allowed; }

        .a-tos {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          line-height: 1.6;
          margin: 0;
        }

        .a-switch {
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 20px;
        }
        .a-link { color: var(--brand); font-weight: 600; text-decoration: none; }
        .a-link:hover { text-decoration: underline; }

        .a-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--bg-border);
          font-size: 11px;
          color: var(--text-muted);
        }

        @media (max-width: 480px) {
          .a-card { padding: 28px 20px 24px; }
        }
      `}</style>
    </div>
  )
}
