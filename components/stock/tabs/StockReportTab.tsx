'use client'

import { FileText } from 'lucide-react'
import type { Overview, StatementData, ProfileData, Announcement } from '../stock-detail-types'
import { SectionHeading } from '../stock-detail-helpers'

type Props = {
  symbol:    string
  overview:  Overview | null
  snapFunds: StatementData | null
  profile:   ProfileData | null
  anns:      Announcement[]
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2"
      style={{ borderBottom: '1px solid var(--bg-border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-semibold tabular-nums"
        style={{ color: highlight ? '#FEA500' : 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
      <div className="px-4 py-2.5" style={{ backgroundColor: 'var(--bg-hover)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</p>
      </div>
      <div className="px-4 pb-1">{children}</div>
    </div>
  )
}

export function StockReportTab({ symbol, overview, snapFunds, profile, anns }: Props) {
  function pickR(pattern: RegExp): number | null {
    return snapFunds?.fields.find(f => !f.is_heading && pattern.test(f.label.trim()))?.values[0] ?? null
  }

  const eps    = pickR(/earnings per share|eps/i)    ?? Number(overview?.eps) ?? 0
  const bvps   = pickR(/book value per share|bvps/i) ?? 0
  const roe    = pickR(/return on equity|roe/i)      ?? 0
  const npm    = pickR(/net profit margin/i)         ?? 0
  const dps    = pickR(/dividend per share|dps/i)    ?? 0
  const pe     = pickR(/price.*earning|p\/e/i)       ?? 0
  const price  = Number(overview?.price)   || 0
  const high52 = Number(overview?.high52)  || 0
  const low52  = Number(overview?.low52)   || 0
  const vol    = Number(overview?.volume)  || 0
  const mc     = Number((overview as any)?.mc) || 0
  const npmPct = npm !== 0 ? (Math.abs(npm) > 1 ? npm : npm * 100) : 0
  const roePct = roe !== 0 ? (Math.abs(roe) > 1 ? roe : roe * 100) : 0
  const divYld = dps > 0 && price > 0 ? (dps / price) * 100 : 0
  const pb     = bvps > 0 && price > 0 ? price / bvps : 0
  const sectorCodeR = String(overview?.sector ?? '')
  const isFinancialR = ['0807','0812','0813','0815','0819','0836'].includes(sectorCodeR)
  const grahamIV = eps > 0 && bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : 0
  const mos = grahamIV > 0 && price > 0 ? Math.round(((grahamIV - price) / grahamIV) * 100) : null

  const handlePrint = () => window.print()

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {symbol} - Company Report
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Generated {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })} · Data sourced from PSX
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{ background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }}>
          <FileText size={13} />
          Print / Save PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Market Data */}
        <Section title="Market Data">
          <Row label="Current Price"   value={price ? `Rs ${price.toFixed(2)}` : '-'} highlight />
          <Row label="Change Today"    value={overview ? `${Number(overview.changePct) >= 0 ? '+' : ''}${(Number(overview.changePct)).toFixed(2)}%` : '-'} />
          <Row label="52-Week High"    value={high52 ? `Rs ${high52.toFixed(2)}` : '-'} />
          <Row label="52-Week Low"     value={low52  ? `Rs ${low52.toFixed(2)}`  : '-'} />
          <Row label="Volume"          value={vol ? vol.toLocaleString() : '-'} />
          <Row label="Market Cap"      value={mc ? (mc >= 1e9 ? `Rs ${(mc/1e9).toFixed(2)}B` : `Rs ${(mc/1e6).toFixed(0)}M`) : '-'} />
          <Row label="Open"            value={overview?.open  ? `Rs ${Number(overview.open).toFixed(2)}`  : '-'} />
          <Row label="Prev Close"      value={overview?.lastClose ? `Rs ${Number(overview.lastClose).toFixed(2)}` : '-'} />
        </Section>

        {/* Valuation */}
        <Section title="Valuation">
          <Row label="P/E Ratio"         value={pe   > 0 ? `${pe.toFixed(1)}x`   : '-'} />
          <Row label="EPS"               value={eps  ? `Rs ${eps.toFixed(2)}`    : '-'} />
          <Row label="Book Value / Share" value={bvps ? `Rs ${bvps.toFixed(2)}`  : '-'} />
          <Row label="P/B Ratio"          value={pb   > 0 ? `${pb.toFixed(2)}x`  : '-'} />
          <Row label="Graham Intr. Value" value={!isFinancialR && grahamIV > 0 ? `Rs ${grahamIV.toFixed(2)}` : 'N/A'} />
          <Row label="Margin of Safety"   value={!isFinancialR && mos !== null ? `${mos >= 0 ? '+' : ''}${mos}%` : 'N/A'} highlight={!isFinancialR && mos !== null && mos >= 20} />
        </Section>

        {/* Profitability */}
        <Section title="Profitability">
          <Row label="Net Profit Margin" value={npmPct ? `${npmPct.toFixed(2)}%` : '-'} />
          <Row label="Return on Equity"  value={roePct ? `${roePct.toFixed(2)}%` : '-'} />
          <Row label="Dividend / Share"  value={dps  ? `Rs ${dps.toFixed(2)}`   : '-'} />
          <Row label="Dividend Yield"    value={divYld > 0 ? `${divYld.toFixed(2)}%` : '-'} />
        </Section>

        {/* Scores */}
        <Section title="Stockifyy Scores">
          {(() => {
            let ss = 0, ssMax = 0
            if (pe > 0) { ssMax += 25; ss += pe <= 10 ? 25 : pe <= 15 ? 20 : pe <= 20 ? 12 : pe <= 30 ? 6 : 0 }
            if (npmPct) { ssMax += 25; ss += npmPct >= 20 ? 25 : npmPct >= 12 ? 18 : npmPct >= 6 ? 12 : npmPct >= 0 ? 5 : 0 }
            if (roePct) { ssMax += 20; ss += roePct >= 20 ? 20 : roePct >= 12 ? 14 : roePct >= 6 ? 8 : roePct >= 0 ? 3 : 0 }
            ssMax += 10; ss += dps > 0 ? (dps / Math.max(price, 1) >= 0.05 ? 10 : 6) : 0
            const pos52 = high52 > low52 ? (price - low52) / (high52 - low52) : 0.5
            ssMax += 20; ss += pos52 <= 0.25 ? 20 : pos52 <= 0.45 ? 15 : pos52 <= 0.65 ? 10 : pos52 <= 0.85 ? 5 : 2
            const score = ssMax > 0 ? Math.round((ss / ssMax) * 100) : null
            const grade = score !== null ? (score >= 75 ? 'Excellent' : score >= 55 ? 'Good' : score >= 35 ? 'Fair' : 'Weak') : '-'
            const iScore = !isFinancialR && grahamIV > 0 ? Math.min(100, Math.round(Math.min(grahamIV / Math.max(price, 1), 2) * 50)) : null
            return (
              <>
                <Row label="Intrinsic Score (0-100)"  value={iScore !== null ? `${iScore} / 100` : 'N/A'} />
                <Row label="Margin of Safety"          value={!isFinancialR && mos !== null ? `${mos >= 0 ? '+' : ''}${mos}%` : 'N/A'} />
                <Row label="Stockifyy Score (0-100)"  value={score !== null ? `${score} / 100` : '-'} highlight />
                <Row label="Overall Grade"             value={grade} />
              </>
            )
          })()}
        </Section>
      </div>

      {/* Company profile */}
      {profile?.profile?.data?.description && (
        <Section title="Business Description">
          <p className="text-xs leading-relaxed py-3" style={{ color: 'var(--text-secondary)' }}>
            {profile.profile.data.description}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3">
            {profile.profile.data.sector_name && <Row label="Sector"   value={profile.profile.data.sector_name} />}
            {profile.profile.data.auditors     && <Row label="Auditors" value={profile.profile.data.auditors} />}
            {profile.profile.data.offices?.[0] && <Row label="Office"   value={profile.profile.data.offices[0]} />}
          </div>
        </Section>
      )}

      {/* Recent announcements */}
      {anns.length > 0 && (
        <Section title="Recent Corporate Announcements">
          <div className="py-1">
            {anns.slice(0, 5).map((ann, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5"
                style={{ borderBottom: i < 4 ? '1px solid var(--bg-border)' : 'none' }}>
                <span className="text-[10px] shrink-0 w-14 pt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {new Date(ann.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ann.title}</p>
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{ann.announcementType}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--text-muted)' }}>
        This report is auto-generated from PSX public data. Scores are algorithmic estimates. Not financial advice.
      </p>
    </div>
  )
}
