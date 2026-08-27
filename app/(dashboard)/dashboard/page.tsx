import MarketStatusBanner from '@/components/market/MarketStatusBanner'
import DashboardClient    from '@/components/market/DashboardClient'

export const metadata = { title: 'Dashboard — Stockifyy' }
export const revalidate = 300

export default function DashboardPage() {
  return (
    <div className="space-y-5 animate-data">
      <MarketStatusBanner />
      <DashboardClient />
    </div>
  )
}
