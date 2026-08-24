// Market status derived from PSX trading hours — no API call needed.
// PSX hours (PKT = UTC+5): Mon–Thu 09:30–15:30, Fri 09:00–12:00 & 14:30–15:30

import { NextResponse } from 'next/server'

function pad(n: number) { return n.toString().padStart(2, '0') }

function fmtTime(h: number, m: number) {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${pad(m)} ${suffix}`
}

function getPSXStatus() {
  const now = new Date()
  const pkt = new Date(now.getTime() + 5 * 60 * 60 * 1000)
  const day  = pkt.getUTCDay()   // 0=Sun,1=Mon…5=Fri,6=Sat
  const h    = pkt.getUTCHours()
  const m    = pkt.getUTCMinutes()
  const t    = h * 60 + m

  // ── Determine detailed status ──────────────────────────────────────
  type StatusCode = 'open' | 'pre_market' | 'after_hours' | 'friday_break' | 'weekend'
  let code: StatusCode
  let label: string
  let nextOpen: string
  let isOpen = false

  const isWeekday   = day >= 1 && day <= 4   // Mon–Thu
  const isFriday    = day === 5
  const isWeekend   = day === 0 || day === 6 // Sun or Sat

  if (isWeekend) {
    code     = 'weekend'
    label    = 'Weekend'
    nextOpen = day === 6 ? 'Monday 9:30 AM PKT' : 'Monday 9:30 AM PKT'
  } else if (isWeekday) {
    if (t < 9 * 60 + 30) {
      code     = 'pre_market'
      label    = 'Pre-Market'
      nextOpen = fmtTime(9, 30) + ' PKT'
    } else if (t >= 9 * 60 + 30 && t < 15 * 60 + 30) {
      code    = 'open'
      label   = 'Market Open'
      isOpen  = true
      nextOpen = ''
    } else {
      code     = 'after_hours'
      label    = 'After Hours'
      nextOpen = 'Tomorrow 9:30 AM PKT'
    }
  } else {
    // Friday
    if (t < 9 * 60) {
      code     = 'pre_market'
      label    = 'Pre-Market'
      nextOpen = fmtTime(9, 0) + ' PKT'
    } else if (t >= 9 * 60 && t < 12 * 60) {
      code    = 'open'
      label   = 'Market Open'
      isOpen  = true
      nextOpen = ''
    } else if (t >= 12 * 60 && t < 14 * 60 + 30) {
      code     = 'friday_break'
      label    = 'Friday Break'
      nextOpen = fmtTime(14, 30) + ' PKT'
    } else if (t >= 14 * 60 + 30 && t < 15 * 60 + 30) {
      code    = 'open'
      label   = 'Market Open'
      isOpen  = true
      nextOpen = ''
    } else {
      code     = 'after_hours'
      label    = 'After Hours'
      nextOpen = 'Monday 9:30 AM PKT'
    }
  }

  return {
    isOpen,
    status:      isOpen ? 'open' : 'closed',
    code,
    label,
    nextOpen,
    timezone:    'PKT',
    currentTime: pkt.toISOString(),
    message:     isOpen ? 'PSX Market is Open' : `PSX Market is Closed — ${label}`,
  }
}

export async function GET() {
  return NextResponse.json(getPSXStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
