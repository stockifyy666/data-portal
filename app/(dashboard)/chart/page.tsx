'use client'

import { useEffect, useRef, useState, useCallback, useId } from 'react'
import { Search, X, ChevronDown, Clock } from 'lucide-react'

/* ── All PSX equities use PSX: prefix in TradingView embedded widget ─ */
// Note: KSE indices (KSE100 etc.) are TradingView.com-only and blocked in embeds
function tvSymbol(sym: string): string {
  return `PSX:${sym}`
}

const POPULAR = [
  'HBL','MCB','UBL','ENGRO','LUCK','PSO','OGDC','PPL','MARI','SYS',
  'TRG','DGKC','MLCF','CHCC','HUBC','KAPCO','FFC','NRL','APL','NESTLE',
  'FFBL','SEARL','COLG','ICI','LOTCHEM','GHGL','BAFL','ABL','MEBL','FABL',
]

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

const RECENT_KEY = 'stockifyy_chart_recent'
function getRecent(): string[]  { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] } }
function saveRecent(sym: string){ try { const p = getRecent().filter(s=>s!==sym); localStorage.setItem(RECENT_KEY, JSON.stringify([sym,...p].slice(0,8))) } catch {} }

/* ── TradingView widget ────────────────────────────────────────────── */
const TV_SCRIPT_SRC = 'https://s3.tradingview.com/tv.js'

function loadTvScript(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).TradingView) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TV_SCRIPT_SRC}"]`)
    if (existing) {
      // script tag exists but TradingView might not be ready yet
      const check = setInterval(() => {
        if ((window as any).TradingView) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(check); reject(new Error('TradingView timeout')) }, 10000)
      return
    }
    const s = document.createElement('script')
    s.src   = TV_SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

function TradingViewChart({
  symbol, interval, chartType, theme, containerId,
}: { symbol: string; interval: string; chartType: string; theme: string; containerId: string }) {
  const widgetRef = useRef<any>(null)
  const [err, setErr] = useState<string|null>(null)

  useEffect(() => {
    let cancelled = false
    setErr(null)

    async function init() {
      try {
        await loadTvScript()
      } catch {
        if (!cancelled) setErr('Failed to load TradingView. Check your internet connection.')
        return
      }
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
          save_image:          true,
          hide_side_toolbar:   false,
          withdateranges:      true,
          details:             true,
          hotlist:             false,
          calendar:            false,
          studies: ['MASimple@tv-scriptstd','RSI@tv-scriptstd','MACD@tv-scriptstd'],
          show_popup_button:   true,
          popup_width:         '1000',
          popup_height:        '650',
        })
      } catch (e) {
        if (!cancelled) setErr(String(e))
      }
    }

    init()
    return () => { cancelled = true }
  }, [symbol, interval, chartType, theme, containerId])

  if (err) return (
    <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
      {err}
    </div>
  )

  return (
    <div id={containerId} style={{ width:'100%', height:'100%' }} />
  )
}

/* ── Symbol search dropdown ────────────────────────────────────────── */
function SymbolSearch({ onSelect, current }: { onSelect:(s:string)=>void; current:string }) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [recent,  setRecent]  = useState<string[]>([])
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setRecent(getRecent()); setTimeout(()=>inputRef.current?.focus(),50) } }, [open])

  const results = query.trim()
    ? [...new Set([query.toUpperCase(), ...POPULAR.filter(s=>s.includes(query.toUpperCase()))])]
    : recent.length ? recent : POPULAR

  function select(sym: string) {
    onSelect(sym); saveRecent(sym); setOpen(false); setQuery('')
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(p=>!p)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-lg transition-all"
        style={{ background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }}>
        {current} <ChevronDown size={16}/>
      </button>

      {open && <>
        <div className="fixed inset-0 z-40" onMouseDown={()=>setOpen(false)}/>
        <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>

          <div className="p-3 border-b" style={{ borderColor:'var(--bg-border)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-muted)' }}/>
              <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Search PSX symbol e.g. HBL…"
                className="w-full pl-8 pr-8 py-2 rounded-lg text-xs focus:outline-none"
                style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-primary)', border:'1px solid var(--bg-border)' }}
              />
              {query && <button onClick={()=>setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}><X size={12}/></button>}
            </div>
          </div>

          <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
            {!query && recent.length
              ? <><Clock size={10} style={{color:'var(--text-muted)'}}/><span className="text-[9px] font-bold uppercase tracking-wide" style={{color:'var(--text-muted)'}}>Recent</span></>
              : <span className="text-[9px] font-bold uppercase tracking-wide" style={{color:'var(--text-muted)'}}>{query ? 'Results' : 'Indices & Popular'}</span>
            }
          </div>

          <div className="max-h-64 overflow-y-auto pb-2">
            {results.map(sym => (
              <button key={sym} onMouseDown={()=>select(sym)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-opacity hover:opacity-80"
                style={sym===current
                  ? { background:'linear-gradient(135deg,#FEA50018,#98630008)', color:'#FEA500' }
                  : { color:'var(--text-primary)' }}>
                <span className="text-sm font-bold">{sym}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-muted)' }}>
                  PSX
                </span>
              </button>
            ))}
          </div>
        </div>
      </>}
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────────── */
export default function ChartPage() {
  const uid        = useId().replace(/:/g, '')
  const containerId = `tv_${uid}`

  const [symbol,    setSymbol]    = useState('HBL')
  const [interval,  setInterval]  = useState('D')
  const [chartType, setChartType] = useState('1')
  const [tvTheme,   setTvTheme]   = useState<'dark'|'light'>('dark')

  useEffect(() => {
    function sync() {
      const dark = document.documentElement.classList.contains('dark')
      setTvTheme(dark ? 'dark' : 'light')
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const handleSelect = useCallback((sym:string) => setSymbol(sym), [])

  return (
    <div className="flex flex-col gap-4" style={{ height:'calc(100vh - 105px)' }}>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">

        <SymbolSearch current={symbol} onSelect={handleSelect}/>

        <div className="w-px h-7 shrink-0" style={{ backgroundColor:'var(--bg-border)' }}/>

        {/* Interval */}
        <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>
          {INTERVALS.map(iv=>(
            <button key={iv.value} onClick={()=>setInterval(iv.value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={interval===iv.value
                ? { background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }
                : { color:'var(--text-muted)' }}>
              {iv.label}
            </button>
          ))}
        </div>

        {/* Chart type */}
        <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>
          {CHART_TYPES.map(ct=>(
            <button key={ct.value} onClick={()=>setChartType(ct.value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={chartType===ct.value
                ? { background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }
                : { color:'var(--text-muted)' }}>
              {ct.label}
            </button>
          ))}
        </div>

        {/* Quick chips */}
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          {POPULAR.slice(0,10).map(sym=>(
            <button key={sym} onClick={()=>handleSelect(sym)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={sym===symbol
                ? { background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }
                : { backgroundColor:'var(--bg-card)', color:'var(--text-muted)', border:'1px solid var(--bg-border)' }}>
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 rounded-2xl overflow-hidden"
        style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)', minHeight:0 }}>
        <TradingViewChart
          containerId={containerId}
          symbol={symbol}
          interval={interval}
          chartType={chartType}
          theme={tvTheme}
        />
      </div>
    </div>
  )
}
