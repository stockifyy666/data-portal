import MarketStatusBanner  from '@/components/market/MarketStatusBanner'
import IndexTracker        from '@/components/market/IndexTracker'
import KSEChart            from '@/components/market/KSEChart'
import DashboardQuoteTable from '@/components/market/DashboardQuoteTable'

export const metadata = { title: 'Dashboard — Stockifyy' }
export const revalidate = 300

export default function DashboardPage() {
  return (
    <div className="space-y-5 animate-data">

      {/* Market open/close banner */}
      <MarketStatusBanner />

      {/* KSE-100 chart (left) + index cards (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* KSE-100 chart */}
        <div className="card lg:col-span-3 flex flex-col min-h-[200px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                KSE-100
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Intraday</p>
            </div>
          </div>
          <div className="flex-1 min-h-[140px]">
            <KSEChart />
          </div>
        </div>

        {/* Index cards */}
        <div className="lg:col-span-2">
          <IndexTracker />
        </div>
      </div>

      {/* Stocks table with tabs + pagination + search */}
      <DashboardQuoteTable />

    </div>
  )
}
