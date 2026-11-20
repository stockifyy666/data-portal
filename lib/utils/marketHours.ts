// =============================================================================
// FILE: lib/utils/marketHours.ts
// PURPOSE: PSX (Pakistan Stock Exchange) trading hours helper.
//          Used to set dynamic Redis TTLs — shorter during market hours for
//          live prices, longer off-hours to avoid wasting Capital Stake quota.
//
// PSX Schedule (all times PKT = UTC+5):
//   Mon–Thu : 09:30 – 15:30  (continuous session)
//   Friday  : 09:30 – 12:00  (morning session)
//             12:00 – 14:30  (Jumu'ah / Friday prayer break — market CLOSED)
//             14:30 – 15:30  (afternoon session)
//   Sat–Sun : CLOSED
// =============================================================================

/** PSX operates on Pakistan Standard Time (UTC+5, no DST) */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000

/** Returns current time in PKT */
function nowPKT(at = Date.now()): Date {
  return new Date(at + PKT_OFFSET_MS)
}

/**
 * Returns true if PSX is currently in a live trading session.
 * Accounts for the Friday Jumu'ah break.
 */
export function isPSXOpen(at = Date.now()): boolean {
  const pkt  = nowPKT(at)
  const day  = pkt.getUTCDay()   // 0=Sun, 1=Mon … 5=Fri, 6=Sat
  const hour = pkt.getUTCHours()
  const min  = pkt.getUTCMinutes()
  const hm   = hour * 60 + min   // minutes since midnight PKT

  // Weekends
  if (day === 0 || day === 6) return false

  // Market open: 09:30 → 570 min | Market close: 15:30 → 930 min
  const OPEN  = 9 * 60 + 30   // 570
  const CLOSE = 15 * 60 + 30  // 930

  if (hm < OPEN || hm >= CLOSE) return false

  // Friday Jumu'ah break: 12:00 (720) – 14:30 (870)
  if (day === 5) {
    const BREAK_START = 12 * 60       // 720
    const BREAK_END   = 14 * 60 + 30  // 870
    if (hm >= BREAK_START && hm < BREAK_END) return false
  }

  return true
}

/**
 * Seconds until PSX next opens (0 if open now). Steps in 5-min increments,
 * looking at most 4 days ahead (covers weekends + the Friday break).
 */
export function secondsUntilOpen(at = Date.now()): number {
  if (isPSXOpen(at)) return 0
  const STEP = 5 * 60 * 1000
  const start = Math.ceil(at / STEP) * STEP
  for (let t = start; t < at + 4 * 86_400_000; t += STEP) {
    if (isPSXOpen(t)) return Math.ceil((t - at) / 1000)
  }
  return 12 * 3600
}

/**
 * TTL for live price data (tickers / quotes / indices).
 *
 * Market open : 60s — refresh every minute.
 * Closed      : until the next open — the last prices stay in Redis and no
 *               API call is made after close (the first request after close
 *               fetches the closing prices once, then they're held overnight).
 */
function liveTTL(): number {
  return isPSXOpen() ? 60 : Math.max(60, secondsUntilOpen())
}

export const PSX_TTL = {
  TICKERS: liveTTL,
  QUOTES:  liveTTL,
} as const
