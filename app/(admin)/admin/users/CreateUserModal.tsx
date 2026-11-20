'use client'

import { useEffect, useState } from 'react'
import { createPortal }        from 'react-dom'
import { useRouter }           from 'next/navigation'
import { X, UserPlus, Loader2, User, Mail, Lock, Eye, EyeOff, Wand2, ShieldCheck, Crown, Check } from 'lucide-react'

const ROLE_INFO: Record<string, { label: string; text: string; icon: typeof User; accent: string }> = {
  user:       { label: 'User',        text: 'Standard access to the market portal',     icon: User,        accent: '#94a3b8' },
  admin:      { label: 'Admin',       text: 'Manage users and view API usage',          icon: ShieldCheck, accent: '#60a5fa' },
  superadmin: { label: 'Superadmin',  text: 'Full control, including other admins',     icon: Crown,       accent: '#FEA500' },
}

const EMPTY = { email: '', password: '', full_name: '', role: 'user' }

// Random password with upper, lower, digits and a symbol (crypto-strength)
function generatePassword(len = 14) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%&*?']
  const all = sets.join('')
  const rnd = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n
  const chars = sets.map(s => s[rnd(s.length)])
  while (chars.length < len) chars.push(all[rnd(all.length)])
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]] }
  return chars.join('')
}

function strengthOf(pw: string) {
  if (!pw) return 0
  let s = pw.length >= 8 ? 1 : 0
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++
  return Math.max(1, s)
}
const STRENGTH = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['', '#ef4444', '#f59e0b', '#22c55e', '#16a34a']

export default function CreateUserModal({ viewerRole }: { viewerRole: string }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const router                = useRouter()

  const roles = viewerRole === 'superadmin' ? ['user', 'admin', 'superadmin'] : ['user', 'admin']
  const strength = strengthOf(form.password)

  function close() {
    if (loading) return
    setOpen(false); setError(''); setShowPw(false); setForm(EMPTY)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/users/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create user'); return }
      setOpen(false); setForm(EMPTY); setShowPw(false)
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const field = 'w-full h-11 rounded-xl pl-10 pr-3 text-sm outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(254,165,0,0.18)]'
  const fieldStyle: React.CSSProperties = { background: 'var(--bg-hover)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }
  const icon = 'absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none'

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-bold transition-transform hover:-translate-y-px"
        style={{ background: 'linear-gradient(135deg, #FEA500, #986300)', color: '#fff', boxShadow: '0 6px 18px rgba(152,99,0,0.3)' }}>
        <UserPlus size={15} /> Create User
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(2,6,23,0.65)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) close() }}
          role="dialog" aria-modal="true" aria-labelledby="create-user-title">
          <div className="w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--bg-border)' }}>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(254,165,0,0.14)', color: '#FEA500' }}>
                  <UserPlus size={19} />
                </span>
                <div>
                  <h2 id="create-user-title" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Create new user</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>The account is ready to sign in straight away.</p>
                </div>
              </div>
              <button onClick={close} aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="px-6 py-5 space-y-4 overflow-y-auto">
                {/* Name */}
                <div>
                  <label htmlFor="cu-name" className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Full name</label>
                  <div className="relative">
                    <User size={15} className={icon} style={{ color: 'var(--text-muted)' }} />
                    <input id="cu-name" className={field} style={fieldStyle} placeholder="e.g. Ali Khan" autoComplete="off"
                      value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="cu-email" className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Email address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className={icon} style={{ color: 'var(--text-muted)' }} />
                    <input id="cu-email" className={field} style={fieldStyle} type="email" required autoComplete="off"
                      placeholder="user@example.com"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="cu-pw" className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button type="button" onClick={() => { setForm(f => ({ ...f, password: generatePassword() })); setShowPw(true) }}
                      className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--brand)' }}>
                      <Wand2 size={12} /> Generate
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={15} className={icon} style={{ color: 'var(--text-muted)' }} />
                    <input id="cu-pw" className={`${field} pr-11 font-mono`} style={fieldStyle}
                      type={showPw ? 'text' : 'password'} required minLength={6} autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                    <button type="button" onClick={() => setShowPw(p => !p)} aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4].map(i => (
                          <span key={i} className="h-1 flex-1 rounded-full"
                            style={{ background: i <= strength ? STRENGTH_COLOR[strength] : 'var(--bg-border)' }} />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold w-12 text-right" style={{ color: STRENGTH_COLOR[strength] }}>{STRENGTH[strength]}</span>
                    </div>
                  )}
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Share it with the user securely — they can change it after signing in.</p>
                </div>

                {/* Role */}
                <div>
                  <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Role</p>
                  <div className={`grid gap-2 ${roles.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} role="radiogroup" aria-label="Role">
                    {roles.map(r => {
                      const info = ROLE_INFO[r]
                      const on = form.role === r
                      const Icon = info.icon
                      return (
                        <button key={r} type="button" role="radio" aria-checked={on}
                          onClick={() => setForm(f => ({ ...f, role: r }))}
                          className="relative text-left rounded-xl p-3 transition-colors"
                          style={{
                            background: on ? `${info.accent}14` : 'var(--bg-hover)',
                            border: `1.5px solid ${on ? info.accent : 'var(--bg-border)'}`,
                          }}>
                          {on && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ background: info.accent, color: '#0b1220' }}>
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                          <Icon size={16} style={{ color: info.accent }} />
                          <p className="text-[13px] font-bold mt-1.5" style={{ color: 'var(--text-primary)' }}>{info.label}</p>
                          <p className="text-[10.5px] leading-snug mt-0.5" style={{ color: 'var(--text-secondary)' }}>{info.text}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <div role="alert" className="text-[13px] rounded-xl px-3.5 py-2.5"
                    style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-2.5 px-6 py-4" style={{ borderTop: '1px solid var(--bg-border)', background: 'var(--bg-hover)' }}>
                <button type="button" onClick={close} disabled={loading}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 h-11 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #FEA500, #986300)', color: '#fff',
                           opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}>
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : <><UserPlus size={15} /> Create user</>}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
