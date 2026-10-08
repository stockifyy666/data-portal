// =============================================================================
// FILE: app/(dashboard)/tools/[calc]/page.tsx
// PURPOSE: Financial calculators page. Routes to the correct calculator component based
//           on the [calc] slug (e.g. zakat, profit, brokerage, dividend).
// =============================================================================
import { notFound } from 'next/navigation'
import CalculatorClient from '@/components/tools/CalculatorClient'

const VALID_CALCS = [
  'position-size',
  'roi','cagr','sip','compounding','dcf',
  'salary-tax','depreciation','exchange-rate','zakat',
]

export default async function CalcPage({ params }: { params: Promise<{ calc: string }> }) {
  const { calc } = await params
  if (!VALID_CALCS.includes(calc)) notFound()
  return <CalculatorClient calc={calc} />
}
