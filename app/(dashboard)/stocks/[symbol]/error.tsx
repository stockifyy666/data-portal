'use client'

import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function StockError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[StockDetailError]', error)
  }, [error])

  return (
    <div className="space-y-5">
      <Link
        href="/stocks"
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowLeft size={14} />
        All Stocks
      </Link>

      <div
        className="card flex flex-col items-center justify-center py-16 gap-4 text-center"
      >
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Unable to load stock data
        </p>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
          This stock may have incomplete data from PSX. Try refreshing or check back later.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
