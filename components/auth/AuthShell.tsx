'use client'

// Shared layout for login / register: a market-terminal brand panel (always
// dark, like a trading screen) beside a theme-aware form panel.
// The fundamentals snapshot on the left is decorative, with illustrative figures.

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import SymbolLogo from '@/components/ui/SymbolLogo'
import { Activity, LayoutGrid, FileText, Star, ShieldCheck } from 'lucide-react'

const FEATURES = [
  { icon: Activity,   title: 'Live PSX Market Data',      text: 'Prices, indices and movers through the trading day' },
  { icon: LayoutGrid, title: 'Sector & Index Analytics',  text: 'Heatmaps, sector weights and index contributors' },
  { icon: FileText,   title: 'Fundamentals & Filings',    text: 'Ratios, financial statements and announcements' },
  { icon: Star,       title: 'Watchlists',                text: 'Track the companies you follow in one place' },
]

// Fundamentals snapshot — real figures from the stored annual fundamentals
// (Supabase "fundamentals" table, annual: TTM + last two fiscal years). Update when refreshed.
type Snap = {
  sym: string; name: string; sector: string; fyPrev: string; fyCur: string
  ratios: { k: string; v: string; s: string; good: boolean }[]
  rows: { k: string; a: string; b: string; g: string; up: boolean }[]
}
const SNAPS: Snap[] = [
  {
    sym: 'FFC', name: 'Fauji Fertilizer Company Ltd', sector: 'Fertilizer', fyPrev: 'FY2024', fyCur: 'FY2025',
    ratios: [
      { k: 'P/E (TTM)',    v: '9.70x',  s: 'FY2025 11.43x',   good: true },
      { k: 'P/B (TTM)',    v: '5.04x',  s: 'FY2025 6.20x',    good: true },
      { k: 'EPS (TTM)',    v: '55.78',  s: '+7.9% vs FY2025', good: true },
      { k: 'Net Margin',   v: '16.8%',  s: 'FY2025 17.0%',    good: false },
      { k: 'Div Yield',    v: '9.24%',  s: 'DPS Rs 50.0',     good: true },
      { k: 'LT Debt / Eq', v: '0.47x',  s: 'FY2025 0.37x',    good: false },
    ],
    rows: [
      { k: 'Revenue',    a: '373,537', b: '432,410', g: '+15.8%', up: true },
      { k: 'Net Profit', a: '64,731',  b: '73,564',  g: '+13.6%', up: true },
    ],
  },
  {
    sym: 'LUCK', name: 'Lucky Cement Ltd', sector: 'Cement', fyPrev: 'FY2025', fyCur: 'FY2026',
    ratios: [
      { k: 'P/E (TTM)',    v: '12.38x', s: 'FY2026 14.75x',   good: true },
      { k: 'P/B (TTM)',    v: '2.69x',  s: 'FY2026 3.17x',    good: true },
      { k: 'EPS (TTM)',    v: '33.54',  s: '+5.4% vs FY2026', good: true },
      { k: 'Net Margin',   v: '34.2%',  s: 'FY2026 34.2%',    good: true },
      { k: 'Div Yield',    v: '1.20%',  s: 'DPS Rs 5.0',      good: false },
      { k: 'LT Debt / Eq', v: '0.03x',  s: 'FY2026 0.03x',    good: true },
    ],
    rows: [
      { k: 'Revenue',    a: '124,512', b: '136,527', g: '+9.6%',  up: true },
      { k: 'Net Profit', a: '33,092',  b: '46,629',  g: '+40.9%', up: true },
    ],
  },
  {
    sym: 'MARI', name: 'Mari Energies Ltd', sector: 'Oil & Gas Exploration', fyPrev: 'FY2025', fyCur: 'FY2026',
    ratios: [
      { k: 'P/E (TTM)',    v: '8.16x',  s: 'FY2026 9.30x',    good: true },
      { k: 'P/B (TTM)',    v: '2.36x',  s: 'FY2026 2.51x',    good: true },
      { k: 'EPS (TTM)',    v: '77.62',  s: '+7.0% vs FY2026', good: true },
      { k: 'Net Margin',   v: '46.0%',  s: 'FY2026 45.4%',    good: true },
      { k: 'Div Yield',    v: '4.26%',  s: 'DPS Rs 27.0',     good: true },
      { k: 'LT Debt / Eq', v: '0.00x',  s: 'Debt-free',       good: true },
    ],
    rows: [
      { k: 'Revenue',    a: '177,097', b: '191,663', g: '+8.2%',  up: true },
      { k: 'Net Profit', a: '65,136',  b: '87,069',  g: '+33.7%', up: true },
    ],
  },
  {
    sym: 'MEBL', name: 'Meezan Bank Ltd', sector: 'Commercial Banks', fyPrev: 'FY2024', fyCur: 'FY2025',
    ratios: [
      { k: 'P/E (TTM)',    v: '10.40x', s: 'FY2025 8.97x',    good: false },
      { k: 'P/B (TTM)',    v: '3.37x',  s: 'FY2025 2.86x',    good: false },
      { k: 'EPS (TTM)',    v: '53.35',  s: '+7.7% vs FY2025', good: true },
      { k: 'Net Margin',   v: '20.9%',  s: 'FY2025 21.2%',    good: false },
      { k: 'Div Yield',    v: '5.50%',  s: 'DPS Rs 30.5',     good: true },
      { k: 'LT Debt / Eq', v: '—',      s: 'N/A for banks',   good: false },
    ],
    rows: [
      { k: 'Revenue',    a: '494,297', b: '420,462', g: '−14.9%', up: false },
      { k: 'Net Profit', a: '101,508', b: '89,041',  g: '−12.3%', up: false },
    ],
  },
]

