'use client'

import { ShareholdersView } from '../StockShareholdersView'
import { LoadingRows, SectionHeading } from '../stock-detail-helpers'
import type { StatementData } from '../stock-detail-types'

interface Props {
  shData: StatementData | null
  shLoad: boolean
}

export function StockShareholdersTab({ shData, shLoad }: Props) {
  return (
    <div className="card">
      <SectionHeading>Shareholder Pattern</SectionHeading>
      {shLoad
        ? <LoadingRows />
        : shData
          ? <ShareholdersView data={shData} />
          : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No shareholder data.</p>
      }
    </div>
  )
}
