'use client'

import { FundamentalsView } from '../StockFundamentalsView'
import { LoadingRows, SectionHeading } from '../stock-detail-helpers'
import type { Overview, StatementData } from '../stock-detail-types'

interface Props {
  symbol:   string
  fundData: StatementData | null
  fundLoad: boolean
  overview: Overview | null
}

export function StockFundamentalsTab({ symbol, fundData, fundLoad, overview }: Props) {
  return (
    <div className="space-y-4" style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--bg-border)',
      borderRadius: '0.75rem',
      padding: '1rem',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
    }}>
      <SectionHeading>Financial Ratios &amp; Metrics</SectionHeading>
      {fundLoad
        ? <LoadingRows />
        : fundData
          ? <FundamentalsView data={fundData} overview={overview} symbol={symbol} />
          : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No fundamentals data.</p>
      }
    </div>
  )
}
