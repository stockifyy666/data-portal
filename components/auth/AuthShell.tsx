'use client'

// Shared layout for login / register: a market-terminal brand panel (always
// dark, like a trading screen) beside a theme-aware form panel.
// The highlight boxes describe platform coverage, not live market data.

import Image from 'next/image'
import type { ReactNode } from 'react'
import { Sun, Moon, Activity, LayoutGrid, FileText, Star, ShieldCheck } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'

const FEATURES = [
  { icon: Activity,   title: 'Real-time market pulse',     text: 'Live prices, indices and top movers all day' },
  { icon: LayoutGrid, title: 'Sector intelligence',        text: 'Heatmaps, peers and index contributors' },
  { icon: FileText,   title: 'Deep fundamentals',          text: 'Financials, ratios, payouts and filings' },
  { icon: Star,       title: 'Personal watchlists',        text: 'Follow the companies that matter to you' },
]

// Coverage highlights (what the platform covers — not live market figures)
const HIGHLIGHTS = [
  { value: '500+',  label: 'Listed companies' },
  { value: '5',     label: 'PSX indices tracked' },
  { value: '30+',   label: 'Sectors analysed' },
  { value: 'Live',  label: 'During market hours' },
]
export function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: ReactNode; footer?: ReactNode
}) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="auth-root">
      {/* ── Brand / terminal panel ───────────────────────────────── */}
      <aside className="auth-brand" aria-hidden={false}>
        <div className="auth-glow" aria-hidden />

        <div className="relative z-10 flex flex-col h-full w-full max-w-[560px] mx-auto">
          <Image src="/images/logo.svg" alt="Stockifyy" width={150} height={42} style={{ objectFit: 'contain', objectPosition: 'left' }} priority />

          <div className="my-auto py-10">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#FEA500' }}>
              <span className="auth-dot" /> Pakistan Stock Exchange
            </p>
            <h2 className="mt-4 text-[34px] xl:text-[42px] font-extrabold leading-[1.1] tracking-tight text-white">
              Invest smarter.<br />
              <span style={{ background: 'linear-gradient(90deg,#FEA500,#ffd27a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                Grow your wealth.
              </span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed max-w-[480px]" style={{ color: '#a3b0c2' }}>
              Live PSX prices, sector insights and company fundamentals —
              everything you need to make confident investment decisions, in one place.
            </p>

            {/* Glass highlight boxes */}
            <div className="mt-9 grid grid-cols-2 xl:grid-cols-4 gap-3">
              {HIGHLIGHTS.map(h => (
                <div key={h.label} className="auth-glass px-4 py-3.5">
                  <p className="text-[22px] font-extrabold leading-none text-white tabular-nums">{h.value}</p>
                  <p className="text-[11px] font-medium mt-1.5 leading-snug" style={{ color: '#9fb0c6' }}>{h.label}</p>
                </div>
              ))}
            </div>

            {/* Features as glass cards */}
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <li key={f.title} className="auth-glass flex gap-3 p-4">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(254,165,0,0.14)', color: '#FEA500', border: '1px solid rgba(254,165,0,0.25)' }}>
                    <f.icon size={17} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{f.title}</span>
                    <span className="block text-xs leading-relaxed mt-0.5" style={{ color: '#8b98ab' }}>{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px]" style={{ color: '#64748b' }}>
            Market data provided by Capital Stake. For information only — not investment advice.
          </p>
        </div>
      </aside>

      {/* ── Form panel ───────────────────────────────────────────── */}
      <main className="auth-form-side">
        <div className="flex items-center justify-between w-full max-w-[420px] mx-auto">
          <span className="lg:hidden">
            <Image src="/images/logo.svg" alt="Stockifyy" width={130} height={36} style={{ objectFit: 'contain' }} priority />
          </span>
          <button type="button" onClick={toggle} className="auth-theme ml-auto"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>

        <div className="flex-1 flex items-center w-full">
          <div className="w-full max-w-[420px] mx-auto py-8">
            <h1 className="text-[26px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h1>
            <p className="mt-1.5 mb-7 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
            {children}
            {footer}
          </div>
        </div>

        <p className="w-full max-w-[420px] mx-auto flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <ShieldCheck size={12} /> Encrypted sign-in · Your data stays private
        </p>
      </main>

      <style>{AUTH_CSS}</style>
    </div>
  )
}

