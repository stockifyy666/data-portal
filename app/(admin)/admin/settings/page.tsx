import { cookies }            from 'next/headers'
import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import {
  Building2, Database, Clock, ShieldCheck, Server, KeyRound, CheckCircle2, XCircle, FileWarning, User,
} from 'lucide-react'
import { isPSXOpen } from '@/lib/utils/marketHours'

export const dynamic = 'force-dynamic'

type Row = { label: string; value: string; hint?: string }

const SECTIONS: { title: string; icon: typeof Building2; accent: string; rows: Row[] }[] = [
  {
    title: 'Platform', icon: Building2, accent: '#FEA500',
    rows: [
      { label: 'Platform name', value: 'Stockifyy' },
      { label: 'Exchange',      value: 'Pakistan Stock Exchange (PSX)' },
      { label: 'Trading hours', value: 'Mon–Fri 9:30 AM – 3:30 PM PKT', hint: 'Friday break 12:00 – 2:30 PM' },
      { label: 'Data provider', value: 'Capital Stake (UAT API)' },
    ],
  },
  {
    title: 'Data contract limits', icon: FileWarning, accent: '#ef4444',
    rows: [
      { label: 'Daily request limit', value: '10,000 requests / day' },
      { label: 'Overage charge',      value: 'PKR 10 per extra request' },
      { label: 'Rate limit',          value: '5 requests / second', hint: 'Syncs run at 4 / second' },
      { label: 'Live connections',    value: 'Max 3 WebSockets' },
      { label: 'Usage terms',         value: 'Attribution required · no export · no AI training' },
    ],
  },
  {
    title: 'Refresh schedule', icon: Clock, accent: '#3b82f6',
    rows: [
      { label: 'Prices, tickers, indices', value: 'Every 1 min while open', hint: 'No calls after close — last prices held' },
      { label: 'General news + announcements', value: 'Every hour' },
      { label: 'Sector news',               value: 'Every 2 hours', hint: 'Company news filtered from sector feeds' },
      { label: 'Financials + fundamentals', value: 'Daily, 12:05 – 1:50 AM PKT' },
      { label: 'Profiles + shareholders',   value: 'Weekly, Sunday 2:05 – 3:50 AM PKT' },
    ],
  },
  {
    title: 'Storage & caching', icon: Database, accent: '#10b981',
    rows: [
      { label: 'Live prices',           value: 'Upstash Redis', hint: '60 s while open, until next open after close' },
      { label: 'Financials',            value: 'Supabase · kept 24 h' },
      { label: 'Profiles, shareholders', value: 'Supabase · kept 7 days' },
      { label: 'News, announcements',   value: 'Supabase · refreshed by sync' },
    ],
  },
  {
    title: 'Authentication', icon: ShieldCheck, accent: '#8b5cf6',
    rows: [
      { label: 'Provider',   value: 'Supabase Auth' },
      { label: 'Sign-in methods', value: 'Email · Google · Facebook', hint: 'Facebook must be enabled in Supabase' },
      { label: 'Roles',      value: 'User · Admin · Superadmin' },
      { label: 'Database access', value: 'Row-level security on all tables' },
    ],
  },
  {
    title: 'Infrastructure', icon: Server, accent: '#06b6d4',
    rows: [
      { label: 'Hosting',   value: 'Vercel (Pro)' },
      { label: 'Framework', value: 'Next.js 14 · App Router' },
      { label: 'Scheduled jobs', value: 'Vercel Cron · 4 sync jobs' },
    ],
  },
]

// Required production configuration. Only presence is checked — values are never shown.
const ENV_CHECKS: { key: string; label: string }[] = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL',         label: 'Supabase URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',    label: 'Supabase public key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY',        label: 'Supabase server key' },
  { key: 'CAPITAL_STAKE_CHART_BEARER_TOKEN', label: 'Capital Stake API token' },
  { key: 'CAPITAL_STAKE_CHART_BASE_URL',     label: 'Capital Stake API URL' },
  { key: 'UPSTASH_REDIS_REST_URL',           label: 'Redis URL' },
  { key: 'UPSTASH_REDIS_REST_TOKEN',         label: 'Redis token' },
  { key: 'CRON_SECRET',                      label: 'Cron secret (sync jobs)' },
  { key: 'NEXT_PUBLIC_APP_URL',              label: 'Public site URL' },
]

