'use client'

import { useState }      from 'react'
import SectorHeatmap     from '@/components/market/SectorHeatmap'
import CombinedHeatmap   from '@/components/market/CombinedHeatmap'
import MarketStatus      from '@/components/market/MarketStatus'

type HeatView = 'sector' | 'combined'

export default function HeatmapPage() {
  const [view, setView] = useState<HeatView>('combined')

  return (
    <div className="space-y-5 animate-data">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Market Heatmap
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            PSX stocks — color shows % change today
          </p>
        </div>
        <div className="w-48 shrink-0">
          <MarketStatus />
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg-hover)' }}>
        {([
          { id: 'sector',   label: 'Sector View'   },
          { id: 'combined', label: 'Combined View'  },
        ] as { id: HeatView; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={view === t.id
              ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
              : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'sector'   && <SectorHeatmap />}
      {view === 'combined' && <CombinedHeatmap />}
    </div>
  )
}
