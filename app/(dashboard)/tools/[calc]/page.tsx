import { notFound } from 'next/navigation'
import CalculatorClient from '@/components/tools/CalculatorClient'

const VALID_CALCS = [
  'roi','cagr','sip','compounding','dcf',
  'salary-tax','depreciation','exchange-rate','zakat',
]

export default function CalcPage({ params }: { params: { calc: string } }) {
  if (!VALID_CALCS.includes(params.calc)) notFound()
  return <CalculatorClient calc={params.calc} />
}
