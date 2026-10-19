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

  const colors: Record<string, string> = {
    superadmin: '#FEA500',
    admin:      '#60a5fa',
    user:       'var(--text-muted)',
  }

  return (
    <select
      value={role}
      onChange={e => handleChange(e.target.value)}
      disabled={pending}
      style={{
        background: 'var(--bg-hover)', border: '1px solid var(--bg-border)',
        color: colors[role] ?? 'var(--text-muted)',
        fontSize: 12, fontWeight: 600, padding: '3px 8px',
        cursor: pending ? 'wait' : 'pointer', outline: 'none', fontFamily: 'inherit',
      }}
    >
      {allowed.map(r => <option key={r} value={r}>{r}</option>)}
    </select>
  )
}
