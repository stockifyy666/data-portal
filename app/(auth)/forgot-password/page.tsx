'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [sent,    setSent]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const redirectTo = `${window.location.origin}/api/auth/callback?next=/reset-password`
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (authError) { setError(authError.message); return }
      setSent(true)
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

        {sent ? (
          /* ── Success state ── */
          <div className="a-success">
            <div className="a-success-icon">
              <CheckCircle size={40} strokeWidth={1.5} />
            </div>
            <h1 className="a-title">Check your email</h1>
            <p className="a-desc">
              We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
            </p>
            <p className="a-hint">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button className="a-inline-btn" onClick={() => setSent(false)}>try again</button>.
            </p>
            <Link href="/login" className="a-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 20 }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          /* ── Request form ── */
          <>
            <h1 className="a-title">Forgot your password?</h1>
            <p className="a-desc">
              Enter your account email and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="a-form">
              <div className="a-field">
                <label className="a-label">Email address</label>
                <div className="a-input-wrap">
                  <span className="a-input-icon"><Mail size={15} /></span>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="you@example.com"
                    className="a-input a-input-padded"
                    autoFocus
                  />
                </div>
              </div>

              {error && <div className="a-error">{error}</div>}

              <button type="submit" disabled={loading} className="a-submit">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p className="a-switch" style={{ marginTop: 20 }}>
              <Link href="/login" className="a-back-link">
                <ArrowLeft size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Back to Sign In
              </Link>
            </p>
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
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background-color: var(--bg-page);
          position: relative;
          overflow: hidden;
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
          position: relative; z-index: 1;
          width: 100%; max-width: 420px;
          background: var(--bg-card);
          border: 1px solid var(--bg-border);
          padding: 40px 36px 32px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.08);
        }
        .a-logo { display: flex; justify-content: center; margin-bottom: 28px; }

        .a-title {
          font-size: 18px; font-weight: 700;
          color: var(--text-primary);
          text-align: center; margin: 0 0 12px;
          letter-spacing: -.01em;
        }
        .a-desc {
          font-size: 13px; color: var(--text-muted);
          text-align: center; line-height: 1.6;
          margin: 0 0 24px;
        }
        .a-desc strong { color: var(--text-secondary); }

        .a-form { display: flex; flex-direction: column; gap: 16px; }
        .a-field { display: flex; flex-direction: column; gap: 6px; }
        .a-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); display: block; }

        .a-input-wrap { position: relative; }
        .a-input-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          display: flex; align-items: center;
          pointer-events: none;
        }
        .a-input {
          width: 100%; padding: 10px 14px;
          background: var(--bg-page); border: 1px solid var(--bg-border);
          color: var(--text-primary); font-size: 14px;
          outline: none; transition: border-color .15s;
          font-family: inherit; box-sizing: border-box;
        }
        .a-input-padded { padding-left: 38px; }
        .a-input:focus { border-color: var(--brand); }
        .a-input::placeholder { color: var(--text-muted); }

        .a-error {
          padding: 10px 14px;
          background: #fef2f2; border: 1px solid #fecaca;
          color: #dc2626; font-size: 13px; line-height: 1.5;
        }
        .dark .a-error { background: #1a0808; border-color: #7f1d1d; color: #f87171; }

        .a-submit {
          width: 100%; padding: 11px 16px; margin-top: 4px;
          background: linear-gradient(135deg, #FEA500, #986300);
          border: none; color: #fff;
          font-size: 14px; font-weight: 700; letter-spacing: .02em;
          cursor: pointer; transition: opacity .15s; font-family: inherit;
        }
        .a-submit:hover:not(:disabled) { opacity: .9; }
        .a-submit:disabled { opacity: .6; cursor: not-allowed; }

        .a-switch { text-align: center; font-size: 13px; color: var(--text-muted); }
        .a-back-link { color: var(--brand); font-weight: 500; text-decoration: none; display: inline-flex; align-items: center; }
        .a-back-link:hover { text-decoration: underline; }

        /* Success */
        .a-success { text-align: center; }
        .a-success-icon { color: #16a34a; display: flex; justify-content: center; margin-bottom: 16px; }
        .a-hint { font-size: 12px; color: var(--text-muted); margin-top: 12px; line-height: 1.6; }
        .a-inline-btn {
          background: none; border: none; padding: 0;
          color: var(--brand); font-size: 12px; font-weight: 500;
          cursor: pointer; text-decoration: underline; font-family: inherit;
        }

        .a-trust {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; margin-top: 20px; padding-top: 20px;
          border-top: 1px solid var(--bg-border);
          font-size: 11px; color: var(--text-muted);
        }

        @media (max-width: 480px) { .a-card { padding: 28px 20px 24px; } }
      `}</style>
    </div>
  )
}
