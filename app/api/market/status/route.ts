// Market status derived from PSX trading hours — no API call needed.
// PSX hours (PKT = UTC+5): Mon–Thu 09:30–15:30, Fri 09:00–12:00 & 14:30–15:30
// Statuses: pre_market (15 min before open), open, post_market (20 min after close),
//           after_hours, friday_break, weekend

import { NextResponse } from 'next/server'

function pad(n: number) { return n.toString().padStart(2, '0') }

function fmtTime(h: number, m: number) {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${pad(m)} ${suffix}`
}

function getPSXStatus() {
  const now = new Date()
  // PKT = UTC+5 — extract hours/minutes directly from UTC
  const day = now.getUTCDay()
  const h   = (now.getUTCHours() + 5) % 24
  const m   = now.getUTCMinutes()
  const t   = h * 60 + m

  type StatusCode = 'open' | 'pre_market' | 'post_market' | 'after_hours' | 'friday_break' | 'weekend'
  let code: StatusCode
  let label: string
  let nextOpen  = ''
  let isOpen    = false

  const isWeekday = day >= 1 && day <= 4
  const isFriday  = day === 5
  const isWeekend = day === 0 || day === 6

  if (isWeekend) {
    code     = 'weekend'
    label    = 'Market Closed'
    nextOpen = 'Monday 9:30 AM PKT'

  } else if (isWeekday) {
    const PRE_START  = 9 * 60 + 15   // 09:15
    const MKT_OPEN   = 9 * 60 + 30   // 09:30
    const MKT_CLOSE  = 15 * 60 + 30  // 15:30
    const POST_END   = 15 * 60 + 50  // 15:50  (20 min post-market)

    if (t < PRE_START) {
      code     = 'after_hours'
      label    = 'Market Closed'
      nextOpen = fmtTime(9, 30) + ' PKT'
    } else if (t >= PRE_START && t < MKT_OPEN) {
      code     = 'pre_market'
      label    = 'Pre-Market'
      nextOpen = fmtTime(9, 30) + ' PKT'
    } else if (t >= MKT_OPEN && t < MKT_CLOSE) {
      code    = 'open'
      label   = 'Market Open'
      isOpen  = true
    } else if (t >= MKT_CLOSE && t < POST_END) {
      code     = 'post_market'
      label    = 'Post-Market'
      nextOpen = 'Tomorrow 9:30 AM PKT'
    } else {
      code     = 'after_hours'
      label    = 'Market Closed'
      nextOpen = 'Tomorrow 9:30 AM PKT'
    }

  } else {
    // Friday — session 1: 09:00–12:00, break, session 2: 14:30–15:30
    const PRE_S1     = 8 * 60 + 45   // 08:45
    const S1_OPEN    = 9 * 60        // 09:00
    const S1_CLOSE   = 12 * 60       // 12:00
    const POST_S1    = 12 * 60 + 20  // 12:20 (post-market for session 1)
    const PRE_S2     = 14 * 60 + 15  // 14:15
    const S2_OPEN    = 14 * 60 + 30  // 14:30
    const S2_CLOSE   = 16 * 60 + 30  // 16:30
    const POST_S2    = 16 * 60 + 50  // 16:50

    if (t < PRE_S1) {
      code     = 'after_hours'
      label    = 'Market Closed'
      nextOpen = fmtTime(9, 0) + ' PKT'
    } else if (t >= PRE_S1 && t < S1_OPEN) {
      code     = 'pre_market'
      label    = 'Pre-Market'
      nextOpen = fmtTime(9, 0) + ' PKT'
    } else if (t >= S1_OPEN && t < S1_CLOSE) {
      code    = 'open'
      label   = 'Market Open'
      isOpen  = true
    } else if (t >= S1_CLOSE && t < POST_S1) {
      code     = 'post_market'
      label    = 'Post-Market'
      nextOpen = fmtTime(14, 30) + ' PKT'
    } else if (t >= POST_S1 && t < PRE_S2) {
      code     = 'friday_break'
      label    = 'Friday Break'
      nextOpen = fmtTime(14, 30) + ' PKT'
    } else if (t >= PRE_S2 && t < S2_OPEN) {
      code     = 'pre_market'
      label    = 'Pre-Market'
      nextOpen = fmtTime(14, 30) + ' PKT'
    } else if (t >= S2_OPEN && t < S2_CLOSE) {
      code    = 'open'
      label   = 'Market Open'
      isOpen  = true
    } else if (t >= S2_CLOSE && t < POST_S2) {
      code     = 'post_market'
      label    = 'Post-Market'
      nextOpen = 'Monday 9:30 AM PKT'
    } else {
      code     = 'after_hours'
      label    = 'Market Closed'
      nextOpen = 'Monday 9:30 AM PKT'
    }
  }

  // Build correct PKT time string (HH:MM AM/PM PKT) — no double-offset
  const pktH    = h % 12 || 12
  const suffix  = h >= 12 ? 'PM' : 'AM'
  const pktTime = `${pktH}:${pad(m)} ${suffix} PKT`

  return {
    isOpen,
    status:      isOpen ? 'open' : 'closed',
    code,
    label,
    nextOpen,
    timezone:    'PKT',
    currentTime: pktTime,   // pre-formatted string, no further conversion needed
    message:     isOpen ? 'PSX Market is Open' : `PSX Market is Closed — ${label}`,
  }
}

export async function GET() {
  return NextResponse.json(getPSXStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
