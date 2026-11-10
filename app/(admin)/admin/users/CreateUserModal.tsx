'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, UserPlus, Loader2 } from 'lucide-react'

export default function CreateUserModal({ viewerRole }: { viewerRole: string }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({ email: '', password: '', full_name: '', role: 'user' })
  const router                = useRouter()

  const roles = viewerRole === 'superadmin' ? ['user', 'admin', 'superadmin'] : ['user', 'admin']

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
      setOpen(false)
      setForm({ email: '', password: '', full_name: '', role: 'user' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 5,
    background: 'var(--bg-hover)', border: '1px solid var(--bg-border)',
    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '9px 16px', background: 'var(--brand)', border: 'none', borderRadius: 5,
        color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit',
      }}>
        <UserPlus size={15} />
        Create User
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5,
            width: '100%', maxWidth: 420, padding: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Create New User</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Full Name</label>
                <input style={inputStyle} placeholder="Ali Khan" value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Email *</label>
                <input style={inputStyle} type="email" placeholder="user@example.com" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Password *</label>
                <input style={inputStyle} type="password" placeholder="Min. 6 characters" required minLength={6} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Role</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {error && (
                <div style={{ fontSize: 12, color: '#dc2626', padding: '8px 12px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setOpen(false)} style={{
                  flex: 1, padding: '10px', background: 'var(--bg-hover)', border: '1px solid var(--bg-border)', borderRadius: 5,
                  color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{
                  flex: 1, padding: '10px', background: 'var(--brand)', border: 'none', borderRadius: 5,
                  color: '#000', fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: loading ? .7 : 1,
                }}>
                  {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
