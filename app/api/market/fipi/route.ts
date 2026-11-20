import { NextResponse } from 'next/server'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

// FIPI/LIPI not included in Capital Stake UAT agreement — return empty
export async function GET() {
  return NextResponse.json({ foreign: [], local: [], period: '10d' })
}
