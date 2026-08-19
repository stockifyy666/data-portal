'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/* ── Shared UI ──────────────────────────────────────────────────────── */
function Field({
  label, value, onChange, type = 'number', min, step, prefix, suffix, options,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; min?: string; step?: string; prefix?: string; suffix?: string
  options?: string[]
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-muted)' }}>{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none"
          style={{ backgroundColor:'var(--bg-hover)', borderColor:'var(--bg-border)', color:'var(--text-primary)' }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
              style={{ color:'var(--text-muted)' }}>{prefix}</span>
          )}
          <input type={type} value={value} min={min} step={step}
            onChange={e => onChange(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none"
            style={{
              backgroundColor:'var(--bg-hover)', borderColor:'var(--bg-border)', color:'var(--text-primary)',
              paddingLeft: prefix ? '2.2rem' : undefined,
              paddingRight: suffix ? '2.8rem' : undefined,
            }} />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
              style={{ color:'var(--text-muted)' }}>{suffix}</span>
          )}
        </div>
      )}
    </div>
  )
}

function CalcBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
      style={{ background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }}>
      Calculate
    </button>
  )
}

function ResultCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: accent ? 'rgba(254,165,0,0.1)' : 'var(--bg-hover)',
               border: accent ? '1px solid rgba(254,165,0,0.3)' : '1px solid var(--bg-border)' }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>{label}</span>
      <span className="text-lg font-bold font-number" style={{ color: accent ? '#FEA500' : 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function TableView({ headers, rows }: { headers: string[]; rows: (string|number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border:'1px solid var(--bg-border)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor:'var(--bg-hover)', borderBottom:'1px solid var(--bg-border)' }}>
            {headers.map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider"
                style={{ color:'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i<rows.length-1 ? '1px solid var(--bg-border)' : 'none',
                                  backgroundColor: i%2===0?'transparent':'var(--bg-hover)' }}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 font-number tabular-nums"
                  style={{ color: j===0?'var(--text-secondary)':'var(--text-primary)', fontWeight: j===row.length-1?700:400 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BarChart({ data, labelKey, valueKey, color = '#FEA500', prefix = '' }:
  { data: Record<string,string|number>[]; labelKey: string; valueKey: string; color?: string; prefix?: string }) {
  const vals = data.map(d => Number(d[valueKey]) || 0)
  const max  = Math.max(...vals, 1)
  const barW = Math.max(28, Math.min(56, Math.floor(520 / data.length)))
  const barH = 140

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: data.length * barW + 48 }}>
        <svg width={data.length * barW + 48} height={barH + 48} style={{ display:'block' }}>
          {/* Grid lines */}
          {[0,0.25,0.5,0.75,1].map(t => {
            const y = barH - t * barH + 8
            return (
              <g key={t}>
                <line x1={36} y1={y} x2={data.length*barW+44} y2={y} stroke="var(--bg-border)" strokeWidth="1" strokeDasharray="3 3"/>
                <text x={30} y={y+3} textAnchor="end" style={{ fontSize:8, fill:'var(--text-muted)' }}>
                  {prefix}{(t*max/1e6>=1 ? (t*max/1e6).toFixed(1)+'M' : t*max>=1e3 ? (t*max/1e3).toFixed(0)+'K' : (t*max).toFixed(0))}
                </text>
              </g>
            )
          })}
          {/* Bars */}
          {data.map((d, i) => {
            const v = Number(d[valueKey]) || 0
            const h = Math.max(2, (v/max) * (barH - 4))
            const x = 40 + i * barW + (barW - Math.min(barW*0.65, 36)) / 2
            const w = Math.min(barW * 0.65, 36)
            const y = barH - h + 8
            return (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} rx={3} fill={color} opacity={i===data.length-1?1:0.65}/>
                <text x={x + w/2} y={barH + 20} textAnchor="middle"
                  style={{ fontSize:9, fill:'var(--text-muted)' }}>
                  {String(d[labelKey])}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function fmt(n: number, dec = 0) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtRs(n: number) { return `Rs ${fmt(n, 0)}` }
function fmtPct(n: number) { return `${n.toFixed(2)}%` }

/* ── ROI ─────────────────────────────────────────────────────────── */
function ROICalc() {
  const [inv,  setInv]  = useState('100000')
  const [fin,  setFin]  = useState('150000')
  const [yrs,  setYrs]  = useState('3')
  const [res,  setRes]  = useState<null|{roi:number;profit:number;annRet:number}>(null)

  function calc() {
    const i = parseFloat(inv)||0, f = parseFloat(fin)||0, y = parseFloat(yrs)||1
    const profit = f - i
    const roi    = (profit / i) * 100
    const annRet = (Math.pow(f/i, 1/y) - 1) * 100
    setRes({ roi, profit, annRet })
  }

  const tableRows = res ? [
    ['Initial Investment', fmtRs(parseFloat(inv))],
    ['Final Value',        fmtRs(parseFloat(fin))],
    ['Net Profit / Loss',  fmtRs(res.profit)],
    ['ROI',                fmtPct(res.roi)],
    ['Annualized Return',  fmtPct(res.annRet)],
  ] : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Initial Investment (Rs)" value={inv} onChange={setInv} prefix="Rs" />
        <Field label="Final Value (Rs)"         value={fin} onChange={setFin} prefix="Rs" />
        <Field label="Duration (Years)"          value={yrs} onChange={setYrs} min="1" step="1" />
      </div>
      <CalcBtn onClick={calc} />
      {res && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="ROI"               value={fmtPct(res.roi)}    accent />
            <ResultCard label="Net Profit / Loss"  value={fmtRs(res.profit)} />
            <ResultCard label="Annualized Return"  value={fmtPct(res.annRet)} />
            <ResultCard label="Total Value"        value={fmtRs(parseFloat(fin))} />
          </div>
          <TableView headers={['Metric','Value']} rows={tableRows} />
          <BarChart data={[
            { label:'Invested', val: parseFloat(inv) },
            { label:'Return',   val: Math.max(0, res.profit) },
            { label:'Final',    val: parseFloat(fin) },
          ]} labelKey="label" valueKey="val" />
        </>
      )}
    </div>
  )
}

/* ── CAGR ────────────────────────────────────────────────────────── */
function CAGRCalc() {
  const [beg,  setBeg]  = useState('100000')
  const [end,  setEnd]  = useState('200000')
  const [yrs,  setYrs]  = useState('5')
  const [rows, setRows] = useState<(string|number)[][]>([])
  const [cagr, setCagr] = useState<number|null>(null)

  function calc() {
    const b = parseFloat(beg)||0, e = parseFloat(end)||0, y = parseInt(yrs)||1
    const c = (Math.pow(e/b, 1/y) - 1) * 100
    setCagr(c)
    const r: (string|number)[][] = []
    for (let i = 0; i <= y; i++) {
      const val = b * Math.pow(1 + c/100, i)
      r.push([i === 0 ? 'Start' : `Year ${i}`, fmtRs(val), i===0?'—':fmtPct(c)])
    }
    setRows(r)
  }

  const chartData = rows.map(r => ({ label: r[0], val: parseFloat(String(r[1]).replace(/[^0-9.]/g,'')) }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Beginning Value (Rs)" value={beg} onChange={setBeg} prefix="Rs" />
        <Field label="Ending Value (Rs)"    value={end} onChange={setEnd} prefix="Rs" />
        <Field label="Number of Years"       value={yrs} onChange={setYrs} min="1" step="1" />
      </div>
      <CalcBtn onClick={calc} />
      {cagr !== null && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ResultCard label="CAGR"          value={fmtPct(cagr)} accent />
            <ResultCard label="Beginning"     value={fmtRs(parseFloat(beg))} />
            <ResultCard label="Ending"        value={fmtRs(parseFloat(end))} />
          </div>
          <TableView headers={['Period','Value','Annual Growth']} rows={rows} />
          <BarChart data={chartData} labelKey="label" valueKey="val" />
        </>
      )}
    </div>
  )
}

/* ── SIP ─────────────────────────────────────────────────────────── */
function SIPCalc() {
  const [monthly, setMonthly] = useState('10000')
  const [rate,    setRate]    = useState('12')
  const [yrs,     setYrs]     = useState('10')
  const [rows,    setRows]    = useState<(string|number)[][]>([])
  const [summary, setSummary] = useState<{invested:number;returns:number;maturity:number}|null>(null)

  function calc() {
    const m = parseFloat(monthly)||0
    const r = (parseFloat(rate)||0) / 100 / 12
    const n = (parseInt(yrs)||0) * 12
    const maturity = r > 0 ? m * ((Math.pow(1+r,n)-1)/r) * (1+r) : m * n
    const invested = m * n
    const returns  = maturity - invested
    setSummary({ invested, returns, maturity })

    const tableData: (string|number)[][] = []
    for (let y = 1; y <= parseInt(yrs); y++) {
      const months = y * 12
      const mat    = r > 0 ? m * ((Math.pow(1+r,months)-1)/r)*(1+r) : m*months
      const inv    = m * months
      tableData.push([`Year ${y}`, fmtRs(inv), fmtRs(mat-inv), fmtRs(mat)])
    }
    setRows(tableData)
  }

  const chartData = rows.map(r => ({ label: String(r[0]).replace('Year ','Y'), val: parseFloat(String(r[3]).replace(/[^0-9.]/g,'')) }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Monthly Investment (Rs)" value={monthly} onChange={setMonthly} prefix="Rs" />
        <Field label="Expected Annual Return"  value={rate}    onChange={setRate}    suffix="%" />
        <Field label="Investment Period (Yrs)" value={yrs}     onChange={setYrs}     min="1" step="1" />
      </div>
      <CalcBtn onClick={calc} />
      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ResultCard label="Total Invested"  value={fmtRs(summary.invested)} />
            <ResultCard label="Est. Returns"    value={fmtRs(summary.returns)} />
            <ResultCard label="Maturity Amount" value={fmtRs(summary.maturity)} accent />
          </div>
          <TableView headers={['Year','Invested','Returns','Maturity']} rows={rows} />
          <BarChart data={chartData} labelKey="label" valueKey="val" />
        </>
      )}
    </div>
  )
}

/* ── Compounding ─────────────────────────────────────────────────── */
function CompoundingCalc() {
  const [principal, setPrincipal] = useState('100000')
  const [rate,      setRate]      = useState('10')
  const [freq,      setFreq]      = useState('Monthly')
  const [yrs,       setYrs]       = useState('5')
  const [rows,      setRows]      = useState<(string|number)[][]>([])
  const [total,     setTotal]     = useState<{amount:number;interest:number}|null>(null)

  const FREQ_MAP: Record<string,number> = { Monthly:12, Quarterly:4, 'Semi-Annual':2, Annual:1 }

  function calc() {
    const P = parseFloat(principal)||0
    const r = (parseFloat(rate)||0) / 100
    const n = FREQ_MAP[freq] ?? 12
    const t = parseInt(yrs)||0
    const tableData: (string|number)[][] = []
    let prevAmount = P
    for (let y = 1; y <= t; y++) {
      const amount    = P * Math.pow(1 + r/n, n*y)
      const yearGrowth = amount - prevAmount   // growth this year only
      tableData.push([`Year ${y}`, fmtRs(prevAmount), fmtRs(yearGrowth), fmtRs(amount)])
      prevAmount = amount
    }
    setRows(tableData)
    const final = P * Math.pow(1 + r/n, n*t)
    setTotal({ amount: final, interest: final - P })
  }

  const chartData = rows.map(r => ({ label: String(r[0]).replace('Year ','Y'), val: parseFloat(String(r[3]).replace(/[^0-9.]/g,'')) }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Principal (Rs)"    value={principal} onChange={setPrincipal} prefix="Rs" />
        <Field label="Annual Rate"       value={rate}      onChange={setRate}      suffix="%" />
        <Field label="Compounding"       value={freq}      onChange={setFreq}
          options={['Monthly','Quarterly','Semi-Annual','Annual']} />
        <Field label="Duration (Years)"  value={yrs}       onChange={setYrs}      min="1" step="1" />
      </div>
      <CalcBtn onClick={calc} />
      {total && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ResultCard label="Initial Principal"  value={fmtRs(parseFloat(principal))} />
            <ResultCard label="Total Growth"       value={fmtRs(total.interest)} />
            <ResultCard label="Final Amount"       value={fmtRs(total.amount)} accent />
          </div>
          <TableView headers={['Year','Opening Balance','Annual Growth','Closing Balance']} rows={rows} />
          <BarChart data={chartData} labelKey="label" valueKey="val" />
        </>
      )}
    </div>
  )
}

/* ── DCF ─────────────────────────────────────────────────────────── */
function DCFCalc() {
  const [cf0,      setCf0]      = useState('500000')
  const [growth,   setGrowth]   = useState('5')
  const [discount, setDiscount] = useState('10')
  const [years,    setYears]    = useState('5')
  const [rows,     setRows]     = useState<(string|number)[][]>([])
  const [npv,      setNpv]      = useState<number|null>(null)

  function calc() {
    const cf  = parseFloat(cf0)||0
    const g   = (parseFloat(growth)||0) / 100
    const d   = (parseFloat(discount)||0) / 100
    const y   = parseInt(years)||5
    let totalNPV = 0
    const tableData: (string|number)[][] = []
    for (let i = 1; i <= y; i++) {
      const futureCF = cf * Math.pow(1+g, i)
      const pv       = futureCF / Math.pow(1+d, i)
      totalNPV += pv
      tableData.push([`Year ${i}`, fmtRs(futureCF), fmtPct(d*100), fmtRs(pv)])
    }
    setRows(tableData)
    setNpv(totalNPV)
  }

  const chartData = rows.map(r => ({ label: String(r[0]).replace('Year ','Y'), val: parseFloat(String(r[3]).replace(/[^0-9.]/g,'')) }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Base Cash Flow (Rs)"  value={cf0}      onChange={setCf0}      prefix="Rs" />
        <Field label="Growth Rate"          value={growth}   onChange={setGrowth}   suffix="%" />
        <Field label="Discount Rate"        value={discount} onChange={setDiscount} suffix="%" />
        <Field label="Projection Years"     value={years}    onChange={setYears}    min="1" step="1" />
      </div>
      <CalcBtn onClick={calc} />
      {npv !== null && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultCard label="Total NPV (Present Value)"  value={fmtRs(npv)} accent />
            <ResultCard label="Base Cash Flow"             value={fmtRs(parseFloat(cf0))} />
          </div>
          <TableView headers={['Year','Future Cash Flow','Discount Rate','Present Value']} rows={rows} />
          <BarChart data={chartData} labelKey="label" valueKey="val" />
        </>
      )}
    </div>
  )
}

/* ── Salary Tax (Pakistan FY 2024-25) ─────────────────────────────── */
const TAX_SLABS = [
  { min: 0,         max: 600_000,    rate: 0,    fixed: 0 },
  { min: 600_001,   max: 1_200_000,  rate: 0.05, fixed: 0 },
  { min: 1_200_001, max: 2_200_000,  rate: 0.15, fixed: 30_000 },
  { min: 2_200_001, max: 3_200_000,  rate: 0.25, fixed: 180_000 },
  { min: 3_200_001, max: 4_100_000,  rate: 0.30, fixed: 430_000 },
  { min: 4_100_001, max: Infinity,   rate: 0.35, fixed: 700_000 },
]

function SalaryTaxCalc() {
  const [salary, setSalary] = useState('1800000')
  const [res,    setRes]    = useState<{tax:number;effective:number;slab:string}|null>(null)

  function calc() {
    const ann = parseFloat(salary)||0
    let tax = 0, slabLabel = ''
    for (const s of TAX_SLABS) {
      if (ann >= s.min && ann <= s.max) {
        tax = s.fixed + (ann - s.min) * s.rate
        slabLabel = `${fmtPct(s.rate*100)} on income above Rs ${fmt(s.min)}`
        break
      }
    }
    setRes({ tax, effective: ann > 0 ? (tax/ann)*100 : 0, slab: slabLabel })
  }

  const slabRows: (string|number)[][] = TAX_SLABS.map((s,i) => [
    `Slab ${i+1}`,
    `Rs ${fmt(s.min)} – ${s.max===Infinity?'Above':('Rs '+fmt(s.max))}`,
    fmtPct(s.rate*100),
    i===0?'Nil':`Rs ${fmt(s.fixed)} + ${fmtPct(s.rate*100)} on excess`,
  ])

  const ann = parseFloat(salary)||0
  const tax = res?.tax ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Annual Salary (Rs)" value={salary} onChange={setSalary} prefix="Rs" />
        <div className="flex items-end">
          <div className="w-full text-[11px] px-3 py-2 rounded-lg" style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-muted)' }}>
            FY 2024-25 Pakistan income tax slabs for salaried individuals
          </div>
        </div>
      </div>
      <CalcBtn onClick={calc} />
      {res && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="Annual Salary"  value={fmtRs(ann)} />
            <ResultCard label="Annual Tax"     value={fmtRs(res.tax)} accent />
            <ResultCard label="Effective Rate" value={fmtPct(res.effective)} />
            <ResultCard label="Monthly Tax"    value={fmtRs(res.tax/12)} />
          </div>
          <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor:'rgba(254,165,0,0.08)', border:'1px solid rgba(254,165,0,0.25)', color:'var(--text-secondary)' }}>
            Tax slab applied: {res.slab}
          </div>
          <p className="text-xs font-bold" style={{ color:'var(--text-muted)' }}>Pakistan FY 2024-25 Tax Slabs</p>
          <TableView headers={['Slab','Income Range','Tax Rate','Formula']} rows={slabRows} />
          <BarChart data={[
            { label:'Gross',  val: ann },
            { label:'Tax',    val: tax },
            { label:'Net',    val: ann - tax },
          ]} labelKey="label" valueKey="val" color="#dc2626" />
        </>
      )}
    </div>
  )
}

/* ── Depreciation ────────────────────────────────────────────────── */
function DepreciationCalc() {
  const [cost,    setCost]    = useState('500000')
  const [salvage, setSalvage] = useState('50000')
  const [life,    setLife]    = useState('5')
  const [method,  setMethod]  = useState('Straight Line')
  const [rows,    setRows]    = useState<(string|number)[][]>([])

  function calc() {
    const C  = parseFloat(cost)||0
    const S  = parseFloat(salvage)||0
    const L  = parseInt(life)||1
    const tableData: (string|number)[][] = []
    let bookVal = C

    for (let y = 1; y <= L; y++) {
      let dep = 0
      if (method === 'Straight Line') {
        dep = (C - S) / L
      } else if (method === 'Declining Balance') {
        const rate = 1 / L
        dep = bookVal * rate
      } else {
        const rate = 2 / L
        dep = bookVal * rate
        if (bookVal - dep < S) dep = Math.max(0, bookVal - S)
      }
      bookVal = Math.max(S, bookVal - dep)
      tableData.push([`Year ${y}`, fmtRs(dep), fmtRs(bookVal), fmtRs(C - bookVal)])
    }
    setRows(tableData)
  }

  const chartData = rows.map(r => ({ label: String(r[0]).replace('Year ','Y'), val: parseFloat(String(r[1]).replace(/[^0-9.]/g,'')) }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Asset Cost (Rs)"    value={cost}    onChange={setCost}    prefix="Rs" />
        <Field label="Salvage Value (Rs)" value={salvage} onChange={setSalvage} prefix="Rs" />
        <Field label="Useful Life (Yrs)"  value={life}    onChange={setLife}    min="1" step="1" />
        <Field label="Method"             value={method}  onChange={setMethod}
          options={['Straight Line','Declining Balance','Double Declining']} />
      </div>
      <CalcBtn onClick={calc} />
      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ResultCard label="Asset Cost"    value={fmtRs(parseFloat(cost))} />
            <ResultCard label="Salvage Value" value={fmtRs(parseFloat(salvage))} />
            <ResultCard label="Total Depreciation" value={fmtRs(parseFloat(cost)-parseFloat(salvage))} accent />
          </div>
          <TableView headers={['Year','Depreciation','Book Value','Accumulated Dep.']} rows={rows} />
          <BarChart data={chartData} labelKey="label" valueKey="val" color="#3b82f6" />
        </>
      )}
    </div>
  )
}

/* ── Exchange Rate ───────────────────────────────────────────────── */
const CURRENCIES = ['PKR','USD','EUR','GBP','SAR','AED','CAD','AUD','CNY','JPY']

function ExchangeRateCalc() {
  const [amount, setAmount] = useState('1000')
  const [from,   setFrom]   = useState('PKR')
  const [to,     setTo]     = useState('USD')
  const [rate,   setRate]   = useState('278.50')
  const [res,    setRes]    = useState<{converted:number;inverse:number}|null>(null)

  function calc() {
    const a = parseFloat(amount)||0
    const r = parseFloat(rate)||1
    const converted = from === 'PKR' ? a / r : a * r
    const inverse   = 1 / r
    setRes({ converted, inverse })
  }

  const rows: (string|number)[][] = res ? [
    [`1 ${from}`,   `${(from==='PKR'?1/parseFloat(rate):parseFloat(rate)).toFixed(4)} ${to}`],
    [`1 ${to}`,     `${(from==='PKR'?parseFloat(rate):1/parseFloat(rate)).toFixed(4)} ${from}`],
    [parseFloat(amount).toFixed(2)+' '+from, `${res.converted.toFixed(2)} ${to}`],
  ] : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Amount"            value={amount} onChange={setAmount} />
        <Field label="From Currency"     value={from}   onChange={setFrom}   options={CURRENCIES} />
        <Field label="To Currency"       value={to}     onChange={setTo}     options={CURRENCIES} />
        <Field label="Exchange Rate (1 From = ? To)" value={rate} onChange={setRate} step="0.01" />
      </div>
      <div className="text-[11px] px-3 py-2 rounded-lg" style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-muted)' }}>
        Enter the current exchange rate manually (e.g. 1 USD = 278.50 PKR → enter 278.50 with PKR→USD selected)
      </div>
      <CalcBtn onClick={calc} />
      {res && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultCard label={`Converted (${to})`} value={`${res.converted.toFixed(4)} ${to}`} accent />
            <ResultCard label={`Rate (1 ${to})`}    value={`${(1/parseFloat(rate)).toFixed(4)} ${from}`} />
          </div>
          <TableView headers={['Conversion','Result']} rows={rows} />
          <BarChart data={[
            { label:'Input', val: parseFloat(amount) },
            { label:'Output (×rate)', val: res.converted * (parseFloat(rate)||1) },
          ]} labelKey="label" valueKey="val" color="#16a34a" />
        </>
      )}
    </div>
  )
}

