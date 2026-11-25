// Payouts (dividend / bonus / right / split) for one company — served ONLY from
// Supabase `company_profiles` (kind 'payouts'), filled by the nightly 2 AM PKT
// sync (/api/sync/payouts). No Capital Stake call here.

import { NextRequest, NextResponse } from 'next/server'
import { getContent }                from '@/lib/supabase/content'

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
  const data = (await getContent<Record<string, unknown>>(symbol, 'payouts')) ?? []
  return NextResponse.json({ data })
}
