import SectorHeatmap from '@/components/market/SectorHeatmap'
import MarketStatus  from '@/components/market/MarketStatus'

export const metadata = {
  title: 'Market Heatmap — PSX Sector View',
}

export const revalidate = 300

export default function HeatmapPage() {
  return (
    <div className="space-y-5 animate-data">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Market Heatmap
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            PSX stocks grouped by sector — color shows % change today
          </p>
        </div>
        <div className="w-48 shrink-0">
          <MarketStatus />
        </div>
      </div>

      <SectorHeatmap />
    </div>
  )
}
