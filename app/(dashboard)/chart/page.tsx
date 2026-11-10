'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart, IChartApi, ISeriesApi,
  CandlestickData, LineData, HistogramData,
  ColorType, CrosshairMode, UTCTimestamp,
} from 'lightweight-charts'
import {
  Search, X, ChevronDown, RefreshCw, Wifi, WifiOff,
  MousePointer2, Minus, TrendingUp, Type, Trash2,
  BarChart2, Plus, CandlestickChart, LineChart,
  Activity, Clock,
} from 'lucide-react'
import type { OHLCVCandle, CSResponse } from '@/types/market'

/* ── Constants ─────────────────────────────────────────────────────── */
const POPULAR = [
  'KSE100','HBL','MCB','UBL','ENGRO','LUCK','PSO','OGDC','PPL','MARI',
  'SYS','TRG','DGKC','MLCF','CHCC','HUBC','KAPCO','FFC','NRL','APL',
  'NESTLE','FFBL','SEARL','COLG','ICI','BAFL','ABL','MEBL','FABL','LOTCHEM',
]

const INTERVALS = [
  { label: '1m',  tf: '1min'  },
  { label: '5m',  tf: '5min'  },
  { label: '10m', tf: '10min' },
  { label: '15m', tf: '15min' },
  { label: '30m', tf: '30min' },
  { label: '1H',  tf: '1h'    },
] as const
type TF = typeof INTERVALS[number]['tf']

const PKT = 5 * 3600
const toPKT = (t: number): UTCTimestamp =>
  ((t > 1e10 ? Math.floor(t / 1000) : t) + PKT) as UTCTimestamp

const RECENT_KEY = 'stockifyy_chart_recent'
function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(sym: string) {
  try {
    const prev = getRecent().filter(s => s !== sym)
    localStorage.setItem(RECENT_KEY, JSON.stringify([sym, ...prev].slice(0, 8)))
  } catch {}
}

/* ── Indicator types ───────────────────────────────────────────────── */
type IndicatorType = 'MA' | 'EMA' | 'BB' | 'Volume' | 'RSI'
interface ActiveIndicator { id: string; type: IndicatorType; period: number; color: string }

const INDICATOR_CATALOG = [
  { type: 'MA'     as IndicatorType, label: 'Moving Average',   desc: 'Simple MA overlay',      defaultPeriod: 20, color: '#3b82f6' },
  { type: 'EMA'    as IndicatorType, label: 'Exp. Moving Avg',  desc: 'Exponential MA overlay',  defaultPeriod: 20, color: '#f59e0b' },
  { type: 'BB'     as IndicatorType, label: 'Bollinger Bands',  desc: 'Volatility bands (20,2)', defaultPeriod: 20, color: '#8b5cf6' },
  { type: 'Volume' as IndicatorType, label: 'Volume',           desc: 'Volume histogram',         defaultPeriod: 1,  color: '#6b7280' },
  { type: 'RSI'    as IndicatorType, label: 'RSI',              desc: 'Relative Strength (14)',   defaultPeriod: 14, color: '#ec4899' },
]

/* ── Indicator math ────────────────────────────────────────────────── */
function calcSMA(c: OHLCVCandle[], p: number): LineData[] {
  const out: LineData[] = []
  for (let i = p - 1; i < c.length; i++) {
    let s = 0; for (let j = i - p + 1; j <= i; j++) s += c[j].close
    out.push({ time: toPKT(c[i].time), value: s / p })
  }
  return out
}
function calcEMA(c: OHLCVCandle[], p: number): LineData[] {
  if (c.length < p) return []
  const k = 2 / (p + 1)
  let ema = c.slice(0, p).reduce((s, x) => s + x.close, 0) / p
  const out: LineData[] = [{ time: toPKT(c[p - 1].time), value: ema }]
  for (let i = p; i < c.length; i++) {
    ema = c[i].close * k + ema * (1 - k)
    out.push({ time: toPKT(c[i].time), value: ema })
  }
  return out
}
function calcBB(c: OHLCVCandle[], p: number) {
  const u: LineData[] = [], m: LineData[] = [], l: LineData[] = []
  for (let i = p - 1; i < c.length; i++) {
    const sl = c.slice(i - p + 1, i + 1)
    const mean = sl.reduce((s, x) => s + x.close, 0) / p
    const std  = Math.sqrt(sl.reduce((s, x) => s + (x.close - mean) ** 2, 0) / p)
    const t = toPKT(c[i].time)
    u.push({ time: t, value: mean + 2 * std })
    m.push({ time: t, value: mean })
    l.push({ time: t, value: mean - 2 * std })
  }
  return { upper: u, middle: m, lower: l }
}
function calcRSI(c: OHLCVCandle[], p: number): LineData[] {
  if (c.length < p + 1) return []
  let ag = 0, al = 0
  for (let i = 1; i <= p; i++) { const d = c[i].close - c[i-1].close; if (d > 0) ag += d; else al -= d }
  ag /= p; al /= p
  const rsi = (g: number, l: number) => l === 0 ? 100 : 100 - 100 / (1 + g / l)
  const out: LineData[] = [{ time: toPKT(c[p].time), value: rsi(ag, al) }]
  for (let i = p + 1; i < c.length; i++) {
    const d = c[i].close - c[i-1].close
    ag = (ag * (p - 1) + (d > 0 ? d : 0)) / p
    al = (al * (p - 1) + (d < 0 ? -d : 0)) / p
    out.push({ time: toPKT(c[i].time), value: rsi(ag, al) })
  }
  return out
}

