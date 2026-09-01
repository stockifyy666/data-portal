import Link from 'next/link'

const PSX_CALCS = [
  {
    slug:  'position-size',
    label: 'PSX Position Size Calculator',
    desc:  'Risk-based position sizing — shares to buy, capital at risk, R:R ratio & break-even price',
    icon:  '🎯',
  },
]

const INVESTMENT_CALCS = [
  {
    slug:  'roi',
    label: 'ROI Calculator',
    desc:  'Return on Investment — measure profit or loss relative to cost',
    icon:  '📈',
  },
  {
    slug:  'cagr',
    label: 'CAGR Calculator',
    desc:  'Compound Annual Growth Rate — smooth annualized growth between two values',
    icon:  '📊',
  },
  {
    slug:  'sip',
    label: 'SIP Calculator',
    desc:  'Systematic Investment Plan — project wealth from regular monthly investments',
    icon:  '💰',
  },
  {
    slug:  'compounding',
    label: 'Compounding Calculator',
    desc:  'See how interest compounds over time at different frequencies',
    icon:  '🔁',
  },
  {
    slug:  'dcf',
    label: 'DCF Calculator',
    desc:  'Discounted Cash Flow — estimate the present value of future cash flows',
    icon:  '🏦',
  },
]

const TAX_CALCS = [
  {
    slug:  'salary-tax',
    label: 'Salary Tax Calculator',
    desc:  'Pakistan income tax on salary (FY 2024-25 slabs)',
    icon:  '🧾',
  },
  {
    slug:  'depreciation',
    label: 'Depreciation Calculator',
    desc:  'Straight-line, declining balance & double-declining depreciation schedules',
    icon:  '⚙️',
  },
  {
    slug:  'exchange-rate',
    label: 'Exchange Rate Calculator',
    desc:  'Convert between PKR and major currencies at any rate',
    icon:  '💱',
  },
  {
    slug:  'zakat',
    label: 'Zakat Calculator',
    desc:  'Calculate annual Zakat (2.5%) on savings, gold, silver & investments',
    icon:  '☪️',
  },
]

function CalcCard({ slug, label, desc, icon }: { slug: string; label: string; desc: string; icon: string }) {
  return (
    <Link href={`/tools/${slug}`}
      className="group rounded-2xl p-5 flex flex-col gap-3 transition-all hover:scale-[1.02] active:scale-[0.99]"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold group-hover:text-amber-500 transition-colors"
            style={{ color: 'var(--text-primary)' }}>
            {label}
          </h3>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {desc}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[11px] font-semibold mt-auto" style={{ color: '#FEA500' }}>
        Open Calculator
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  )
}

export default function ToolsPage() {
  return (
    <div className="space-y-8 animate-data">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Financial Tools</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Calculators to plan investments, taxes, and financial decisions
        </p>
      </div>

      {/* PSX Trading Tools */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
            PSX Trading Tools
          </div>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PSX_CALCS.map(c => <CalcCard key={c.slug} {...c} />)}
        </div>
      </section>

      {/* Investment Calculators */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
            Investment Calculators
          </div>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INVESTMENT_CALCS.map(c => <CalcCard key={c.slug} {...c} />)}
        </div>
      </section>

      {/* Tax & Financial Calculators */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#FEA500,#986300)' }}>
            Tax &amp; Financial Calculators
          </div>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TAX_CALCS.map(c => <CalcCard key={c.slug} {...c} />)}
        </div>
      </section>
    </div>
  )
}
