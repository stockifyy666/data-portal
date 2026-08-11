// =============================================================================
// FILE: app/api/market/[symbol]/financials/route.ts
// PURPOSE: Returns financial statements and key metrics for a company.
//          Supports query parameter ?type to select which data to return:
//            ?type=ratios     → P/E, P/B, ROE, EPS, Dividend Yield
//            ?type=income     → Annual income statement
//            ?type=balance    → Annual balance sheet
//            ?type=cashflow   → Annual cash flow statement
//
//          CACHING: 24 hours — financial statements are filed quarterly
//          so this data changes at most 4 times per year.
//          This saves the most Capital Stake API budget of all endpoints.
//
//          URL example: GET /api/market/DGKC/financials?type=ratios
// =============================================================================

import { NextRequest, NextResponse }         from 'next/server'
import { createClient }                      from '@/lib/supabase/server'
import { csGet }                             from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                      from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }            from '@/lib/redis/cache'
import { trackCSAPICall }                    from '@/lib/utils/rateLimit'
import type { CSResponse, FinancialRow }     from '@/types/market'

const VALID_TYPES = ['ratios', 'income', 'balance', 'cashflow'] as const
type FinancialType = typeof VALID_TYPES[number]

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase()
    const type = (request.nextUrl.searchParams.get('type') ?? 'ratios') as FinancialType

    if (!/^[A-Z]{2,6}$/.test(symbol)) {
      return NextResponse.json({ error: `Invalid symbol: ${symbol}` }, { status: 400 })
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Use: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Map financial type to endpoint and cache key
    const endpointMap: Record<FinancialType, string> = {
      ratios:   CS_ENDPOINTS.FINANCIAL_RATIOS(symbol),
      income:   CS_ENDPOINTS.ANNUAL_INCOME(symbol),
      balance:  CS_ENDPOINTS.ANNUAL_BALANCE_SHEET(symbol),
      cashflow: CS_ENDPOINTS.ANNUAL_CASHFLOW(symbol),
    }

    const cacheKey = `stock:financials:${type}:${symbol}`

    const data = await withCache<CSResponse<FinancialRow[]>>(
      cacheKey,
      TTL_SECONDS.FINANCIALS,    // 24 hours
      async () => {
        const endpoint = endpointMap[type]
        await trackCSAPICall(endpoint)
        return csGet<CSResponse<FinancialRow[]>>(endpoint)
      }
    )

    return NextResponse.json(data, { status: 200 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[API /market/${params.symbol}/financials]`, message)
    return NextResponse.json(
      { error: 'Failed to fetch financials', details: message },
      { status: 500 }
    )
  }
}
