import { NextRequest, NextResponse }  from 'next/server'
import { createClient }               from '@/lib/supabase/server'
import { getStatement }               from '@/lib/supabase/financials'
import { csUatGet }                   from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }               from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }     from '@/lib/redis/cache'
import { trackChartAPICall }          from '@/lib/utils/rateLimit'
import type { StatementData }         from '@/components/stock/stock-detail-types'

const VALID_TYPES = ['ratios', 'income', 'balance', 'cashflow'] as const
type FinancialType = typeof VALID_TYPES[number]

const TYPE_MAP: Record<FinancialType, 'income' | 'balance' | 'cashflow' | 'fundamentals'> = {
  ratios:   'fundamentals',
  income:   'income',
  balance:  'balance',
  cashflow: 'cashflow',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: rawSymbol } = await params
    const symbol = rawSymbol.toUpperCase()
    const type = (request.nextUrl.searchParams.get('type') ?? 'ratios') as FinancialType

    if (!/^[A-Z0-9]{2,10}$/.test(symbol)) {
      return NextResponse.json({ error: `Invalid symbol: ${symbol}` }, { status: 400 })
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Use: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stmtType = TYPE_MAP[type]
    const interval = 'annual' as const

    // 1. Supabase DB first (free, unlimited, nightly refresh)
    const cached = await getStatement(symbol, stmtType, interval)
    if (cached) return NextResponse.json({ data: cached })

    // 2. DB miss — fetch from UAT
    const data = await withCache(
      `stock:statement:uat:${symbol}:${stmtType}:${interval}`,
      TTL_SECONDS.FINANCIALS,
      async () => {
        if (stmtType === 'fundamentals') {
          const url = CS_ENDPOINTS.COMPANY_FUNDAMENTALS(symbol)
          await trackChartAPICall(url)
          const res = await csUatGet<{
            status: string
            data: { periods: string[]; fundamentals: Array<{ name: string; values: (number | null)[] }> }
          }>(url)
          const raw     = res.data
          const periods = (raw.periods ?? []).map((p: string) => ({
            year: p, period_end: p === 'TTM' ? new Date().toISOString().slice(0, 10) : `${p}-12-31`,
          }))
          const fields = (raw.fundamentals ?? []).map(f => ({ label: f.name, values: f.values, is_heading: false }))
          return { periods, fields } as StatementData
        }
        const url = CS_ENDPOINTS.COMPANY_FINANCIALS(symbol, stmtType as 'income' | 'balance' | 'cashflow', interval)
        await trackChartAPICall(url)
        const res = await csUatGet<{ status: string; data: StatementData }>(url)
        return res.data
      }
    )

    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /market/financials]', message)
    return NextResponse.json({ error: 'Failed to fetch financials', details: message }, { status: 500 })
  }
}
