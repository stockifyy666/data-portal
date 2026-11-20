import { NextResponse } from 'next/server'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

export type Announcement = {
  symbol: string
  name:   string
  date:   string
  title:  string
  type:   string
}

// No UAT equivalent for market-wide announcements — return empty list
export async function GET() {
  return NextResponse.json({ announcements: [] as Announcement[] })
}
