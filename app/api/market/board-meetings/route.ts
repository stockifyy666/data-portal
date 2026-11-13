import { NextResponse } from 'next/server'

export type BoardMeeting = {
  symbol: string
  name:   string
  date:   string
  agenda: string
  status: string
}

// No UAT equivalent for market-wide board meetings — return empty list
export async function GET() {
  return NextResponse.json({ meetings: [] as BoardMeeting[] })
}
