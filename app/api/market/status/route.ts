// Market status derived from PSX trading hours — no API call needed.
// PSX hours (PKT = UTC+5): Mon–Thu 09:30–15:30, Fri 09:00–12:00 & 14:30–15:30

import { NextResponse } from 'next/server'

function getPSXStatus() {
  const now = new Date()
  // Convert to PKT (UTC+5)
  const pkt = new Date(now.getTime() + 5 * 60 * 60 * 1000)
  const day = pkt.getUTCDay() // 0=Sun,1=Mon,...,5=Fri,6=Sat
  const hours = pkt.getUTCHours()
  const minutes = pkt.getUTCMinutes()
  const timeInMin = hours * 60 + minutes

  let isOpen = false

  if (day >= 1 && day <= 4) {
    // Mon–Thu: 09:30–15:30
    isOpen = timeInMin >= 9 * 60 + 30 && timeInMin < 15 * 60 + 30
  } else if (day === 5) {
    // Friday: 09:00–12:00 and 14:30–15:30
    isOpen =
      (timeInMin >= 9 * 60 && timeInMin < 12 * 60) ||
      (timeInMin >= 14 * 60 + 30 && timeInMin < 15 * 60 + 30)
  }

  return {
    isOpen,
    status: isOpen ? 'open' : 'closed',
    timezone: 'PKT',
    currentTime: pkt.toISOString(),
    message: isOpen ? 'PSX Market is Open' : 'PSX Market is Closed',
  }
}

export async function GET() {
  return NextResponse.json(getPSXStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
