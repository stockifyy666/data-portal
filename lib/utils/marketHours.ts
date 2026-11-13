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
function nowPKT(): Date {
  return new Date(Date.now() + PKT_OFFSET_MS)
}

/**
 * Returns true if PSX is currently in a live trading session.
 * Accounts for the Friday Jumu'ah break.
 */
export function isPSXOpen(): boolean {
  const pkt  = nowPKT()
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
 * Dynamic TTL for live price data (tickers / quotes).
 *
 * During market hours : OPEN_TTL  — fresh prices every minute
 * Off-hours / break   : OFF_TTL   — keep last-known price, reduce API calls
 */
export function liveDataTTL(openTTL: number, offTTL: number): number {
  return isPSXOpen() ? openTTL : offTTL
}

// Convenience presets (seconds)
export const PSX_TTL = {
  /** Tickers: 1 min live, 15 min off-hours */
  TICKERS: () => liveDataTTL(60, 15 * 60),
  /** Quotes: 1 min live, 15 min off-hours */
  QUOTES:  () => liveDataTTL(60, 15 * 60),
} as const
