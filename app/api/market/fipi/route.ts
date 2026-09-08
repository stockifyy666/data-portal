import { NextResponse }                       from 'next/server'
import { csGet, csPost }                      from '@/lib/capitalstake/client'
import { trackCSAPICall }                     from '@/lib/utils/rateLimit'

const BASE = process.env.CAPITAL_STAKE_BASE_URL ?? 'https://stockifyy.capitalstake.com'

const ALLOWED_PERIODS = ['10d', '3m', '1y'] as const
type Period = typeof ALLOWED_PERIODS[number]

async function fetchPortfolioInvestments(type: 'foreign' | 'local', period: Period) {
  const url = `${BASE}/api/v3/portfolio-investments?type=${type}&period=${period}`

  try {
    const raw = await csGet<any>(url)
    const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : null)
    if (arr && arr.length > 0) return arr
  } catch {}

  // Fallback: POST with form body
  const raw = await csPost<any>(url, `type=${type}&period=${period}`)
  return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : null)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const period = (searchParams.get('period') ?? '10d') as Period
  const safePeriod: Period = ALLOWED_PERIODS.includes(period) ? period : '10d'

  try {
    await trackCSAPICall(`GET /api/v3/portfolio-investments?period=${safePeriod}`)

    const [foreign, local] = await Promise.all([
      fetchPortfolioInvestments('foreign', safePeriod),
      fetchPortfolioInvestments('local', safePeriod),
    ])

    return NextResponse.json(
      { foreign: foreign ?? [], local: local ?? [], period: safePeriod },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /market/fipi]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
