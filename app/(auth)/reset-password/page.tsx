'use client'

// =============================================================================
// FILE: app/(auth)/reset-password/page.tsx
// PURPOSE: Password reset page. Reached via the email link from forgot-password flow.
//          Supabase sends a magic link that sets a session cookie automatically.
//          This page:
//          1. Validates the session exists (link not expired)
//          2. Shows a password strength checklist (length, uppercase, number, match)
//          3. Calls supabase.auth.updateUser({ password }) to save the new password
//          4. Signs out all other sessions (security — invalidate old sessions)
//          5. Redirects to /login after 3 seconds
//
//          If no session found → shows "Link expired" message instead of the form.
// =============================================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [showCf,    setShowCf]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [done,      setDone]      = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)  // null = checking

  // Verify the user arrived here with a valid recovery session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
    })
  }, [supabase])

  // Password strength checks
  const checks = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /[0-9]/.test(password),
    match:   password.length > 0 && password === confirm,
  }
  const allValid = Object.values(checks).every(Boolean)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!allValid) return
    setLoading(true); setError(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) { setError(updateError.message); return }
      setDone(true)
      // Sign out all other sessions, then redirect to login after 3s
      await supabase.auth.signOut({ scope: 'others' })
      setTimeout(() => router.replace('/login'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="a-page">
      <div className="a-bg" aria-hidden>
        <div className="a-blob a-blob-1" />
        <div className="a-blob a-blob-2" />
        <div className="a-blob a-blob-3" />
      </div>

      <div className="a-card">
        <div className="a-logo">
          <Image src="/images/logo.svg" alt="Stockifyy" width={160} height={44} style={{ objectFit: 'contain' }} />
        </div>

        {/* Loading — checking session */}
        {hasSession === null && (
          <div className="a-checking">
            <div className="a-spinner" />
            <p>Verifying reset link…</p>
          </div>
        )}

        {/* Invalid / expired link */}
        {hasSession === false && (
          <div className="a-invalid">
            <div className="a-invalid-icon"><AlertCircle size={40} strokeWidth={1.5} /></div>
            <h1 className="a-title">Link expired or invalid</h1>
            <p className="a-desc">
              This password reset link has expired or has already been used.
              Please request a new one.
            </p>
            <Link href="/forgot-password" className="a-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 8 }}>
              Request New Link
            </Link>
            <p className="a-switch" style={{ marginTop: 16 }}>
              <Link href="/login" className="a-back-link">Back to Sign In</Link>
            </p>
          </div>
        )}

        {/* Success */}
        {done && (
          <div className="a-success">
            <div className="a-success-icon"><CheckCircle size={40} strokeWidth={1.5} /></div>
            <h1 className="a-title">Password updated</h1>
            <p className="a-desc">
              Your password has been changed successfully. Redirecting you to sign in…
            </p>
            <Link href="/login" className="a-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 20 }}>
              Sign In Now
            </Link>
          </div>
        )}

        {/* Reset form */}
        {hasSession === true && !done && (
          <>
            <h1 className="a-title">Set new password</h1>
            <p className="a-desc">Choose a strong password for your account.</p>

            <form onSubmit={handleReset} className="a-form">
              {/* New password */}
              <div className="a-field">
                <label className="a-label">New Password</label>
                <div className="a-input-wrap">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="Min. 8 characters"
                    className="a-input" style={{ paddingRight: 42 }}
                    autoFocus
                  />
                  <button type="button" className="a-eye" onClick={() => setShowPw(p => !p)}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="a-field">
                <label className="a-label">Confirm Password</label>
                <div className="a-input-wrap">
                  <input
                    type={showCf ? 'text' : 'password'}
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    required placeholder="Re-enter new password"
                    className="a-input" style={{ paddingRight: 42 }}
                  />
                  <button type="button" className="a-eye" onClick={() => setShowCf(p => !p)}>
                    {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Strength checklist */}
              {password.length > 0 && (
                <div className="a-checks">
                  <Check ok={checks.length}  label="At least 8 characters" />
                  <Check ok={checks.upper}   label="At least one uppercase letter" />
                  <Check ok={checks.number}  label="At least one number" />
                  <Check ok={checks.match}   label="Passwords match" />
                </div>
              )}

              {error && <div className="a-error">{error}</div>}

              <button type="submit" disabled={loading || !allValid} className="a-submit">
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </>
        )}

        <div className="a-trust">
          <span>🔒 Secured by Supabase</span>
          <span>·</span>
          <span>PSX Live Data</span>
        </div>
      </div>

      <style>{`
        .a-page {
          min-height: 100vh; display: flex; align-items: center;
          justify-content: center; padding: 24px 16px;
          background-color: var(--bg-page); position: relative; overflow: hidden;
        }
        .a-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .a-blob { position: absolute; border-radius: 50%; filter: blur(80px); }
        .a-blob-1 { width: 750px; height: 750px; top: -300px; left: -200px;
          background: radial-gradient(circle, #FEA500AA 0%, #FEA50055 35%, transparent 65%); }
        .a-blob-2 { width: 650px; height: 650px; bottom: -250px; right: -180px;
          background: radial-gradient(circle, #FEA50099 0%, #FEA50044 35%, transparent 65%); }
        .a-blob-3 { width: 500px; height: 500px; top: 30%; left: 52%;
          background: radial-gradient(circle, #98630055 0%, transparent 60%); }

        .a-card {
          position: relative; z-index: 1; width: 100%; max-width: 420px;
          background: var(--bg-card); border: 1px solid var(--bg-border);
          padding: 40px 36px 32px; box-shadow: 0 8px 40px rgba(0,0,0,0.08);
        }
        .a-logo { display: flex; justify-content: center; margin-bottom: 28px; }
        .a-title {
          font-size: 18px; font-weight: 700; color: var(--text-primary);
          text-align: center; margin: 0 0 12px; letter-spacing: -.01em;
        }
        .a-desc {
          font-size: 13px; color: var(--text-muted); text-align: center;
          line-height: 1.6; margin: 0 0 24px;
        }

        .a-form { display: flex; flex-direction: column; gap: 16px; }
        .a-field { display: flex; flex-direction: column; gap: 6px; }
        .a-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); display: block; }

        .a-input-wrap { position: relative; }
        .a-input {
          width: 100%; padding: 10px 14px; background: var(--bg-page);
          border: 1px solid var(--bg-border); color: var(--text-primary);
          font-size: 14px; outline: none; transition: border-color .15s;
          font-family: inherit; box-sizing: border-box;
        }
        .a-input:focus { border-color: var(--brand); }
        .a-input::placeholder { color: var(--text-muted); }
        .a-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--text-muted);
          display: flex; align-items: center; padding: 0;
        }
        .a-eye:hover { color: var(--text-secondary); }

        /* Strength checks */
        .a-checks {
          background: var(--bg-hover); border: 1px solid var(--bg-border);
          padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;
        }

        .a-error {
          padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca;
          color: #dc2626; font-size: 13px; line-height: 1.5;
        }
        .dark .a-error { background: #1a0808; border-color: #7f1d1d; color: #f87171; }

        .a-submit {
          width: 100%; padding: 11px 16px; margin-top: 4px;
          background: linear-gradient(135deg, #FEA500, #986300);
          border: none; color: #fff; font-size: 14px; font-weight: 700;
          letter-spacing: .02em; cursor: pointer; transition: opacity .15s;
          font-family: inherit;
        }
        .a-submit:hover:not(:disabled) { opacity: .9; }
        .a-submit:disabled { opacity: .5; cursor: not-allowed; }

        .a-switch { text-align: center; font-size: 13px; color: var(--text-muted); }
        .a-back-link { color: var(--brand); font-weight: 500; text-decoration: none; }
        .a-back-link:hover { text-decoration: underline; }

        /* States */
        .a-checking { text-align: center; padding: 20px 0; color: var(--text-muted); font-size: 13px; }
        .a-spinner {
          width: 28px; height: 28px; border: 3px solid var(--bg-border);
          border-top-color: var(--brand); border-radius: 50%;
          animation: spin .7s linear infinite; margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .a-invalid { text-align: center; }
        .a-invalid-icon { color: #dc2626; display: flex; justify-content: center; margin-bottom: 16px; }

        .a-success { text-align: center; }
        .a-success-icon { color: #16a34a; display: flex; justify-content: center; margin-bottom: 16px; }

        .a-trust {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; margin-top: 20px; padding-top: 20px;
          border-top: 1px solid var(--bg-border); font-size: 11px; color: var(--text-muted);
        }

        @media (max-width: 480px) { .a-card { padding: 28px 20px 24px; } }
      `}</style>
    </div>
  )
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
      color: ok ? '#16a34a' : 'var(--text-muted)', transition: 'color .2s' }}>
      <span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
        background: ok ? '#16a34a' : 'var(--bg-border)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}>
        {ok && <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 4L3.2 5.8L6.5 2.2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>}
      </span>
      {label}
    </div>
  )
}
