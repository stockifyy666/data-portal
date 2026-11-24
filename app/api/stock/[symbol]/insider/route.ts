// Insider transactions for one company — read from Supabase `insider_transactions`
// (synced Mon–Fri 5 PM PKT by /api/sync/insider). No Capital Stake call here.

import { NextRequest, NextResponse } from 'next/server'
import { getCompanyInsider }         from '@/lib/capitalstake/insider'

export const dynamic = 'force-dynamic'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()
  if (!SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
  try {
    const data = await getCompanyInsider(symbol)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[API /stock/insider]', symbol, err instanceof Error ? err.message : err)
    return NextResponse.json({ data: [], error: 'unavailable' })
  }
}