/* ── Zakat ───────────────────────────────────────────────────────── */
function ZakatCalc() {
  const [cash,        setCash]        = useState('500000')
  const [goldTola,    setGoldTola]    = useState('0')
  const [goldPrice,   setGoldPrice]   = useState('0')   // Rs per Tola
  const [silverTola,  setSilverTola]  = useState('0')
  const [silverPrice, setSilverPrice] = useState('0')   // Rs per Tola
  const [stocks,      setStocks]      = useState('0')
  const [biz,         setBiz]         = useState('0')
  const [recv,        setRecv]        = useState('0')
  const [liab,        setLiab]        = useState('0')
  const [nisab,       setNisab]       = useState('95000')
  const [res,         setRes]         = useState<{zakatable:number;zakat:number;belowNisab:boolean}|null>(null)

  const goldValue   = (parseFloat(goldTola)||0)   * (parseFloat(goldPrice)||0)
  const silverValue = (parseFloat(silverTola)||0) * (parseFloat(silverPrice)||0)

  function calc() {
    const total      = (parseFloat(cash)||0) + goldValue + silverValue +
                       (parseFloat(stocks)||0) + (parseFloat(biz)||0) + (parseFloat(recv)||0)
    const liabs      = parseFloat(liab)||0
    const nisabVal   = parseFloat(nisab)||0
    const zakatable  = Math.max(0, total - liabs)
    const belowNisab = zakatable < nisabVal
    setRes({ zakatable, zakat: belowNisab ? 0 : zakatable * 0.025, belowNisab })
  }

  const total = (parseFloat(cash)||0) + goldValue + silverValue +
                (parseFloat(stocks)||0) + (parseFloat(biz)||0) + (parseFloat(recv)||0)
  const rows: (string|number)[][] = [
    ['Cash & Bank',       fmtRs(parseFloat(cash)||0)],
    ['Gold',              fmtRs(goldValue)],
    ['Silver',            fmtRs(silverValue)],
    ['Stocks/Investments',fmtRs(parseFloat(stocks)||0)],
    ['Business Inventory',fmtRs(parseFloat(biz)||0)],
    ['Receivables',       fmtRs(parseFloat(recv)||0)],
    ['Total Assets',      fmtRs(total)],
    ['Liabilities',       `(${fmtRs(parseFloat(liab)||0)})`],
    ['Zakatable Assets',  fmtRs(res?.zakatable??0)],
    ['Zakat @ 2.5%',      fmtRs(res?.zakat??0)],
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Cash & Bank Savings"      value={cash}        onChange={setCash}        prefix="Rs" />
        <Field label="Gold (Tola)"              value={goldTola}    onChange={setGoldTola}    suffix="Tola" />
        <Field label="Gold Price / Tola"        value={goldPrice}   onChange={setGoldPrice}   prefix="Rs" />
        <Field label="Silver (Tola)"            value={silverTola}  onChange={setSilverTola}  suffix="Tola" />
        <Field label="Silver Price / Tola"      value={silverPrice} onChange={setSilverPrice} prefix="Rs" />
        <Field label="Stocks / Investments"     value={stocks}      onChange={setStocks}      prefix="Rs" />
        <Field label="Business Inventory"       value={biz}         onChange={setBiz}         prefix="Rs" />
        <Field label="Receivables"              value={recv}        onChange={setRecv}        prefix="Rs" />
        <Field label="Liabilities (Deduct)"     value={liab}        onChange={setLiab}        prefix="Rs" />
        <Field label="Nisab Threshold (Rs)"     value={nisab}       onChange={setNisab}       prefix="Rs" />
      </div>
      <div className="text-[11px] px-3 py-2 rounded-lg" style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-muted)' }}>
        Nisab: 7.5 Tola gold or 52.5 Tola silver (1 Tola = 11.664g). Enter quantity in Tola and current market price per Tola.
      </div>
      <CalcBtn onClick={calc} />
      {res && (
        <>
          {res.belowNisab && (
            <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor:'rgba(22,163,74,0.1)', color:'#16a34a', border:'1px solid rgba(22,163,74,0.25)' }}>
              Your zakatable assets (Rs {fmt(res.zakatable)}) are below the Nisab threshold — Zakat is not obligatory this year.
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="Total Assets"     value={fmtRs(total)} />
            <ResultCard label="Zakatable Assets" value={fmtRs(res.zakatable)} />
            <ResultCard label="Zakat Due (2.5%)" value={fmtRs(res.zakat)} accent />
            <ResultCard label="Nisab"            value={fmtRs(parseFloat(nisab))} />
          </div>
          <TableView headers={['Item','Amount']} rows={rows} />
          <BarChart data={[
            { label:'Zakatable', val: res.zakatable },
            { label:'Zakat',     val: res.zakat },
          ]} labelKey="label" valueKey="val" color="#a855f7" />
        </>
      )}
    </div>
  )
}

