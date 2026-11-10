'use client'

// =============================================================================
// FILE: components/stock/StockChartComponents.tsx
// PURPOSE: Chart sub-components for the stock detail page.
//          - MiniChart: interactive SVG price chart with hover tooltip
//          - TradingViewWidget: embeds TradingView advanced chart
//          - IndexVsStockChart: % return comparison vs KSE-100 (lightweight-charts)
// =============================================================================

import { useState, useEffect, useRef } from 'react'

type Candle = {
  date: string; open: number; high: number
  low: number; close: number; volume: number
}

/* ── Interactive SVG chart with tooltip ─────────────────────────── */
export function MiniChart({ candles, mode }: { candles: Candle[]; mode: 'intraday' | 'weekly' }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (!candles.length) return null

  const prices = candles.map(c => c.close)
  const min    = Math.min(...prices)
  const max    = Math.max(...prices)
  const range  = max - min || 1
  const W = 600; const H = 200; const PAD = 10

  const points = candles.map((c, i) => ({
    x: candles.length > 1 ? (i / (candles.length - 1)) * W : W / 2,
    y: H - PAD - ((c.close - min) / range) * (H - PAD * 2),
    c,
  }))

  const ptStr  = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaD  = `M0,${H} L${ptStr.replace(/ /g, ' L')} L${W},${H} Z`
  const isUp   = candles[candles.length - 1].close >= candles[0].close
  const color  = isUp ? '#16a34a' : '#dc2626'
  const fillOp = isUp ? '#16a34a18' : '#dc262618'

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverIdx(Math.round(ratio * (candles.length - 1)))
  }

  const hp  = hoverIdx !== null ? points[hoverIdx] : null
  const hc  = hoverIdx !== null ? candles[hoverIdx] : null

  function fmtLabel(c: Candle) {
    if (mode === 'intraday') {
      const d = new Date(Number(c.date) * 1000)
      return isNaN(d.getTime()) ? c.date : d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    }
    const d = new Date(c.date)
    return isNaN(d.getTime()) ? c.date : d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  return (
    <div className="relative select-none">
      {hp && hc && (
        <div
          className="absolute z-10 pointer-events-none text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg"
          style={{
            left:            Math.min(hp.x / W * 100, 75) + '%',
            top:             4,
            backgroundColor: 'var(--bg-card)',
            border:          '1px solid var(--bg-border)',
            color:           'var(--text-primary)',
            minWidth:        110,
          }}
        >
          <p className="font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>{fmtLabel(hc)}</p>
          <div className="grid grid-cols-2 gap-x-2">
            <span style={{ color: 'var(--text-muted)' }}>O</span>
            <span className="font-number text-right">{hc.open.toFixed(2)}</span>
            <span style={{ color: 'var(--text-muted)' }}>H</span>
            <span className="font-number text-right text-green-600">{hc.high.toFixed(2)}</span>
            <span style={{ color: 'var(--text-muted)' }}>L</span>
            <span className="font-number text-right text-red-500">{hc.low.toFixed(2)}</span>
            <span style={{ color: 'var(--text-muted)' }}>C</span>
            <span className="font-number text-right font-bold" style={{ color }}>{hc.close.toFixed(2)}</span>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 220, cursor: 'crosshair' }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <path d={areaD} fill={fillOp} />
        <polyline points={ptStr} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {hp && (
          <>
            <line x1={hp.x} y1={0} x2={hp.x} y2={H}
                  stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
            <line x1={0} y1={hp.y} x2={W} y2={hp.y}
                  stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.3" />
            <circle cx={hp.x} cy={hp.y} r={5} fill={color} stroke="white" strokeWidth="2" />
          </>
        )}
        {[0, 0.5, 1].map(r => {
          const val = min + r * range
          const y   = H - PAD - r * (H - PAD * 2)
          return (
            <text key={r} x={4} y={y} fontSize={10} fill="var(--text-muted)" dominantBaseline="middle">
              {val.toFixed(2)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

/* ── TradingView Widget ──────────────────────────────────────────── */
export function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''
    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'
    wrapper.style.height = '420px'
    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = '100%'
    wrapper.appendChild(inner)
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol:              `PSX:${symbol}`,
      interval:            'D',
      timezone:            'Asia/Karachi',
      theme:               document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      style:               '1',
      locale:              'en',
      enable_publishing:   false,
      hide_side_toolbar:   false,
      allow_symbol_change: false,
      save_image:          false,
      height:              420,
      width:               '100%',
    })
    wrapper.appendChild(script)
    container.appendChild(wrapper)
  }, [symbol])

  return <div ref={containerRef} className="w-full overflow-hidden rounded-lg" style={{ height: 420 }} />
}

/* ── Index VS Stock — TradingView lightweight-charts ─────────────── */
export function IndexVsStockChart({ stockCandles, indexCandles, symbol }: {
  stockCandles: Candle[]; indexCandles: Candle[]; symbol: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLight, setIsLight] = useState(
    () => typeof document !== 'undefined' && !document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const update = () => setIsLight(!document.documentElement.classList.contains('dark'))
    update()
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current || stockCandles.length < 2 || indexCandles.length < 2) return

    const stockMap = new Map(stockCandles.map(c => [c.date.slice(0, 10), c.close]))
    const indexMap = new Map(indexCandles.map(c => [c.date.slice(0, 10), c.close]))
    const dates    = [...stockMap.keys()].filter(d => indexMap.has(d)).sort()
    if (dates.length < 2) return

    const base0S = stockMap.get(dates[0])!
    const base0I = indexMap.get(dates[0])!

    const stockSeries = dates.map(d => ({
      time: d as `${number}-${number}-${number}`,
      value: +((stockMap.get(d)! / base0S - 1) * 100).toFixed(2),
    }))
    const indexSeries = dates.map(d => ({
      time: d as `${number}-${number}-${number}`,
      value: +((indexMap.get(d)! / base0I - 1) * 100).toFixed(2),
    }))

    let cancelled = false
    let dispose: (() => void) | null = null

    import('lightweight-charts').then(({ createChart, ColorType }) => {
      if (cancelled || !containerRef.current) return

      const bg     = isLight ? '#ffffff' : '#0C1628'
      const text   = isLight ? '#64748b' : '#5B7499'
      const grid   = isLight ? '#f1f5f9' : '#0F2040'
      const border = isLight ? '#e2e8f0' : '#1C3054'
      const lblBg  = isLight ? '#f8fafc' : '#112040'
      const w = containerRef.current!.getBoundingClientRect().width || 600

      const chart = createChart(containerRef.current!, {
        width:  w,
        height: 280,
        layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
        grid:   { vertLines: { color: grid }, horzLines: { color: grid } },
        crosshair: {
          vertLine: { color: border, labelBackgroundColor: lblBg },
          horzLine: { color: border, labelBackgroundColor: lblBg },
        },
        rightPriceScale: {
          borderColor: border,
          scaleMargins: { top: 0.06, bottom: 0.06 },
        },
        timeScale: { borderColor: border, timeVisible: false },
        handleScroll: true,
        handleScale:  true,
      })

      const stockLine = chart.addLineSeries({ color: '#4A8FF4', lineWidth: 2, title: symbol })
      stockLine.setData(stockSeries)

      const indexLine = chart.addLineSeries({ color: '#F5A623', lineWidth: 2, lineStyle: 1, title: 'KSE-100' })
      indexLine.setData(indexSeries)

      chart.timeScale().fitContent()

      const tooltip = document.createElement('div')
      Object.assign(tooltip.style, {
        position:     'absolute',
        display:      'none',
        padding:      '8px 10px',
        background:   isLight ? '#ffffff' : '#1e293b',
        border:       `1px solid ${isLight ? '#e2e8f0' : '#334155'}`,
        borderRadius: '6px',
        boxShadow:    '0 2px 8px rgba(0,0,0,0.12)',
        fontSize:     '12px',
        pointerEvents:'none',
        zIndex:       '10',
        minWidth:     '120px',
      })
      containerRef.current!.style.position = 'relative'
      containerRef.current!.appendChild(tooltip)

      chart.subscribeCrosshairMove(param => {
        if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
          tooltip.style.display = 'none'
          return
        }
        const sVal = param.seriesData.get(stockLine) as { value: number } | undefined
        const iVal = param.seriesData.get(indexLine) as { value: number } | undefined
        if (!sVal && !iVal) { tooltip.style.display = 'none'; return }

        const dateStr = typeof param.time === 'string' ? param.time : ''
        const d = new Date(dateStr + 'T00:00:00')
        const label = d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })

        const textColor = isLight ? '#374151' : '#cbd5e1'
        const boldColor = isLight ? '#111827' : '#f1f5f9'

        tooltip.innerHTML = `
          <div style="font-weight:600;color:${boldColor};margin-bottom:5px;font-size:11px">${label}</div>
          ${sVal != null ? `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
            <span style="width:8px;height:8px;border-radius:50%;background:#4A8FF4;flex-shrink:0"></span>
            <span style="color:${textColor}">${symbol}:</span>
            <span style="font-weight:700;color:${boldColor}">${sVal.value.toFixed(2)}%</span>
          </div>` : ''}
          ${iVal != null ? `<div style="display:flex;align-items:center;gap:5px">
            <span style="width:8px;height:8px;border-radius:50%;background:#F5A623;flex-shrink:0"></span>
            <span style="color:${textColor}">KSE-100:</span>
            <span style="font-weight:700;color:${boldColor}">${iVal.value.toFixed(2)}%</span>
          </div>` : ''}
        `

        const containerW = containerRef.current!.getBoundingClientRect().width
        const tipW = 145
        let left = param.point.x + 12
        if (left + tipW > containerW - 60) left = param.point.x - tipW - 12

        tooltip.style.display = 'block'
        tooltip.style.left = `${left}px`
        tooltip.style.top  = `${Math.max(0, param.point.y - 40)}px`
      })

      const ro = new ResizeObserver(entries => {
        if (!cancelled && entries[0]) {
          chart.applyOptions({ width: entries[0].contentRect.width })
        }
      })
      ro.observe(containerRef.current!)
      dispose = () => { ro.disconnect(); chart.remove() }
    })

    return () => { cancelled = true; dispose?.() }
  }, [isLight, stockCandles, indexCandles, symbol])

  const _sMap = new Map(stockCandles.map(c => [c.date.slice(0, 10), c.close]))
  const _iMap = new Map(indexCandles.map(c => [c.date.slice(0, 10), c.close]))
  const _dates = [..._sMap.keys()].filter(d => _iMap.has(d)).sort()
  const _b0S = _dates.length ? _sMap.get(_dates[0])! : 1
  const _b0I = _dates.length ? _iMap.get(_dates[0])! : 1
  const _last = _dates[_dates.length - 1]
  const stockRet = _last ? +(_sMap.get(_last)! / _b0S - 1).toFixed(4) * 100 : 0
  const indexRet = _last ? +(_iMap.get(_last)! / _b0I - 1).toFixed(4) * 100 : 0
  const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

  return (
    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-hover)' }}>
        <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          Index vs Stock — % Return
        </span>
        <div className="flex items-center gap-4 text-[12px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: '#4A8FF4' }} />
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{symbol}</span>
            <span className="font-extrabold tabular-nums" style={{ color: stockRet >= 0 ? '#16a34a' : '#dc2626' }}>
              {fmt(stockRet)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4" style={{ borderTop: '2px dashed #F5A623' }} />
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>KSE-100</span>
            <span className="font-extrabold tabular-nums" style={{ color: indexRet >= 0 ? '#16a34a' : '#dc2626' }}>
              {fmt(indexRet)}
            </span>
          </span>
        </div>
      </div>
      <div ref={containerRef} style={{ height: 280 }} />
    </div>
  )
}
