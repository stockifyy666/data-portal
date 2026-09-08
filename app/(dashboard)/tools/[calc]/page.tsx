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
