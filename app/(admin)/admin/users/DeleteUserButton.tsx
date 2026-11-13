'use client'

import { useState } from 'react'
import { Trash2, X, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  userId:     string
  userEmail:  string
  viewerRole: string
  targetRole: string
  viewerId:   string
}

export default function DeleteUserButton({ userId, userEmail, viewerRole, targetRole, viewerId }: Props) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const router = useRouter()

  // Can't delete yourself or a superadmin unless you are superadmin
  if (userId === viewerId) return null
  if (targetRole === 'superadmin' && viewerRole !== 'superadmin') return null

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users/delete', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to delete'); setLoading(false); return }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Delete user"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
          color: 'var(--text-muted)', borderRadius: 4, transition: 'color .15s, background .15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'none' }}
      >
        <Trash2 size={14} />
      </button>

      {/* Confirmation modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }} onClick={() => !loading && setOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
              borderRadius: 8, padding: 28, width: '100%', maxWidth: 420,
              display: 'flex', flexDirection: 'column', gap: 20,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Delete User</span>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Are you sure you want to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong>?
              <br /><br />
              <span style={{ color: '#ef4444', fontWeight: 500 }}>This cannot be undone.</span> All their data, watchlists and portfolio will be removed.
            </div>

            {error && (
              <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 4, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                style={{
                  padding: '8px 18px', borderRadius: 5, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: 'var(--bg-hover)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{
                  padding: '8px 18px', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? 'rgba(239,68,68,.5)' : '#ef4444', border: 'none', color: 'white',
                  opacity: loading ? .7 : 1,
                }}
              >
                {loading ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