// Styles shared by the auth pages (form controls use theme tokens)
const AUTH_CSS = `
.auth-root { min-height: 100vh; display: grid; grid-template-columns: 1fr; background: var(--bg-page); }
@media (min-width: 1024px) { .auth-root { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }

.auth-brand { display: none; position: relative; overflow: hidden; padding: 40px 56px;
  background: radial-gradient(1200px 600px at 10% -10%, #1b2a44 0%, transparent 60%), linear-gradient(160deg, #0b1220 0%, #0f1a2e 55%, #0a101c 100%);
  border-right: 1px solid rgba(148,163,184,0.12); }
@media (min-width: 1024px) { .auth-brand { display: block; } }
.auth-glow { position: absolute; width: 520px; height: 520px; right: -160px; bottom: -180px; border-radius: 50%;
  background: radial-gradient(circle, rgba(254,165,0,0.10), transparent 65%); filter: blur(40px); }
.auth-glass { border-radius: 14px; background: linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.10); backdrop-filter: blur(14px) saturate(160%); -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: 0 10px 30px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08); transition: border-color .2s, transform .2s; }
.auth-glass:hover { border-color: rgba(254,165,0,0.35); transform: translateY(-1px); }
.auth-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.25); }

.auth-form-side { display: flex; flex-direction: column; align-items: center; padding: 24px 20px; min-height: 100vh; background: var(--bg-card); }
@media (min-width: 640px) { .auth-form-side { padding: 32px 40px; } }

.auth-theme { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 6px 12px;
  border-radius: 999px; border: 1px solid var(--bg-border); background: var(--bg-hover); color: var(--text-secondary); cursor: pointer; }
.auth-theme:hover { color: var(--text-primary); border-color: var(--brand); }

/* Form controls */
.a-form { display: flex; flex-direction: column; gap: 16px; }
.a-field { display: flex; flex-direction: column; gap: 6px; }
.a-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.a-input-wrap { position: relative; }
.a-input-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; display: flex; }
.a-input { width: 100%; height: 46px; padding: 0 14px 0 40px; border-radius: 12px; background: var(--bg-page);
  border: 1px solid var(--bg-border); color: var(--text-primary); font-size: 14px; outline: none; font-family: inherit;
  box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
.a-input:focus { border-color: var(--brand); box-shadow: 0 0 0 4px rgba(254,165,0,0.14); }
.a-input::placeholder { color: var(--text-muted); }
.a-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none;
  cursor: pointer; color: var(--text-muted); display: flex; padding: 4px; }
.a-eye:hover { color: var(--text-primary); }
.a-forgot { font-size: 12px; color: var(--brand); text-decoration: none; font-weight: 600; }
.a-forgot:hover { text-decoration: underline; }

.a-google { width: 100%; height: 46px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--bg-border);
  color: var(--text-primary); font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center;
  justify-content: center; gap: 10px; transition: border-color .15s, background .15s; font-family: inherit; }
.a-google:hover:not(:disabled) { border-color: var(--brand); background: var(--bg-hover); }
.a-google:disabled { opacity: .6; cursor: not-allowed; }

.a-divider { display: flex; align-items: center; gap: 12px; margin: 22px 0; }
.a-divider-line { flex: 1; height: 1px; background: var(--bg-border); }
.a-divider-text { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); white-space: nowrap; }

.a-error { padding: 10px 14px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 13px; line-height: 1.5; }
.dark .a-error { background: rgba(127,29,29,0.25); border-color: #7f1d1d; color: #fca5a5; }

.a-submit { width: 100%; height: 48px; margin-top: 4px; border-radius: 12px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #FEA500 0%, #986300 100%); color: #ffffff; text-shadow: 0 1px 1px rgba(0,0,0,0.25); font-size: 15px; font-weight: 800;
  letter-spacing: .01em; font-family: inherit; box-shadow: 0 8px 22px rgba(152,99,0,0.35); transition: transform .15s, box-shadow .15s, opacity .15s; }
.a-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(152,99,0,0.45); }
.a-submit:disabled { opacity: .6; cursor: not-allowed; transform: none; }

.a-switch { text-align: center; font-size: 13px; color: var(--text-secondary); margin-top: 22px; }
.a-link { color: var(--brand); font-weight: 700; text-decoration: none; }
.a-link:hover { text-decoration: underline; }
.a-tos { font-size: 11px; color: var(--text-muted); text-align: center; line-height: 1.6; margin: 0; }
`
