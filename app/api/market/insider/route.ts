// Insider transactions (all companies) — served ONLY from Supabase.
//   GET /api/market/insider?page=1&q=HBL   → 50 rows per page, newest notices first
// The table is filled by the weekday 5 PM sync (/api/sync/insider). No Capital Stake call here.

import { NextResponse, type NextRequest } from 'next/server'
import { getInsiderPage }                 from '@/lib/capitalstake/insider'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
const MAX_PAGE  = 1000

export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams
  const raw  = parseInt(sp.get('page') ?? '1', 10)
  const page = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), MAX_PAGE) : 1
  const q    = (sp.get('q') ?? '').slice(0, 60)

  try {
    const { data, total } = await getInsiderPage(page, PAGE_SIZE, q)
    return NextResponse.json({
      data, page, pageSize: PAGE_SIZE, total,
      pages: Math.min(Math.max(Math.ceil(total / PAGE_SIZE), 1), MAX_PAGE),
    })
  } catch (err) {
    console.error('[API /market/insider]', err instanceof Error ? err.message : err)
    return NextResponse.json({ data: [], page, pageSize: PAGE_SIZE, total: 0, pages: 1, error: 'unavailable' })
  }
}
