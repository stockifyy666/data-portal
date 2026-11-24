// Insider transactions — stored in Supabase `insider_transactions` (migration 009).
//   syncInsider()        — called ONLY by the cron (/api/sync/insider), Mon–Fri 5 PM PKT
//   getInsiderPage()     — Insider page (all companies), read from the database
//   getCompanyInsider()  — stock "Insider Trades" tab, read from the database
// Pages never call Capital Stake directly.

import { csUatGet }            from './client'
import { CS_ENDPOINTS }        from './endpoints'
import { trackChartAPICall }   from '@/lib/utils/rateLimit'
import { createServiceClient } from '@/lib/supabase/service'

const BATCH = 5000          // rows per Capital Stake call (API allows 5,000)
const TABLE = 'insider_transactions'

export type InsiderTxn = {
  id: string; date: string; type: string; noticeDate: string
  symbol: string; company: string; name: string; role: string
  price: number; shares: number; market: string
}

type DbRow = {
  id: string; symbol: string; company_name: string; txn_date: string | null; type: string
  notice_id: string; notice_date: string | null; name: string; description: string
  price: number | string; shares: number | string; share_type: string; market: string
}

const COLS = 'id,symbol,company_name,txn_date,type,notice_date,name,description,price,shares,market'

function toTxn(r: DbRow): InsiderTxn {
  return {
    id: r.id, date: r.txn_date ?? '', type: r.type, noticeDate: r.notice_date ?? '',
    symbol: r.symbol, company: r.company_name, name: r.name, role: r.description,
    price: Number(r.price) || 0, shares: Number(r.shares) || 0, market: r.market,
  }
}

const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null

function fromApi(r: Record<string, unknown>): DbRow | null {
  const id = String(r.id ?? '').trim()
  const symbol = String(r.symbol ?? '').trim().toUpperCase()
  if (!id || !symbol) return null
  return {
    id, symbol,
    company_name: String(r.company_name ?? ''),
    txn_date:     isDate(r.date),
    type:         String(r.type ?? '').toLowerCase(),
    notice_id:    String(r.notice_id ?? ''),
    notice_date:  isDate(r.notice_date),
    name:         String(r.name ?? ''),
    description:  String(r.description ?? ''),
    price:        Number(r.price) || 0,
    shares:       Math.round(Number(r.shares) || 0),
    share_type:   String(r.share_type ?? ''),
    market:       String(r.market ?? ''),
  }
}

/* ── Sync (cron only) ─────────────────────────────────────────────────────── */

/** First run (empty table): back-fills everything (~5 calls). After that: 1 call for the newest 5,000 rows. */
export async function syncInsider(): Promise<{ calls: number; fetched: number; stored: number; backfill: boolean }> {
  const db = createServiceClient()
  const { count } = await db.from(TABLE).select('id', { count: 'exact', head: true })
  const backfill = !count

  let offset = 0, calls = 0, fetched = 0, stored = 0, total = Infinity
  do {
    const url = CS_ENDPOINTS.INSIDER(offset, BATCH)
    await trackChartAPICall(url)
    const res = await csUatGet<{ total?: number; data?: Record<string, unknown>[] }>(url)
    calls++
    const list = Array.isArray(res?.data) ? res.data : []
    total = Number(res?.total) || 0
    fetched += list.length

    // The API can return the same id more than once; keep one row per id
    // (Postgres rejects an upsert batch that touches the same row twice).
    const byId = new Map<string, DbRow>()
    for (const r of list.map(fromApi)) if (r) byId.set(r.id, r)
    const rows = Array.from(byId.values())
    for (let i = 0; i < rows.length; i += 1000) {
      const { error } = await db.from(TABLE).upsert(rows.slice(i, i + 1000), { onConflict: 'id' })
      if (error) throw new Error(`insider upsert failed: ${error.message}`)
      stored += Math.min(1000, rows.length - i)
    }
    offset += BATCH
    if (!list.length) break
  } while (backfill && offset < total && calls < 10)

  return { calls, fetched, stored, backfill }
}

/* ── Reads (database only) ────────────────────────────────────────────────── */

export async function getInsiderPage(page: number, pageSize: number, q = '') {
  let query = createServiceClient().from(TABLE).select(COLS, { count: 'exact' })
  const term = q.trim().replace(/[%_,()]/g, ' ').trim()
  if (term) query = query.or(`symbol.ilike.%${term}%,company_name.ilike.%${term}%,name.ilike.%${term}%`)
  const from = (page - 1) * pageSize
  const { data, count, error } = await query
    .order('notice_date', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1)
  if (error) throw new Error(error.message)
  return { data: ((data ?? []) as DbRow[]).map(toTxn), total: count ?? 0 }
}

export async function getCompanyInsider(symbol: string): Promise<InsiderTxn[]> {
  const { data, error } = await createServiceClient().from(TABLE).select(COLS)
    .eq('symbol', symbol)
    .order('notice_date', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(1000)
  if (error) throw new Error(error.message)
  return ((data ?? []) as DbRow[]).map(toTxn)
}
