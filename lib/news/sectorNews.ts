// Sector-level news: one CS call per sector every 2 hours (sync/sector-news), shared by every company in it.
// Company news pages filter these by symbol instead of calling /news/company per stock.

import { csUatGet }                from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }            from '@/lib/capitalstake/endpoints'
import { cacheGet, cacheSet,
         CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { getContent, saveContent } from '@/lib/supabase/content'
import { trackChartAPICall }       from '@/lib/utils/rateLimit'
import type { RawStock }           from '@/types/capitalstake'

export type SectorNewsItem = {
  symbol:      string
  date:        string
  title:       string
  sector_code: string
  description: string
  link:        string
  image:       string
  source:      string
  source_url:  string
}

const key = (code: string) => code   // news table: scope='sector', key=<sector code>

/** Fetch one sector from CS and store it. Used by the hourly sync and on a DB miss. */
export async function fetchAndSaveSectorNews(code: string): Promise<SectorNewsItem[]> {
  await trackChartAPICall(`GET /3.0/news/sector?sector_code=${code}`)
  const res   = await csUatGet<{ status: string; data: SectorNewsItem[] }>(CS_ENDPOINTS.NEWS_SECTOR(code))
  const items = (res?.data ?? []).filter(i => i.title)
  if (items.length > 0) await saveContent(key(code), 'sector_news', items)
  return items
}

/** Read sector news from Supabase (fresh within 2h); fetch from CS only on a miss. */
export async function getSectorNews(code: string): Promise<SectorNewsItem[]> {
  const cached = await getContent<SectorNewsItem>(key(code), 'sector_news')
  if (cached) return cached
  return fetchAndSaveSectorNews(code)
}

/** All listed stocks (Redis-cached list, one CS call on a miss). */
export async function getAllStocks(): Promise<RawStock[]> {
  let stocks = await cacheGet<RawStock[]>(CACHE_KEYS.allStocks())
  if (!stocks || stocks.length === 0) {
    await trackChartAPICall('GET /3.0/market/stocks')
    const res = await csUatGet<{ status: string; data: RawStock[] }>(CS_ENDPOINTS.STOCKS_LIST)
    stocks = res.data ?? []
    if (stocks.length > 0) await cacheSet(CACHE_KEYS.allStocks(), stocks, TTL_SECONDS.STOCKS_LIST)
  }
  return stocks
}

/** Distinct sector codes across active stocks. */
export function sectorCodes(stocks: RawStock[]): string[] {
  return Array.from(new Set(stocks.filter(s => s.status === 1 && s.sector).map(s => s.sector))).sort()
}
