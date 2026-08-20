import { notFound }        from 'next/navigation'
import { Suspense }         from 'react'
import Link                 from 'next/link'
import { ArrowLeft }        from 'lucide-react'
import WatchlistButton      from '@/components/market/WatchlistButton'
import StockDetailClient    from '@/components/stock/StockDetailClient'

type Params = { symbol: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { symbol } = await params
  return { title: `${symbol.toUpperCase()} — Stockifyy` }
}

function isValidSymbol(s: string) { return /^[A-Z0-9]{2,10}$/.test(s) }

export const revalidate = 300

export default async function StockDetailPage({ params }: { params: Promise<Params> }) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()

  if (!isValidSymbol(symbol)) notFound()

  let overview: Record<string, unknown> | null = null
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res  = await fetch(`${base}/api/market/${symbol}/overview`, {
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const json = await res.json()
      overview   = json.data ?? null
    }
  } catch { /* renders without overview */ }

  return (
    <div className="space-y-5 animate-data">

      {/* Back */}
      <Link href="/stocks"
            className="inline-flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={14} />
        All Stocks
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {symbol}
            </h1>
            {!!overview?.name && (
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {String(overview.name)}
              </span>
            )}
            {!!overview?.indexKeys && (
              <div className="flex gap-1 flex-wrap">
                {(overview.indexKeys as string[]).slice(0, 3).map(k => (
                  <span key={k}
                        className="text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wide"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Pakistan Stock Exchange
          </p>
        </div>
        <WatchlistButton symbol={symbol} />
      </div>

      {/* Tabbed detail view */}
      <Suspense>
        <StockDetailClient symbol={symbol} overview={overview as Record<string, number | string> | null} />
      </Suspense>
    </div>
  )
}
