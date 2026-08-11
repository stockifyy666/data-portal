'use client'

import { useState, useEffect, useRef } from 'react'

type TF = '1min' | '15min' | 'eod'

const TABS: { label: string; value: TF }[] = [
  { label: '1D',  value: '1min'  },
  { label: '1W',  value: '15min' },
  { label: 'All', value: 'eod'   },
]

type Candle = {
  time:  string | number
  open:  number
  high:  number
  low:   number
  close: number
}

type Props = { symbol: string }

export default function StockChart({ symbol }: Props) {
  const [tf,      setTf]      = useState<TF>('eod')
  const [loading, setLoading] = useState(true)
  const containerRef          = useRef<HTMLDivElement>(null)
  const chartRef              = useRef<unknown>(null)
  const seriesRef             = useRef<unknown>(null)

  useEffect(() => {
    let chart: unknown
    import('lightweight-charts').then(({ createChart, ColorType }) => {
      if (!containerRef.current) return

      chart = createChart(containerRef.current, {
        layout: {
          background:  { type: ColorType.Solid, color: '#ffffff' },
          textColor:   '#64748b',
        },
        grid: {
          vertLines: { color: '#f1f5f9' },
          horzLines: { color: '#f1f5f9' },
        },
        crosshair: {
          vertLine: { color: '#cbd5e1' },
          horzLine: { color: '#cbd5e1' },
        },
        rightPriceScale: { borderColor: '#e2e8f0' },
        timeScale:       { borderColor: '#e2e8f0', timeVisible: true },
        height: 300,
        width:  containerRef.current.clientWidth,
      })

      // @ts-expect-error — Lightweight Charts types
      const series = chart.addCandlestickSeries({
        upColor:       '#16a34a',
        downColor:     '#dc2626',
        borderVisible: false,
        wickUpColor:   '#16a34a',
        wickDownColor: '#dc2626',
      })

      chartRef.current  = chart
      seriesRef.current = series
    })

    return () => {
      // @ts-expect-error — Lightweight Charts types
      chart?.remove()
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/market/${symbol}/chart?tf=${tf}`)
      .then(r => r.json())
      .then(json => {
        if (!json.data || !seriesRef.current) return
        const candles = (json.data as Candle[]).map(c => ({
          time:  c.time,
          open:  c.open,
          high:  c.high,
          low:   c.low,
          close: c.close,
        }))
        // @ts-expect-error — Lightweight Charts types
        seriesRef.current.setData(candles)
        // @ts-expect-error — Lightweight Charts types
        chartRef.current?.timeScale().fitContent()
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol, tf])

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setTf(tab.value)}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors
              ${tf === tab.value
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent
                            rounded-full animate-spin" />
          </div>
        )}
        <div ref={containerRef} className={loading ? 'opacity-30' : ''} />
      </div>
    </div>
  )
}
