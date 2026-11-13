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
  return type === 'shareholders' ? 168 : 24 // shareholders: 7 days; others: 24h
}
export type Interval = 'annual' | 'quarterly'

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
    const db = createServiceClient()
    const { data, error } = await db
      .from('financial_statements')
      .select('data, fetched_at')
      .eq('symbol',    symbol.toUpperCase())
      .eq('stmt_type', type)
      .eq('interval',  interval)
      .single<DBRow>()

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
    const db = createServiceClient()
    const { data, error } = await db
      .from('financial_statements')
      .select('raw_data, fetched_at')
      .eq('symbol',    symbol.toUpperCase())
      .eq('stmt_type', type)
      .eq('interval',  interval)
      .single<DBRow>()

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
    const db = createServiceClient()
    await db.from('financial_statements').upsert(
      {
        symbol:     symbol.toUpperCase(),
        stmt_type:  type,
        interval,
        data:       stmtData,
        raw_data:   rawData ?? null,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'symbol,stmt_type,interval' }
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
    const db        = createServiceClient()
    const cutoff    = new Date(Date.now() - staleHours(type) * 3_600_000).toISOString()
    const { data }  = await db
      .from('financial_statements')
      .select('symbol')
      .eq('stmt_type', type)
      .eq('interval',  interval)
      .lt('fetched_at', cutoff)

    return (data ?? []).map((r: { symbol: string }) => r.symbol)
  } catch {
    return []
  }
}
