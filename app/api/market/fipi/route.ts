import { NextResponse } from 'next/server'

// FIPI/LIPI not included in Capital Stake UAT agreement — return empty
export async function GET() {
  return NextResponse.json({ foreign: [], local: [], period: '10d' })
}