function FundamentalsCard() {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  // Auto-rotate through the companies every 5 s (pauses on hover)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIdx(i => (i + 1) % SNAPS.length), 5000)
    return () => clearInterval(t)
  }, [paused])
  const c = SNAPS[idx]

  return (
    <div className="auth-glass-wrap mt-5" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <span className="auth-orb o1" aria-hidden /><span className="auth-orb o2" aria-hidden />
      <div className="auth-glass-card rounded-2xl overflow-hidden">
        {/* Header: company identity + period */}
        <div key={`h-${c.sym}`} className="auth-swap flex items-center justify-between gap-3 px-5 pt-4 pb-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="flex items-center gap-2.5 min-w-0">
            <SymbolLogo symbol={c.sym} size={36} />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-[13px] font-extrabold text-white">{c.sym}</span>
                <span className="text-[9px] font-bold px-1.5 py-[1px] rounded" style={{ background: 'rgba(148,163,184,0.15)', color: '#a3b0c2' }}>KSE-100</span>
              </span>
              <span className="block text-[10.5px] truncate" style={{ color: '#8b98ab' }}>{c.name} · {c.sector}</span>
            </span>
          </span>
          <span className="text-right shrink-0">
            <span className="block text-[12px] font-extrabold text-white">Annual</span>
            <span className="block text-[10.5px] font-semibold" style={{ color: '#a3b0c2' }}>TTM · {c.fyCur}</span>
          </span>
        </div>

        {/* Company switcher */}
        <div className="flex items-center gap-1.5 px-5 pt-3">
          {SNAPS.map((s, i) => (
            <button key={s.sym} type="button" onClick={() => setIdx(i)}
              className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[10.5px] font-bold transition-colors"
              style={i === idx
                ? { background: 'rgba(254,165,0,0.16)', color: '#FEA500', border: '1px solid rgba(254,165,0,0.45)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#a3b0c2', border: '1px solid rgba(255,255,255,0.08)' }}>
              <SymbolLogo symbol={s.sym} size={18} />{s.sym}
            </button>
          ))}
        </div>

        <div key={`b-${c.sym}`} className="auth-swap px-5 pt-3 pb-4">
          {/* Ratio tiles */}
          <div className="grid grid-cols-3 gap-2">
            {c.ratios.map((r, i) => (
              <div key={r.k} className="auth-tile rounded-lg px-3 py-2.5" style={{ animationDelay: `${i * 0.5}s` }}>
                <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: '#7b8aa0' }}>{r.k}</p>
                <p className="text-[14.5px] font-extrabold text-white tabular-nums leading-tight mt-0.5">{r.v}</p>
                <p className="text-[9.5px] font-medium mt-0.5" style={{ color: r.good ? '#4ade80' : '#94a3b8' }}>{r.s}</p>
              </div>
            ))}
          </div>

          {/* Mini income statement: previous vs current fiscal year */}
          <div className="mt-4 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-wider"
              style={{ color: '#7b8aa0', background: 'rgba(255,255,255,0.03)' }}>
              <span>PKR Mn</span><span className="text-right">{c.fyPrev}</span><span className="text-right" style={{ color: '#FEA500' }}>{c.fyCur}</span><span className="text-right">YoY</span>
            </div>
            {c.rows.map(r => (
              <div key={r.k} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 px-3 py-[7px] text-[11px] tabular-nums"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#cbd5e1' }}>{r.k}</span>
                <span className="text-right" style={{ color: '#8b98ab' }}>{r.a}</span>
                <span className="text-right font-semibold text-white">{r.b}</span>
                <span className="text-right font-bold" style={{ color: r.up ? '#4ade80' : '#f87171' }}>{r.g}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-2.5 text-[9.5px]" style={{ color: '#a3b0c2' }}>
            <span>Annual accounts · PKR Mn</span>
            <span>Source: company filings</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Scale a panel's content down (CSS zoom) just enough to fit the visible height,
// so nothing is cut off on short screens or when the browser is zoomed in.
function useFitToHeight() {
  const brandRef = useRef<HTMLElement>(null)
  const brandInner = useRef<HTMLDivElement>(null)
  const formSide = useRef<HTMLElement>(null)
  const formCard = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fit = () => {
      const desktop = window.matchMedia('(min-width: 1024px)').matches
      const b = brandRef.current, bi = brandInner.current
      if (b && bi) {
        bi.style.zoom = '1'; bi.style.height = 'auto'
        const cs = getComputedStyle(b)
        const avail = b.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
        const need = bi.scrollHeight
        const z = desktop && need > avail ? Math.max(0.4, avail / need) : 1
        bi.style.zoom = String(z)
        bi.style.height = z < 1 ? (avail / z) + 'px' : ''
      }
      const m = formSide.current, c = formCard.current
      if (m && c) {
        c.style.zoom = '1'
        const over = m.scrollHeight - m.clientHeight
        const h = c.offsetHeight
        c.style.zoom = String(desktop && over > 0 && h > 0 ? Math.max(0.4, (h - over - 4) / h) : 1)
      }
    }
    fit()
    window.addEventListener('resize', fit)
    const t = setTimeout(fit, 300) // after fonts/images settle
    return () => { window.removeEventListener('resize', fit); clearTimeout(t) }
  }, [])
  return { brandRef, brandInner, formSide, formCard }
}

export function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: ReactNode; footer?: ReactNode
}) {
  const { brandRef, brandInner, formSide, formCard } = useFitToHeight()

  return (
    <div className="auth-root">
      {/* ── Brand / terminal panel ───────────────────────────────── */}
      <aside ref={brandRef} className="auth-brand" aria-hidden={false}>
        <div className="auth-glow" aria-hidden />

        <div ref={brandInner} className="relative z-10 flex flex-col h-full w-full max-w-[560px] mx-auto">
          <Image src="/images/logo.svg" alt="Stockifyy" width={150} height={42} style={{ objectFit: 'contain', objectPosition: 'left' }} priority />

          <div className="my-auto py-2">
            <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
              Pakistan Stock Exchange · KSE-100 · KMI-30
            </p>
            <h2 className="mt-3 text-[30px] xl:text-[34px] font-extrabold leading-[1.12] tracking-tight text-white">
              Invest with clarity.<br />
              <span style={{ background: 'linear-gradient(90deg,#FEA500,#ffd27a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                Act with confidence.
              </span>
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: '#a3b0c2' }}>
              Real-time PSX data, in-depth company research and sector trends,
              all on one powerful platform built for Pakistan&apos;s investors.
            </p>

            {/* Fundamentals snapshot (illustrative) */}
            <FundamentalsCard />

            {/* Features: plain two-column list */}
            <ul className="mt-4 grid grid-cols-2 gap-2.5">
              {FEATURES.map(f => (
                <li key={f.title} className="auth-feature flex gap-3 px-4 py-3 rounded-xl">
                  <f.icon size={18} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: '#FEA500' }} />
                  <span>
                    <span className="block text-[13px] font-semibold text-white">{f.title}</span>
                    <span className="block text-[11px] leading-relaxed mt-0.5" style={{ color: '#8b98ab' }}>{f.text}</span>
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
      <main ref={formSide} className="auth-form-side">
        <div className="flex items-center justify-between w-full max-w-[420px] mx-auto">
          <span className="lg:hidden">
            <Image src="/images/logo.svg" alt="Stockifyy" width={130} height={36} style={{ objectFit: 'contain' }} priority />
          </span>
        </div>

        <div className="flex-1 flex items-center w-full">
          <div ref={formCard} className="w-full max-w-[420px] mx-auto py-8">
            <h1 className="text-[26px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h1>
            <p className="mt-1.5 mb-7 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
            {children}
            {footer}
          </div>
        </div>

        <p className="w-full max-w-[420px] mx-auto flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <ShieldCheck size={12} /> Secure sign-in · Your data is protected and private
        </p>
      </main>

      {/* Raw CSS via innerHTML: as a text child React escapes quotes differently on
          the server and the client, which caused a hydration mismatch. */}
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />
    </div>
  )
}

// Styles shared by the auth pages (form controls use theme tokens)
const AUTH_CSS = `
.auth-root { min-height: 100vh; display: grid; grid-template-columns: 1fr; background: var(--bg-page); }
@media (min-width: 1024px) { .auth-root { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); height: 100vh; overflow: hidden; }
  .auth-root > .auth-brand { height: 100vh; overflow: hidden; }
  /* Shrink the brand panel content to fit shorter / zoomed screens (no cut-off, no scroll) */
  .auth-brand > .relative { transform-origin: top center; }
  .auth-root > .auth-form-side { height: 100vh; min-height: 0; overflow-y: auto; scrollbar-width: none; }
  .auth-root > .auth-brand::-webkit-scrollbar, .auth-root > .auth-form-side::-webkit-scrollbar { display: none; } }

.auth-brand { display: none; position: relative; overflow: hidden; padding: 22px 56px 16px;
  background: radial-gradient(1200px 600px at 10% -10%, #1b2a44 0%, transparent 60%), linear-gradient(160deg, #0b1220 0%, #0f1a2e 55%, #0a101c 100%);
  border-right: 1px solid rgba(148,163,184,0.12); }
@media (min-width: 1024px) { .auth-brand { display: block; } }
.auth-glow { position: absolute; width: 520px; height: 520px; right: -160px; bottom: -180px; border-radius: 50%;
  background: radial-gradient(circle, rgba(254,165,0,0.10), transparent 65%); filter: blur(40px); }
.auth-glass-wrap { position: relative; }
.auth-orb { position: absolute; border-radius: 50%; filter: blur(40px); pointer-events: none; animation: authOrb 10s ease-in-out infinite alternate; }
.auth-orb.o1 { width: 220px; height: 220px; left: -40px; top: -30px; background: rgba(254,165,0,0.18); }
.auth-orb.o2 { width: 200px; height: 200px; right: -30px; bottom: -40px; background: rgba(100,116,139,0.18); animation-delay: -5s; }
@keyframes authOrb { from { transform: translate(0,0); } to { transform: translate(30px,20px); } }
.auth-glass-card { position: relative; background: linear-gradient(150deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03));
  border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(24px) saturate(170%); -webkit-backdrop-filter: blur(24px) saturate(170%);
  box-shadow: 0 24px 50px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(255,255,255,0.05); }
@media (prefers-reduced-motion: reduce) { .auth-orb { animation: none; } }
.auth-swap { animation: authSwap .45s ease both; }
@keyframes authSwap { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .auth-swap { animation: none; } }
.auth-tile { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: authTile 4s ease-in-out infinite; }
@keyframes authTile { 0%,100% { border-color: rgba(148,163,184,0.12); } 40% { border-color: rgba(254,165,0,0.45); box-shadow: 0 0 14px rgba(254,165,0,0.15); } }
@media (prefers-reduced-motion: reduce) { .auth-tile { animation: none; } }
.auth-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.25); }

.auth-form-side { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; padding: 24px 20px; min-height: 100vh; background: var(--bg-card); }
.auth-form-side > * { position: relative; z-index: 1; }
.auth-form-glass { position: relative; padding: 32px 30px; border-radius: 22px; overflow: hidden;
  background: linear-gradient(145deg, rgba(255,255,255,0.62) 0%, rgba(248,248,248,0.42) 45%, rgba(255,246,228,0.55) 100%);
  border: 1px solid rgba(255,255,255,0.9);
  backdrop-filter: blur(40px) saturate(190%); -webkit-backdrop-filter: blur(40px) saturate(190%);
  box-shadow:
    0 0 0 1px rgba(15,23,42,0.06),
    0 2px 6px rgba(15,23,42,0.04),
    0 24px 60px -20px rgba(15,23,42,0.22),
    0 40px 80px -40px rgba(254,165,0,0.25),
    inset 0 1px 0 rgba(255,255,255,1), inset 1px 0 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.35),
    inset 0 0 0 1px rgba(255,255,255,0.6),
    inset 0 -20px 40px -30px rgba(254,165,0,0.12); }
/* frosted blur: soft colour blobs inside the card, heavily blurred, plus a top sheen */
.auth-form-glass::before { content: ''; position: absolute; inset: -30%; pointer-events: none; z-index: 0;
  background:
    radial-gradient(38% 32% at 18% 20%, rgba(254,165,0,0.42), transparent 70%),
    radial-gradient(34% 30% at 85% 80%, rgba(255,214,140,0.30), transparent 70%),
    radial-gradient(30% 26% at 75% 15%, rgba(255,207,107,0.35), transparent 70%),
    radial-gradient(60% 40% at 50% 0%, rgba(255,255,255,0.95), transparent 70%);
  filter: blur(38px); animation: authFrost 14s ease-in-out infinite alternate; }
@keyframes authFrost { from { transform: translate(0,0) rotate(0deg); } to { transform: translate(4%,3%) rotate(6deg); } }
@media (prefers-reduced-motion: reduce) { .auth-form-glass::before { animation: none; } }
/* thin gold edge highlight */
.auth-form-glass::after { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none;
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(254,165,0,0.55) 20%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.15) 60%, rgba(254,165,0,0.35) 85%, rgba(255,255,255,0.9));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.auth-form-glass > * { position: relative; z-index: 1; }
.auth-form-glass .a-input { background: rgba(255,255,255,0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-color: rgba(15,23,42,0.08); box-shadow: inset 0 1px 2px rgba(15,23,42,0.04); }
.auth-form-glass .a-input-icon, .auth-form-glass .a-eye { z-index: 2; }
.auth-form-glass .a-input:focus { background: rgba(255,255,255,0.95); }
.auth-form-glass .a-google { background: rgba(255,255,255,0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-color: rgba(15,23,42,0.08); box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
.auth-feature { background: linear-gradient(150deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(18px) saturate(160%); -webkit-backdrop-filter: blur(18px) saturate(160%);
  box-shadow: 0 14px 30px -18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12); transition: border-color .2s, transform .2s; }
.auth-feature:hover { border-color: rgba(254,165,0,0.4); transform: translateY(-1px); }
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
