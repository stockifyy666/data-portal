import { NextResponse } from 'next/server'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({ error: 'Broker SSO not yet configured' }, { status: 501 })
}
