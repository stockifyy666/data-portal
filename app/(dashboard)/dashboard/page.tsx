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

      {/* Index cards — full width row */}
      <IndexTracker />

      {/* KSE-100 candlestick chart — full width */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              KSE-100
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Intraday · Candlestick</p>
          </div>
        </div>
        <div style={{ height: 280 }}>
          <KSEChart />
        </div>
      </div>

      {/* Stocks table with tabs + pagination + search */}
      <DashboardQuoteTable />

    </div>
  )
}
