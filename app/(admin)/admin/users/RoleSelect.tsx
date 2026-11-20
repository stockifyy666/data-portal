'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'

const ROLES = ['user', 'admin', 'superadmin'] as const

export default function RoleSelect({ userId, currentRole, viewerRole }: {
  userId:      string
  currentRole: string
  viewerRole:  string
}) {
  const [role, setRole]  = useState(currentRole)
  const [pending, start] = useTransition()
  const router           = useRouter()

  const allowed = viewerRole === 'superadmin' ? ROLES : ROLES.filter(r => r !== 'superadmin')

  async function handleChange(newRole: string) {
    if (newRole === role) return
    start(async () => {
      const res = await fetch('/api/admin/users/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (res.ok) { setRole(newRole); router.refresh() }
    })
  }

  const styles: Record<string, { fg: string; bg: string; bd: string }> = {
    superadmin: { fg: '#FEA500', bg: 'rgba(254,165,0,0.12)',  bd: 'rgba(254,165,0,0.35)' },
    admin:      { fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)', bd: 'rgba(96,165,250,0.35)' },
    user:       { fg: 'var(--text-primary)', bg: 'var(--bg-hover)', bd: 'var(--bg-border)' },
  }
  const st = styles[role] ?? styles.user

  return (
    <select
      value={role}
      onChange={e => handleChange(e.target.value)}
      disabled={pending}
      aria-label="User role"
      className="capitalize"
      style={{
        background: st.bg, border: `1px solid ${st.bd}`, color: st.fg,
        fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
        cursor: pending ? 'wait' : 'pointer', outline: 'none', fontFamily: 'inherit',
        opacity: pending ? 0.6 : 1,
      }}
    >
      {allowed.map(r => (
        <option key={r} value={r} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{r}</option>
      ))}
    </select>
  )
}
