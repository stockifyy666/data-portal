import StockBrowser from '@/components/market/StockBrowser'

export const metadata = {
  title: 'Stocks — All PSX Securities',
}

export default function StocksPage() {
  return (
    <div className="space-y-5 animate-data">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          PSX Securities
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          All listed securities on the Pakistan Stock Exchange
        </p>
      </div>
      <StockBrowser />
    </div>
  )
}
