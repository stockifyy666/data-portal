// Announcements: one feed for the whole market, fetched hourly, then split by
// symbol into the `announcements` table. Company pages read only from there —
// no per-company announcement API calls.

import { csUatGet }                from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }            from '@/lib/capitalstake/endpoints'
import { getContent, saveContent } from '@/lib/supabase/content'
import { trackChartAPICall }       from '@/lib/utils/rateLimit'

export type Announcement = {
  id: string; symbol: string; date: string; title: string
  form_type?: string; category?: string
  [k: string]: unknown
}

const PAGE      = 50          // API maximum per call
const MAX_PAGES = 4           // safety cap per run
const KEEP      = 100         // announcements kept per company
const LOOKBACK  = 2 * 3600e3  // keep paging until we reach items older than this

/** Fetch the latest market-wide announcements and merge them into each company's row. */
export async function syncAllAnnouncements(): Promise<{ fetched: number; symbols: number; pages: number }> {
  const items: Announcement[] = []
  let pages = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    await trackChartAPICall('GET /3.0/announcements [all]')
    const res   = await csUatGet<{ data: Announcement[] }>(CS_ENDPOINTS.ANNOUNCEMENTS_ALL(page * PAGE, PAGE))
    const batch = res?.data ?? []
    pages++
    items.push(...batch)
    const oldest = batch.at(-1)?.date ? new Date(batch.at(-1)!.date).getTime() : 0
    // Stop once this page reaches back past the lookback window (or the feed ran out)
    if (batch.length < PAGE || oldest < Date.now() - LOOKBACK) break
  }

  // Group by symbol and merge with what's stored
  const bySymbol = new Map<string, Announcement[]>()
  for (const a of items) {
    if (!a.symbol) continue
    const sym = a.symbol.toUpperCase()
    bySymbol.set(sym, [...(bySymbol.get(sym) ?? []), a])
  }

  for (const [sym, fresh] of Array.from(bySymbol)) {
    const existing = (await getContent<Announcement>(sym, 'announcements')) ?? []
    const merged   = new Map<string, Announcement>()
    for (const a of [...fresh, ...existing]) if (!merged.has(String(a.id))) merged.set(String(a.id), a)
    const list = Array.from(merged.values())
      .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
      .slice(0, KEEP)
    await saveContent(sym, 'announcements', list)
  }

  return { fetched: items.length, symbols: bySymbol.size, pages }
}
