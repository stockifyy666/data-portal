'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mail, CheckCircle, Clock, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'

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
      toast.success('Reset link sent — check your inbox')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const backToLogin = (
    <p className="a-switch">
      <Link href="/login" className="a-link inline-flex items-center gap-1.5">
        <ArrowLeft size={14} /> Back to sign in
      </Link>
    </p>
  )

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="A password reset link is on its way." footer={backToLogin}>
        <div className="rounded-xl p-5 mb-5 flex gap-4"
          style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)' }}>
          <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(22,163,74,0.15)', color: '#16a34a' }}>
            <CheckCircle size={20} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Reset link sent</p>
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              We sent a link to <strong className="break-all" style={{ color: 'var(--text-primary)' }}>{email}</strong>.
              Open it to choose a new password.
            </p>
          </div>
        </div>

        <ul className="space-y-2 mb-6 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex gap-2"><Clock size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} /> The link expires after a short time, so use it soon.</li>
          <li className="flex gap-2"><Inbox size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} /> Not there? Check your spam or promotions folder.</li>
        </ul>

        <Link href="/login" className="a-submit flex items-center justify-center" style={{ textDecoration: 'none' }}>
          Back to sign in
        </Link>
        <button type="button" onClick={() => setSent(false)}
          className="w-full mt-3 text-[13px] font-semibold" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Didn&apos;t get it? <span style={{ color: 'var(--brand)' }}>Send again</span>
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send you a reset link."
      footer={backToLogin}>
      <form onSubmit={handleSubmit} className="a-form">
        <div className="a-field">
          <label className="a-label" htmlFor="fp-email">Email address</label>
          <div className="a-input-wrap">
            <span className="a-input-icon"><Mail size={16} /></span>
            <input id="fp-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus autoComplete="email" placeholder="you@example.com" className="a-input" />
          </div>
        </div>

        {error && <div className="a-error" role="alert">{error}</div>}

        <button type="submit" disabled={loading} className="a-submit">
          {loading ? 'Sending link…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  )
}
