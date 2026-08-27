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

/* ── Single TradingView panel — uses embed widget (no login required) ── */
function ChartPanel({
  symbol, interval, chartType, theme, containerId,
}: {
  symbol: string
  interval: string
  chartType: string
  theme: string
  containerId: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'
    wrapper.style.cssText = 'width:100%;height:100%'

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.cssText = 'width:100%;height:100%'
    wrapper.appendChild(inner)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol:              `PSX:${symbol}`,
      interval,
      timezone:            'Asia/Karachi',
      theme,
      style:               chartType,
      locale:              'en',
      enable_publishing:   false,
      allow_symbol_change: false,
      hide_side_toolbar:   true,
      save_image:          false,
      height:              '100%',
      width:               '100%',
    })
    wrapper.appendChild(script)
    container.appendChild(wrapper)
  }, [symbol, interval, chartType, theme, containerId])

  return (
    <div className="relative flex flex-col rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-card)', minHeight: 0 }}>
      <div ref={containerRef} className="flex-1" style={{ minHeight: 0, width: '100%', height: '100%' }} />
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
      // ThemeProvider toggles the 'dark' class on <html>
      const dark = document.documentElement.classList.contains('dark')
      setTvTheme(dark ? 'dark' : 'light')
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
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