export default async function AdminSettingsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined
  if (!user || (role !== 'admin' && role !== 'superadmin')) redirect('/dashboard')

  const env = ENV_CHECKS.map(c => ({ ...c, ok: !!process.env[c.key]?.trim() }))
  const envOk = env.filter(e => e.ok).length
  const allOk = envOk === env.length
  const open  = isPSXOpen()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const localUrl = /localhost|127\.0\.0\.1/.test(appUrl)

  const card = { background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>Platform configuration, data rules and system health.</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg" style={card}>
          <span className="w-2 h-2 rounded-full" style={{ background: open ? '#22c55e' : '#94a3b8' }} />
          <span style={{ color: 'var(--text-secondary)' }}>PSX market {open ? 'open' : 'closed'}</span>
        </span>
      </div>

      {/* Top row: account + configuration health */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {/* Signed-in admin */}
        <div className="rounded-xl p-5" style={card}>
          <div className="flex items-center gap-2 mb-4">
            <User size={16} style={{ color: '#FEA500' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Your account</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'rgba(254,165,0,0.15)', color: '#FEA500', border: '1px solid rgba(254,165,0,0.35)' }}>
              {(user.email ?? '?').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {(user.user_metadata?.full_name as string) || user.email}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
              <span className="inline-block mt-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize"
                style={role === 'superadmin'
                  ? { background: 'rgba(254,165,0,0.14)', color: '#FEA500', border: '1px solid rgba(254,165,0,0.35)' }
                  : { background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                {role}
              </span>
            </div>
          </div>
          <p className="text-xs mt-4 pt-4" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--bg-border)' }}>
            Last signed in {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) : '—'}
          </p>
        </div>

        {/* Configuration health */}
        <div className="rounded-xl p-5" style={card}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <KeyRound size={16} style={{ color: allOk ? '#22c55e' : '#f59e0b' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Configuration health</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={allOk
                ? { color: '#22c55e', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }
                : { color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
              {envOk} / {env.length} set
            </span>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {env.map(e => (
              <li key={e.key} className="flex items-center gap-2 text-[13px] min-w-0">
                {e.ok
                  ? <CheckCircle2 size={15} className="shrink-0" style={{ color: '#22c55e' }} />
                  : <XCircle size={15} className="shrink-0" style={{ color: '#ef4444' }} />}
                <span className="truncate" style={{ color: e.ok ? 'var(--text-primary)' : '#ef4444' }} title={e.key}>{e.label}</span>
              </li>
            ))}
          </ul>
          {localUrl && (
            <p className="text-xs mt-3" style={{ color: '#f59e0b' }}>
              Public site URL points to localhost — set it to your live domain in production.
            </p>
          )}
          <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
            Only checks that each variable is present — values are never displayed.
          </p>
        </div>
      </div>

      {/* Info sections */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map(sec => (
          <section key={sec.title} className="rounded-xl overflow-hidden" style={card}>
            <header className="flex items-center gap-2.5 px-4 py-3"
              style={{ background: `linear-gradient(90deg, ${sec.accent}14, transparent 80%)`, borderBottom: '1px solid var(--bg-border)' }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${sec.accent}22`, color: sec.accent }}>
                <sec.icon size={14} />
              </span>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{sec.title}</h2>
            </header>
            <dl>
              {sec.rows.map((r, i) => (
                <div key={r.label} className="px-4 py-2.5" style={{ borderTop: i ? '1px solid var(--bg-border)' : 'none' }}>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-xs shrink-0 pt-px" style={{ color: 'var(--text-secondary)' }}>{r.label}</dt>
                    <dd className="text-[13px] font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{r.value}</dd>
                  </div>
                  {r.hint && <p className="text-[11px] text-right mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.hint}</p>}
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  )
}
