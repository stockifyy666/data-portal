'use client'

import { ExternalLink } from 'lucide-react'
import { StatementTable } from '../StockStatementTable'
import { LoadingRows } from '../stock-detail-helpers'
import type { StatementData } from '../stock-detail-types'

interface Props {
  stmtData:    StatementData | null
  stmtLoad:    boolean
  stmtType:    'income' | 'balance' | 'cashflow'
  setStmtType: (t: 'income' | 'balance' | 'cashflow') => void
  stmtInt:     'annual' | 'quarterly'
  setStmtInt:  (i: 'annual' | 'quarterly') => void
  stmtPdfs:    { title: string; url: string; type: string }[]
}

export function StockFinancialsTab({
  stmtData, stmtLoad, stmtType, setStmtType, stmtInt, setStmtInt, stmtPdfs,
}: Props) {
  const isAnnual    = (t: string) => /annual|year ended|full.?year|transmission/i.test(t)
  const isQuarterly = (t: string) => /q[1-4]|quarter|half.?year|period ended/i.test(t)
  const filteredPdfs = stmtPdfs.filter(p =>
    stmtInt === 'annual' ? isAnnual(p.title) || !isQuarterly(p.title) : isQuarterly(p.title)
  )
  const pdfList = filteredPdfs.length ? filteredPdfs : stmtPdfs

  return (
    <div className="card space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(['income', 'balance', 'cashflow'] as const).map(t => (
            <button key={t} onClick={() => setStmtType(t)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
              style={stmtType === t
                ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
                : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              {t === 'income' ? 'Income' : t === 'balance' ? 'Balance Sheet' : 'Cash Flow'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 sm:ml-auto">
          {(['annual', 'quarterly'] as const).map(i => (
            <button key={i} onClick={() => setStmtInt(i)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={stmtInt === i
                ? { backgroundColor: 'var(--bg-border)', color: 'var(--text-primary)' }
                : { backgroundColor: 'transparent', color: 'var(--text-muted)' }}>
              {i === 'annual' ? 'Annual' : 'Quarterly'}
            </button>
          ))}
        </div>
      </div>

      {/* PDF reports */}
      {pdfList.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {pdfList.map((pdf, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                 style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--bg-border)' }}>
              <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{pdf.title}</span>
              <a href={pdf.url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
                 style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
                <ExternalLink size={11} />
                View PDF
              </a>
            </div>
          ))}
        </div>
      )}

      {stmtLoad
        ? <LoadingRows />
        : stmtData
          ? <StatementTable data={stmtData} maxCols={stmtInt === 'quarterly' ? 8 : 6} />
          : <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No data.</p>
      }
    </div>
  )
}
