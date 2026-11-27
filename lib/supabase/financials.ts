// =============================================================================
// FILE: lib/supabase/financials.ts
// PURPOSE: Read / write financial statement data from Supabase.
//          This replaces Redis + Capital Stake for all slow-changing data:
//          income, balance, cashflow, fundamentals, shareholders.
//
//          Flow:
//            1. API route calls getStatement()
//            2. If Supabase has fresh data (< STALE_HOURS) → return it
//            3. If stale / missing → caller fetches from Capital Stake, then
//               calls saveStatement() to persist for everyone else
// =============================================================================

import { createServiceClient } from './service'
import type { StatementData }  from '@/components/stock/stock-detail-types'

export type StmtType = 'income' | 'balance' | 'cashflow' | 'fundamentals' | 'shareholders'

function staleHours(type: StmtType | string): number {
  // Daily sync (financials/fundamentals) refreshes every 24h; weekly (shareholders) every 7 days.
  // +2h / +6h grace so rows stay valid while the next sync run is still in progress
  // (otherwise pages would fall back to Capital Stake for a short window each day).
  return type === 'shareholders' ? 168 + 6 : 24 + 2
}
export type Interval = 'annual' | 'quarterly'

// Each statement kind lives in its own table (migration 003):
//   income / balance / cashflow → financial_statements (symbol, stmt_type, interval)
//   fundamentals                → fundamentals         (symbol, interval)
//   shareholders                → company_profiles     (symbol, kind='shareholders')
function target(symbol: string, type: string, interval: string) {
  const sym = symbol.toUpperCase()
  if (type === 'fundamentals')
    return { table: 'fundamentals', keys: { symbol: sym, interval } as Record<string, string>, conflict: 'symbol,interval' }
  if (type === 'shareholders')
    return { table: 'company_profiles', keys: { symbol: sym, kind: 'shareholders' } as Record<string, string>, conflict: 'symbol,kind' }
  return { table: 'financial_statements', keys: { symbol: sym, stmt_type: type, interval } as Record<string, string>, conflict: 'symbol,stmt_type,interval' }
}

// Row shape returned by Supabase
type DBRow = {
  data:       StatementData
  raw_data:   unknown
  fetched_at: string
}

/**
 * Read financial statement data from Supabase.
 * Returns null if not found or older than STALE_HOURS.
 */
export async function getStatement(
  symbol:   string,
  type:     StmtType | string,
  interval: Interval | string
): Promise<StatementData | null> {
  try {
    const { table, keys } = target(symbol, type, interval)
    let q = createServiceClient().from(table).select('data, fetched_at')
    for (const [c, v] of Object.entries(keys)) q = q.eq(c, v)
    const { data, error } = await q.single<DBRow>()

    if (error || !data) return null

    const ageHours = (Date.now() - new Date(data.fetched_at).getTime()) / 3_600_000
    if (ageHours > staleHours(type)) return null

    return data.data
  } catch {
    return null
  }
}

/**
 * Read raw Capital Stake response from Supabase (used by peers route for fundamentals).
 * Returns null if not found or stale.
 */
export async function getRawStatement(
  symbol:   string,
  type:     StmtType | string,
  interval: Interval | string
): Promise<unknown | null> {
  try {
    const { table, keys } = target(symbol, type, interval)
    let q = createServiceClient().from(table).select('raw_data, fetched_at')
    for (const [c, v] of Object.entries(keys)) q = q.eq(c, v)
    const { data, error } = await q.single<DBRow>()

    if (error || !data?.raw_data) return null

    const ageHours = (Date.now() - new Date(data.fetched_at).getTime()) / 3_600_000
    if (ageHours > staleHours(type)) return null

    return data.raw_data
  } catch {
    return null
  }
}

/**
 * Save / update financial statement data in Supabase.
 * Uses upsert so re-running always gives the freshest data.
 */
export async function saveStatement(
  symbol:   string,
  type:     StmtType | string,
  interval: Interval | string,
  stmtData: StatementData,
  rawData?: unknown
): Promise<void> {
  try {
    const { table, keys, conflict } = target(symbol, type, interval)
    await createServiceClient().from(table).upsert(
      { ...keys, data: stmtData, raw_data: rawData ?? null, fetched_at: new Date().toISOString() },
      { onConflict: conflict }
    )
  } catch (err) {
    console.error('[Supabase] saveStatement failed:', err)
  }
}

/**
 * Returns list of symbols whose data is stale (older than STALE_HOURS) or missing.
 * Used by the nightly sync to know what to refresh.
 */
export async function getStaleSymbols(
  type:     StmtType | string,
  interval: Interval | string
): Promise<string[]> {
  try {
    const cutoff = new Date(Date.now() - staleHours(type) * 3_600_000).toISOString()
    const { table, keys } = target('', type, interval)
    let q = createServiceClient().from(table).select('symbol').lt('fetched_at', cutoff)
    for (const [c, v] of Object.entries(keys)) if (c !== 'symbol') q = q.eq(c, v)
    const { data } = await q

    return (data ?? []).map((r: { symbol: string }) => r.symbol)
  } catch {
    return []
  }
}
