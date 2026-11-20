import { NextResponse } from 'next/server'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
