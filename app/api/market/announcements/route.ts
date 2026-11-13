import { NextResponse } from 'next/server'

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
