import { NextRequest, NextResponse }              from 'next/server'
import { csUatGet }                               from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }                            from '@/lib/capitalstake/endpoints'
import { withCache, TTL_SECONDS }                  from '@/lib/redis/cache'
import { trackChartAPICall }                       from '@/lib/utils/rateLimit'
import { getStatement, saveStatement }             from '@/lib/supabase/financials'
import type { StatementData }                      from '@/components/stock/stock-detail-types'

const SYMBOL_RE   = /^[A-Z0-9]{2,10}$/
const VALID_TYPES = ['balance', 'income', 'cashflow', 'fundamentals', 'shareholders'] as const
const VALID_INT   = ['annual', 'quarterly'] as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol   = raw.toUpperCase()
    const type     = (req.nextUrl.searchParams.get('type')     ?? 'income') as typeof VALID_TYPES[number]
    const interval = (req.nextUrl.searchParams.get('interval') ?? 'annual') as typeof VALID_INT[number]

    if (!SYMBOL_RE.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Use: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }
    if (!VALID_INT.includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval. Use: annual | quarterly' }, { status: 400 })
    }

    // ── Income / Balance / Cashflow ────────────────────────────────────────────
    if (type === 'income' || type === 'balance' || type === 'cashflow') {
      const stmtType = type as 'income' | 'balance' | 'cashflow'

      // 1. Supabase DB first (free, unlimited, 24h fresh)
      const cached = await getStatement(symbol, stmtType, interval)
      if (cached) return NextResponse.json({ data: cached })

      // 2. DB miss — fetch from Capital Stake, persist to DB + Redis
      const data = await withCache(
        `stock:statement:uat:${symbol}:${stmtType}:${interval}`,
        TTL_SECONDS.FINANCIALS,
        async () => {
          const url = CS_ENDPOINTS.COMPANY_FINANCIALS(symbol, stmtType, interval)
          await trackChartAPICall(url)
          const res = await csUatGet<{ status: string; data: StatementData }>(url)
          return res.data
        }
      )

      // Persist to Supabase so next request serves from DB
      if (data) saveStatement(symbol, stmtType, interval, data, data).catch(() => {})

      return NextResponse.json({ data })
    }

    // ── Fundamentals ───────────────────────────────────────────────────────────
    if (type === 'fundamentals') {
      // 1. Supabase DB first
      const cached = await getStatement(symbol, 'fundamentals', 'annual')
      if (cached) return NextResponse.json({ data: cached })

      // 2. Fetch from Capital Stake
      const data = await withCache(
        `stock:statement:uat:${symbol}:fundamentals`,
        TTL_SECONDS.FINANCIALS,
        async () => {
          const url = CS_ENDPOINTS.COMPANY_FUNDAMENTALS(symbol)
          await trackChartAPICall(url)
          const res = await csUatGet<{
            status: string
            data: {
              periods:      string[]
              fundamentals: Array<{ name: string; values: (number | null)[] }>
            }
          }>(url)
          const raw     = res.data
          const periods = (raw.periods ?? []).map((p: string) => ({
            year:       p,
            period_end: p === 'TTM' ? new Date().toISOString().slice(0, 10) : `${p}-12-31`,
          }))
          const fields = (raw.fundamentals ?? []).map((f: { name: string; values: (number | null)[] }) => ({
            label:      f.name,
            values:     f.values,
            is_heading: false,
          }))
          return { periods, fields }
        }
      ) as StatementData

      // Persist (store raw response as raw_data for peers route re-use)
      if (data) saveStatement(symbol, 'fundamentals', 'annual', data, data).catch(() => {})

      return NextResponse.json({ data })
    }

    // ── Shareholders ───────────────────────────────────────────────────────────
    if (type === 'shareholders') {
      // 1. Supabase DB first
      const cached = await getStatement(symbol, 'shareholders', 'annual')
      if (cached) return NextResponse.json({ data: cached })

      // 2. Fetch from Capital Stake
      const data = await withCache(
        `stock:statement:uat:${symbol}:shareholders`,
        TTL_SECONDS.FINANCIALS,
        async () => {
          const url = CS_ENDPOINTS.COMPANY_SHAREHOLDERS(symbol)
          await trackChartAPICall(url)
          const res = await csUatGet<{ status: string; data: StatementData }>(url)
          return res.data
        }
      )

      if (data) saveStatement(symbol, 'shareholders', 'annual', data as StatementData).catch(() => {})

      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Unknown statement type' }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/statement]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