/* ── Drawing tools ─────────────────────────────────────────────────── */
const DRAW_TOOLS = [
  { id: 'cursor', icon: MousePointer2, label: 'Cursor'          },
  { id: 'hline',  icon: Minus,         label: 'Horizontal Line' },
  { id: 'tline',  icon: TrendingUp,    label: 'Trend Line'      },
  { id: 'text',   icon: Type,          label: 'Text Note'       },
  { id: 'clear',  icon: Trash2,        label: 'Clear All'       },
] as const
type DrawTool = typeof DRAW_TOOLS[number]['id']

/* ── LW Chart component ────────────────────────────────────────────── */
interface LWChartProps {
  candles: OHLCVCandle[]; chartType: 'candlestick'|'line'; isDark: boolean
  indicators: ActiveIndicator[]; showRSI: boolean
}

function LWChart({ candles, chartType, isDark, indicators, showRSI }: LWChartProps) {
  const mainRef  = useRef<HTMLDivElement>(null)
  const rsiRef   = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi|null>(null)
  const rsiChart = useRef<IChartApi|null>(null)
  const seriesRef = useRef<ISeriesApi<any>|null>(null)
  const indRefs   = useRef<ISeriesApi<any>[]>([])

  const bg     = isDark ? '#0f1117' : '#ffffff'
  const text   = isDark ? '#94a3b8' : '#64748b'
  const grid   = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'

  const baseOpts = useCallback((el: HTMLElement) => ({
    width:  el.clientWidth,
    height: el.clientHeight,
    layout: { background: { type: ColorType.Solid, color: bg }, textColor: text, fontSize: 11, fontFamily: "'Inter', sans-serif" },
    grid:   { vertLines: { color: grid }, horzLines: { color: grid } },
    crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#FEA50060', labelBackgroundColor: '#FEA500' }, horzLine: { color: '#FEA50060', labelBackgroundColor: '#FEA500' } },
    rightPriceScale: { borderColor: border, scaleMargins: { top: 0.1, bottom: 0.1 } },
    timeScale: {
      borderColor: border, timeVisible: true, secondsVisible: false,
      tickMarkFormatter: (t: UTCTimestamp) => {
        const d = new Date(t * 1000)
        const hh = String(d.getUTCHours()).padStart(2,'0')
        const mm = String(d.getUTCMinutes()).padStart(2,'0')
        return (hh === '00' && mm === '00') ? `${d.getUTCDate()}/${d.getUTCMonth()+1}` : `${hh}:${mm}`
      },
    },
    localization: {
      timeFormatter: (t: UTCTimestamp) => {
        const d = new Date(t * 1000)
        return `${d.getUTCDate()}/${d.getUTCMonth()+1} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} PKT`
      },
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale:  { mouseWheel: true, pinch: true },
  }), [bg, text, grid, border])

  useEffect(() => {
    const el = mainRef.current; if (!el) return
    chartRef.current?.remove(); chartRef.current = null; seriesRef.current = null; indRefs.current = []
    const chart = createChart(el, baseOpts(el) as any)
    chartRef.current = chart
    if (chartType === 'candlestick') {
      seriesRef.current = chart.addCandlestickSeries({ upColor:'#22c55e', downColor:'#ef4444', borderUpColor:'#22c55e', borderDownColor:'#ef4444', wickUpColor:'#22c55e', wickDownColor:'#ef4444' }) as any
    } else {
      seriesRef.current = chart.addLineSeries({ color: '#FEA500', lineWidth: 2 }) as any
    }
    const ro = new ResizeObserver(() => { if (chartRef.current && el) chartRef.current.applyOptions({ width: el.clientWidth, height: el.clientHeight }) })
    ro.observe(el)
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRef.current = null }
  }, [chartType, isDark, baseOpts])

  useEffect(() => {
    if (!seriesRef.current || !candles.length) return
    if (chartType === 'candlestick') {
      ;(seriesRef.current as ISeriesApi<'Candlestick'>).setData(candles.map(c => ({ time: toPKT(c.time), open: c.open, high: c.high, low: c.low, close: c.close })))
    } else {
      ;(seriesRef.current as ISeriesApi<'Line'>).setData(candles.map(c => ({ time: toPKT(c.time), value: c.close })))
    }
    chartRef.current?.timeScale().fitContent()
  }, [candles, chartType])

  useEffect(() => {
    const chart = chartRef.current; if (!chart || !candles.length) return
    indRefs.current.forEach(s => { try { chart.removeSeries(s) } catch {} })
    indRefs.current = []
    for (const ind of indicators) {
      if (ind.type === 'RSI') continue
      if (ind.type === 'MA') {
        const s = chart.addLineSeries({ color: ind.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        s.setData(calcSMA(candles, ind.period)); indRefs.current.push(s)
      } else if (ind.type === 'EMA') {
        const s = chart.addLineSeries({ color: ind.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        s.setData(calcEMA(candles, ind.period)); indRefs.current.push(s)
      } else if (ind.type === 'BB') {
        const { upper, middle, lower } = calcBB(candles, ind.period)
        const opts = { color: ind.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false } as const
        const uS = chart.addLineSeries({ ...opts }); const mS = chart.addLineSeries({ ...opts, lineStyle: 2 }); const lS = chart.addLineSeries({ ...opts })
        uS.setData(upper); mS.setData(middle); lS.setData(lower)
        indRefs.current.push(uS, mS, lS)
      } else if (ind.type === 'Volume') {
        const s = chart.addHistogramSeries({ color: '#6b728066', priceFormat: { type: 'volume' }, priceScaleId: 'volume' })
        s.setData(candles.map(c => ({ time: toPKT(c.time), value: c.volume, color: c.close >= c.open ? '#22c55e44' : '#ef444444' })))
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
        indRefs.current.push(s)
      }
    }
  }, [candles, indicators])

  useEffect(() => {
    const el = rsiRef.current; if (!el) return
    rsiChart.current?.remove(); rsiChart.current = null
    if (!showRSI || !candles.length) return
    const rsiInd = indicators.find(i => i.type === 'RSI')
    const period = rsiInd?.period ?? 14; const color = rsiInd?.color ?? '#ec4899'
    const chart = createChart(el, { ...baseOpts(el) as any, height: el.clientHeight })
    rsiChart.current = chart
    const s = chart.addLineSeries({ color, lineWidth: 1, priceLineVisible: false })
    s.setData(calcRSI(candles, period))
    const times = calcRSI(candles, period).map(d => d.time as UTCTimestamp)
    if (times.length) {
      const ob = chart.addLineSeries({ color: '#ef444466', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false })
      const os = chart.addLineSeries({ color: '#22c55e66', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false })
      ob.setData(times.map(t => ({ time: t, value: 70 }))); os.setData(times.map(t => ({ time: t, value: 30 })))
    }
    if (chartRef.current) {
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange(range => {
        if (range) rsiChart.current?.timeScale().setVisibleRange(range as any)
      })
    }
    chart.timeScale().fitContent()
    const ro = new ResizeObserver(() => { if (rsiChart.current && el) rsiChart.current.applyOptions({ width: el.clientWidth, height: el.clientHeight }) })
    ro.observe(el)
    return () => { ro.disconnect(); chart.remove(); rsiChart.current = null }
  }, [showRSI, candles, indicators, isDark, baseOpts])

  return (
    <div className="flex flex-col w-full h-full">
      <div ref={mainRef} style={{ flex: showRSI ? '1 1 70%' : '1 1 100%', minHeight: 0 }} />
      {showRSI && (
        <>
          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <div style={{ flex: '0 0 28%', position: 'relative', minHeight: 0 }}>
            <span style={{ position:'absolute', top:6, left:10, fontSize:9, color:'#ec4899', fontWeight:700, zIndex:1, pointerEvents:'none', letterSpacing:'0.05em' }}>RSI ({indicators.find(i=>i.type==='RSI')?.period ?? 14})</span>
            <div ref={rsiRef} style={{ width:'100%', height:'100%' }} />
          </div>
        </>
      )}
    </div>
  )
}

/* ── Indicator Modal ───────────────────────────────────────────────── */
function IndicatorModal({ active, onAdd, onRemove, onClose }: {
  active: ActiveIndicator[]; onAdd: (t: IndicatorType, p: number, c: string) => void
  onRemove: (id: string) => void; onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const results = INDICATOR_CATALOG.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[440px] rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-border)' }}>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Add Indicator</h3>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Overlay technical indicators on the chart</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}><X size={14} /></button>
        </div>
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} autoFocus placeholder="Search…"
              className="w-full pl-8 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-1"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)', '--tw-ring-color': '#FEA500' } as any} />
          </div>
        </div>
        {active.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {active.map(ind => (
              <div key={ind.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                style={{ backgroundColor: `${ind.color}18`, color: ind.color, border: `1px solid ${ind.color}30` }}>
                {ind.type}{ind.period > 1 ? ` (${ind.period})` : ''}
                <button onClick={() => onRemove(ind.id)} className="opacity-60 hover:opacity-100"><X size={9} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="max-h-64 overflow-y-auto">
          {results.map(cat => {
            const isOn = active.some(a => a.type === cat.type)
            return (
              <button key={cat.type} onClick={() => onAdd(cat.type, cat.defaultPeriod, cat.color)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-opacity hover:opacity-75"
                style={{ borderTop: '1px solid var(--bg-border)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cat.color}20` }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{cat.desc}</p>
                </div>
                {isOn
                  ? <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold shrink-0" style={{ background: `${cat.color}20`, color: cat.color }}>Active</span>
                  : <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-hover)' }}><Plus size={12} style={{ color: 'var(--text-muted)' }} /></div>
                }
              </button>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--bg-border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Click any indicator to add it to the chart</p>
        </div>
      </div>
    </div>
  )
}

/* ── Symbol search ─────────────────────────────────────────────────── */
function SymbolSearch({ current, onSelect }: { current: string; onSelect: (s: string) => void }) {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setRecent(getRecent()); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  const results = query.trim()
    ? [...new Set([query.toUpperCase(), ...POPULAR.filter(s => s.includes(query.toUpperCase()))])]
    : recent.length ? recent : POPULAR

  function select(sym: string) { onSelect(sym); saveRecent(sym); setOpen(false); setQuery('') }

  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl font-black text-base transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg,#FEA500,#c47700)', color: 'white', letterSpacing: '-0.01em' }}>
        <span>{current}</span>
        <ChevronDown size={14} style={{ opacity: 0.8 }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
            <div className="p-3">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search PSX symbol…"
                  className="w-full pl-8 pr-8 py-2 rounded-xl text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)' }} />
                {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}><X size={11} /></button>}
              </div>
            </div>
            {!query && recent.length > 0 && (
              <p className="px-4 pb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Recent</p>
            )}
            <div className="max-h-64 overflow-y-auto pb-2">
              {results.map(sym => (
                <button key={sym} onMouseDown={() => select(sym)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-opacity hover:opacity-70"
                  style={sym === current ? { background: '#FEA50014' } : {}}>
                  <span className="text-sm font-bold" style={{ color: sym === current ? '#FEA500' : 'var(--text-primary)' }}>{sym}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>PSX</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Status dot ────────────────────────────────────────────────────── */
function StatusDot({ status }: { status: 'live'|'polling'|'off' }) {
  if (status === 'live')    return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
  if (status === 'polling') return <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: '#FEA500' }} />
  return <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
}

/* ── Main page ─────────────────────────────────────────────────────── */
export default function ChartPage() {
  const [symbol,       setSymbol]       = useState('KSE100')
  const [tf,           setTf]           = useState<TF>('1min')
  const [chartType,    setChartType]    = useState<'candlestick'|'line'>('candlestick')
  const [isDark,       setIsDark]       = useState(true)
  const [candles,      setCandles]      = useState<OHLCVCandle[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string|null>(null)
  const [wsStatus,     setWsStatus]     = useState<'live'|'polling'|'off'>('off')
  const [drawTool,     setDrawTool]     = useState<DrawTool>('cursor')
  const [indicators,   setIndicators]   = useState<ActiveIndicator[]>([])
  const [showIndModal, setShowIndModal] = useState(false)
  const sseRef = useRef<EventSource|null>(null)

  const showRSI   = indicators.some(i => i.type === 'RSI')
  const lastCandle = candles.length ? candles[candles.length - 1] : null
  const prevClose  = candles.length > 1 ? candles[candles.length - 2].close : null
  const priceChange = lastCandle && prevClose ? lastCandle.close - prevClose : null
  const pricePct    = priceChange && prevClose ? (priceChange / prevClose) * 100 : null
  const isUp        = priceChange !== null ? priceChange >= 0 : null

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains('dark'))
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const fetchCandles = useCallback(async (sym: string, timeframe: TF) => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/market/${sym}/chart?tf=${timeframe}`)
      const json = await res.json() as CSResponse<OHLCVCandle[]>
      if (json.status === 'error') throw new Error(json.message)
      setCandles([...(json.data ?? [])].sort((a, b) => a.time - b.time))
    } catch (e: any) {
      setError(e.message ?? 'Failed to load chart data')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCandles(symbol, tf) }, [symbol, tf, fetchCandles])

  useEffect(() => {
    sseRef.current?.close(); setWsStatus('off')
    const es = new EventSource(`/api/market/stream?symbol=${symbol}`)
    sseRef.current = es
    es.onopen = () => setWsStatus('live')
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as { type: string; data?: any }
        if (msg.type === 'connected') { setWsStatus('live'); return }
        if (msg.type !== 'tick' || !msg.data) return
        const tick = msg.data
        if (tick.s !== symbol) return
        setCandles(prev => {
          if (!prev.length) return prev
          const last = prev[prev.length - 1]
          const tickTs = tick.t
          if (tickTs === last.time || tickTs < last.time + 60) {
            return [...prev.slice(0, -1), { ...last, high: Math.max(last.high, tick.c), low: Math.min(last.low, tick.c), close: tick.c, volume: tick.v }]
          }
          return [...prev, { time: tickTs, open: tick.o, high: tick.h, low: tick.l, close: tick.c, volume: tick.v }]
        })
      } catch {}
    }
    es.onerror = () => {
      setWsStatus('polling'); es.close()
      const poll = setInterval(async () => {
        try {
          const res  = await fetch(`/api/market/${symbol}/chart?tf=${tf}`)
          const json = await res.json() as CSResponse<OHLCVCandle[]>
          if (json.status === 'ok' && json.data?.length) setCandles([...json.data].sort((a, b) => a.time - b.time))
        } catch {}
      }, 30_000)
      ;(sseRef as any).pollId = poll
    }
    return () => { es.close(); sseRef.current = null; if ((sseRef as any).pollId) clearInterval((sseRef as any).pollId) }
  }, [symbol, tf])

  const addIndicator    = useCallback((type: IndicatorType, period: number, color: string) => {
    setIndicators(prev => [...prev, { id: `${type}-${Date.now()}`, type, period, color }])
  }, [])
  const removeIndicator = useCallback((id: string) => setIndicators(prev => prev.filter(i => i.id !== id)), [])

  return (
    <div className="flex h-full gap-2" style={{ height: 'calc(100vh - 105px)' }}>

      {/* ── Drawing sidebar ────────────────────────────────────────── */}
      <div className="flex flex-col items-center py-3 px-1.5 gap-1 shrink-0 rounded-2xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', width: 44 }}>
        {/* Separator label */}
        <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Draw</p>
        {DRAW_TOOLS.map(tool => {
          const Icon = tool.icon
          const active = drawTool === tool.id
          return (
            <button key={tool.id} title={tool.label} onClick={() => setDrawTool(tool.id as DrawTool)}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all relative group"
              style={active
                ? { background: 'linear-gradient(135deg,#FEA500,#c47700)', color: 'white', boxShadow: '0 2px 8px #FEA50040' }
                : { color: 'var(--text-muted)' }}>
              <Icon size={14} />
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                {tool.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Main area ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 gap-2 min-w-0">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">

          {/* Symbol */}
          <SymbolSearch current={symbol} onSelect={sym => setSymbol(sym)} />

          {/* Price badge */}
          {lastCandle && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
              <div>
                <p className="text-sm font-black leading-none font-number" style={{ color: 'var(--text-primary)' }}>
                  {lastCandle.close.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {priceChange !== null && (
                  <p className="text-[10px] font-bold leading-none mt-0.5" style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
                    {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)} ({pricePct !== null ? Math.abs(pricePct).toFixed(2) : '0.00'}%)
                  </p>
                )}
              </div>
              <StatusDot status={wsStatus} />
            </div>
          )}

          <div className="w-px h-6 shrink-0" style={{ backgroundColor: 'var(--bg-border)' }} />

          {/* Intervals */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl shrink-0"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
            {INTERVALS.map(iv => (
              <button key={iv.tf} onClick={() => setTf(iv.tf)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={tf === iv.tf
                  ? { background: 'linear-gradient(135deg,#FEA500,#c47700)', color: 'white' }
                  : { color: 'var(--text-muted)' }}>
                {iv.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 shrink-0" style={{ backgroundColor: 'var(--bg-border)' }} />

          {/* Chart type */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setChartType('candlestick')} title="Candlestick"
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
              style={chartType === 'candlestick'
                ? { background: 'linear-gradient(135deg,#FEA500,#c47700)', color: 'white' }
                : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
              <CandlestickChart size={14} />
            </button>
            <button onClick={() => setChartType('line')} title="Line"
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
              style={chartType === 'line'
                ? { background: 'linear-gradient(135deg,#FEA500,#c47700)', color: 'white' }
                : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
              <LineChart size={14} />
            </button>
          </div>

          <div className="w-px h-6 shrink-0" style={{ backgroundColor: 'var(--bg-border)' }} />

          {/* Indicators */}
          <button onClick={() => setShowIndModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80 shrink-0"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
            <BarChart2 size={13} />
            Indicators
            {indicators.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black"
                style={{ background: 'linear-gradient(135deg,#FEA500,#c47700)', color: 'white' }}>
                {indicators.length}
              </span>
            )}
          </button>

          {/* Refresh */}
          <button onClick={() => fetchCandles(symbol, tf)} disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:opacity-70 shrink-0"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Popular chips — scrollable */}
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {POPULAR.slice(0, 14).map(sym => (
              <button key={sym} onClick={() => setSymbol(sym)}
                className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={sym === symbol
                  ? { background: 'linear-gradient(135deg,#FEA500,#c47700)', color: 'white' }
                  : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* ── Active indicator chips ── */}
        {indicators.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {indicators.map(ind => (
              <div key={ind.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={{ backgroundColor: `${ind.color}14`, color: ind.color, border: `1px solid ${ind.color}28` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ind.color }} />
                {ind.type}{ind.period > 1 ? ` (${ind.period})` : ''}
                <button onClick={() => removeIndicator(ind.id)} className="opacity-50 hover:opacity-100 ml-0.5"><X size={9} /></button>
              </div>
            ))}
          </div>
        )}

        {/* ── Chart container ── */}
        <div className="flex-1 rounded-2xl overflow-hidden relative min-h-0"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>

          {/* OHLCV info strip — top-left of chart */}
          {lastCandle && !loading && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-3 pointer-events-none">
              {[
                { label: 'O', value: lastCandle.open },
                { label: 'H', value: lastCandle.high, color: '#22c55e' },
                { label: 'L', value: lastCandle.low,  color: '#ef4444' },
                { label: 'C', value: lastCandle.close },
                { label: 'V', value: lastCandle.volume, noDecimal: true },
              ].map(({ label, value, color, noDecimal }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="text-[10px] font-bold font-number" style={{ color: color ?? 'var(--text-secondary)' }}>
                    {noDecimal ? value.toLocaleString() : value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#FEA500', borderTopColor: 'transparent' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Loading {symbol}…</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: '#ef444418', border: '1px solid #ef444430' }}>
                  <WifiOff size={20} style={{ color: '#ef4444' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button onClick={() => fetchCandles(symbol, tf)}
                  className="text-xs px-4 py-2 rounded-xl font-bold"
                  style={{ background: 'linear-gradient(135deg,#FEA500,#c47700)', color: 'white' }}>
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && candles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Activity size={28} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data for {symbol}</p>
              </div>
            </div>
          )}

          {!loading && !error && candles.length > 0 && (
            <LWChart candles={candles} chartType={chartType} isDark={isDark} indicators={indicators} showRSI={showRSI} />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between shrink-0 px-1">
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Data · <span style={{ color: '#FEA500' }}>Capital Stake</span> · PSX
          </p>
          <div className="flex items-center gap-1.5">
            <StatusDot status={wsStatus} />
            <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              {wsStatus === 'live' ? 'Live' : wsStatus === 'polling' ? 'Polling 30s' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Indicator modal */}
      {showIndModal && (
        <IndicatorModal active={indicators} onAdd={addIndicator} onRemove={removeIndicator} onClose={() => setShowIndModal(false)} />
      )}
    </div>
  )
}