/* ── Meta config ─────────────────────────────────────────────────── */
const CALC_META: Record<string,{ title:string; icon:string; desc:string; component: React.ComponentType }> = {
  'roi':           { title:'ROI Calculator',           icon:'📈', desc:'Return on Investment',                component: ROICalc },
  'cagr':          { title:'CAGR Calculator',          icon:'📊', desc:'Compound Annual Growth Rate',         component: CAGRCalc },
  'sip':           { title:'SIP Calculator',           icon:'💰', desc:'Systematic Investment Plan',          component: SIPCalc },
  'compounding':   { title:'Compounding Calculator',   icon:'🔁', desc:'Compound Interest Growth',            component: CompoundingCalc },
  'dcf':           { title:'DCF Calculator',           icon:'🏦', desc:'Discounted Cash Flow',                component: DCFCalc },
  'salary-tax':    { title:'Salary Tax Calculator',    icon:'🧾', desc:'Pakistan Income Tax (FY 2024-25)',    component: SalaryTaxCalc },
  'depreciation':  { title:'Depreciation Calculator',  icon:'⚙️', desc:'Asset Depreciation Schedules',       component: DepreciationCalc },
  'exchange-rate': { title:'Exchange Rate Calculator', icon:'💱', desc:'Currency Conversion',                 component: ExchangeRateCalc },
  'zakat':         { title:'Zakat Calculator',         icon:'☪️', desc:'Annual Zakat (2.5%)',                 component: ZakatCalc },
}

/* ── Main export ─────────────────────────────────────────────────── */
export default function CalculatorClient({ calc }: { calc: string }) {
  const meta = CALC_META[calc]
  if (!meta) return null
  const Component = meta.component

  return (
    <div className="space-y-6 animate-data">
      {/* Back + header */}
      <div>
        <Link href="/tools" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 hover:opacity-70 transition-opacity"
          style={{ color:'var(--text-muted)' }}>
          <ArrowLeft size={13} /> Back to Tools
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background:'linear-gradient(135deg,#FEA500,#986300)' }}>
            {meta.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color:'var(--text-primary)' }}>{meta.title}</h1>
            <p className="text-sm" style={{ color:'var(--text-secondary)' }}>{meta.desc}</p>
          </div>
        </div>
      </div>

      {/* Calculator card */}
      <div className="card">
        <Component />
      </div>
    </div>
  )
}
