import { cookies }            from 'next/headers'
import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'

export default async function AdminSettingsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  const role = session?.user?.app_metadata?.role as string | undefined
  if (!session || (role !== 'admin' && role !== 'superadmin')) redirect('/dashboard')

  const rows = [
    { label: 'Platform Name',       value: 'Stockifyy' },
    { label: 'Data Provider',       value: 'Capital Stake' },
    { label: 'Exchange',            value: 'Pakistan Stock Exchange (PSX)' },
    { label: 'API Request Limit',   value: '9,000 / day (hard cap)' },
    { label: 'Cache — Live Quotes', value: '5 minutes (Redis)' },
    { label: 'Cache — Financials',  value: '24 hours (Redis)' },
    { label: 'Auth Provider',       value: 'Supabase (Google + Email)' },
    { label: 'Deployment',          value: 'Vercel' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Platform configuration overview.</p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bg-border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Platform Info</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', gap: 16,
            borderBottom: i < rows.length - 1 ? '1px solid var(--bg-border)' : 'none',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>{r.label}</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{r.value}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(254,165,0,.07)', border: '1px solid rgba(254,165,0,.2)', borderRadius: 5, padding: '14px 20px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--brand)' }}>Note:</strong> Full settings management (maintenance mode, feature flags, email templates) will be added in the next phase.
        </div>
      </div>

    </div>
  )
}
