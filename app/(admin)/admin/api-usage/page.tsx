import { cookies }            from 'next/headers'
import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { getCSAPIUsage }      from '@/lib/utils/rateLimit'
import { createServiceClient } from '@/lib/supabase/service'
import { Activity, Zap, Clock, AlertTriangle, CheckCircle, Database } from 'lucide-react'

export const revalidate = 0

export default async function APIUsagePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!user || (role !== 'admin' && role !== 'superadmin')) redirect('/dashboard')

  const usage = await getCSAPIUsage()

  const pct         = Math.min(100, (usage.used / 10_000) * 100)
  const resetHours  = Math.floor(usage.resetIn / 3600)
  const resetMins   = Math.floor((usage.resetIn % 3600) / 60)
  const isWarning   = usage.used >= 8_000
  const isDanger    = usage.used >= 10_000

  const barColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e'
  const statusColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e'
  const statusLabel = isDanger ? 'Limit Exceeded' : isWarning ? 'Near Limit' : 'Healthy'
  const StatusIcon  = isDanger ? AlertTriangle : isWarning ? AlertTriangle : CheckCircle

  // Count rows in financial_statements and stock_content
  const db = createServiceClient()
  const [{ count: fsCount }, { count: scCount }] = await Promise.all([
    db.from('financial_statements').select('*', { count: 'exact', head: true }),
    db.from('stock_content').select('*', { count: 'exact', head: true }),
  ])

  const cacheStats = [
    { label: 'Financial Statements', value: fsCount ?? 0, sub: 'income · balance · cashflow · fundamentals · shareholders' },
    { label: 'Stock Content',        value: scCount ?? 0, sub: 'profiles · news · announcements · general news' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>API Usage</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Capital Stake UAT API — 10,000 requests/day · PKR 10 per overage request
        </p>
      </div>

      {/* Main usage card */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
        borderRadius: 5, padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={18} color="#FEA500" />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Daily Request Count</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600,
            color: statusColor,
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}30`,
            padding: '4px 10px', borderRadius: 4,
          }}>
            <StatusIcon size={13} />
            {statusLabel}
          </div>
        </div>

        {/* Big number */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 48, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {usage.used.toLocaleString()}
          </span>
          <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>/ 10,000</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 10, background: 'var(--bg-hover)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: barColor,
            borderRadius: 99,
            transition: 'width .3s',
          }} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Stat icon={Activity} label="Used today"   value={usage.used.toLocaleString()} color="#FEA500" />
          <Stat icon={CheckCircle} label="Remaining" value={usage.remaining.toLocaleString()} color="#22c55e" />
          <Stat icon={Clock} label="Resets in"       value={`${resetHours}h ${resetMins}m`} color="#60a5fa" />
          {isDanger && (
            <Stat icon={AlertTriangle} label="Overage cost"
              value={`PKR ${((usage.used - 10_000) * 10).toLocaleString()}`} color="#ef4444" />
          )}
        </div>
      </div>

      {/* Supabase cache stats */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Database size={15} color="var(--text-muted)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Supabase Cache</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>rows stored — served free, no CS API calls</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {cacheStats.map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
              borderRadius: 5, padding: '20px 24px',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 6 }}>
                {s.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div style={{
        background: 'rgba(254,165,0,.06)', border: '1px solid rgba(254,165,0,.2)',
        borderRadius: 5, padding: '14px 18px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
      }}>
        <strong style={{ color: '#FEA500' }}>How it works:</strong> Every Capital Stake API call increments this counter in Redis with a 24-hour rolling window.
        Market quotes reset automatically every 1–15 min via Redis cache — users never trigger duplicate calls within the TTL window.
        Supabase stores financial statements (24h), profiles &amp; shareholders (7 days) so repeat visits cost zero CS calls.
      </div>

    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 4, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
    </div>
  )
}
