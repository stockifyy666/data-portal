import { NextRequest, NextResponse } from 'next/server'
import { csGet }                     from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }              from '@/lib/capitalstake/endpoints'

// Temporary debug route — returns the raw Capital Stake profile response
// so we can find exact field names for the Company Snapshot.
// DELETE this file once field names are confirmed.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()

  const url = CS_ENDPOINTS.COMPANY_PROFILE(symbol)
  const data = await csGet(url)

  return NextResponse.json({
    _debug: 'Raw Capital Stake profile response — delete this route after confirming fields',
    url,
    data,
  })
}
