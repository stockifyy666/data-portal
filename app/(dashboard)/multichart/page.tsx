'use client'

import { useEffect, useRef, useState, useId } from 'react'
import { LayoutGrid } from 'lucide-react'

function tvSymbol(sym: string) { return `PSX:${sym}` }

const DEFAULT_SYMBOLS = ['HBL', 'OGDC', 'PSO', 'LUCK']

const INTERVALS = [
  { label: '1m',  value: '1'   },
  { label: '5m',  value: '5'   },
  { label: '15m', value: '15'  },
  { label: '30m', value: '30'  },
  { label: '1H',  value: '60'  },
  { label: '4H',  value: '240' },
  { label: '1D',  value: 'D'   },
  { label: '1W',  value: 'W'   },
  { label: '1M',  value: 'M'   },
]

const CHART_TYPES = [
  { label: 'Candles', value: '1' },
  { label: 'Bars',    value: '0' },
  { label: 'Line',    value: '2' },
  { label: 'Area',    value: '3' },
  { label: 'Heikin',  value: '8' },
]

/* ── TradingView script loader ─────────────────────────────────────── */
const TV_SCRIPT_SRC = 'https://s3.tradingview.com/tv.js'

function loadTvScript(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).TradingView) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TV_SCRIPT_SRC}"]`)
    if (existing) {
      const check = setInterval(() => {
        if ((window as any).TradingView) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(check); reject(new Error('timeout')) }, 10000)
      return
    }
    const s = document.createElement('script')
    s.src = TV_SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

/* ── Single TradingView panel ──────────────────────────────────────── */
function ChartPanel({
  symbol, interval, chartType, theme, containerId,
}: {
  symbol: string
  interval: string
  chartType: string
  theme: string
  containerId: string
}) {
  const widgetRef = useRef<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setErr(null)

    async function init() {
      try { await loadTvScript() }
      catch { if (!cancelled) setErr('Failed to load TradingView.'); return }
      if (cancelled || !(window as any).TradingView) return

      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch {}
        widgetRef.current = null
      }

      const el = document.getElementById(containerId)
      if (!el) return
      el.innerHTML = ''

      try {
        widgetRef.current = new (window as any).TradingView.widget({
          container_id:        containerId,
          autosize:            true,
          symbol:              tvSymbol(symbol),
          interval,
          timezone:            'Asia/Karachi',
          theme,
          style:               chartType,
          locale:              'en',
          toolbar_bg:          theme === 'dark' ? '#131720' : '#f8fafc',
          enable_publishing:   false,
          allow_symbol_change: true,
          save_image:          false,
          hide_side_toolbar:   true,
          withdateranges:      false,
          details:             false,
          hotlist:             false,
          calendar:            false,
        })
      } catch (e) {
        if (!cancelled) setErr(String(e))
      }
    }

    init()
    return () => { cancelled = true }
  }, [symbol, interval, chartType, theme, containerId])

  return (
    <div className="relative flex flex-col rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-card)', minHeight: 0 }}>
      <div className="flex-1" style={{ minHeight: 0 }}>
        {err
          ? <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>{err}</div>
          : <div id={containerId} style={{ width: '100%', height: '100%' }} />
        }
      </div>
    </div>
  )
}

/* ── Multi-Chart page ──────────────────────────────────────────────── */
export default function MultiChartPage() {
  const uid = useId().replace(/:/g, '')

  const [interval,  setInterval]  = useState('D')
  const [chartType, setChartType] = useState('1')
  const [tvTheme,   setTvTheme]   = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    function sync() {
      const d = document.documentElement
      const dark = d.dataset.theme === 'dark' ||
        (!d.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      setTvTheme(dark ? 'dark' : 'light')
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    return () => obs.disconnect()
  }, [])

  return (
    <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 6px)' }}>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">

        <div className="flex items-center gap-2">
          <LayoutGrid size={16} style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Multi Chart</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
            4 panels
          </span>
        </div>

        <div className="w-px h-6 shrink-0" style={{ backgroundColor: 'var(--bg-border)' }} />

        {/* Interval — updates ALL charts */}
        <div className="flex items-center gap-0.5 rounded-xl p-1"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
          {INTERVALS.map(iv => (
            <button key={iv.value} onClick={() => setInterval(iv.value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={interval === iv.value
                ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                : { color: 'var(--text-muted)' }}>
              {iv.label}
            </button>
          ))}
        </div>

        {/* Chart type — updates ALL charts */}
        <div className="flex items-center gap-0.5 rounded-xl p-1"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
          {CHART_TYPES.map(ct => (
            <button key={ct.value} onClick={() => setChartType(ct.value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={chartType === ct.value
                ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }
                : { color: 'var(--text-muted)' }}>
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2×2 Grid ─────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3" style={{ minHeight: 0 }}>
        {DEFAULT_SYMBOLS.map((sym, i) => (
          <ChartPanel
            key={`${uid}_${i}_${interval}_${chartType}`}
            containerId={`${uid}_panel_${i}`}
            symbol={sym}
            interval={interval}
            chartType={chartType}
            theme={tvTheme}
          />
        ))}
      </div>
    </div>
  )
}
