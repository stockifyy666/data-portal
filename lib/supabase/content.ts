// Read / write cached Capital Stake content in Supabase.
// Each kind of content lives in its own table (see migration 003):
//   general_news / sector_news         → news             (scope, key)
//   announcements                      → announcements    (symbol)
//   profile_overview / profile_detail  → company_profiles (symbol, kind)
//   payouts                            → company_profiles (symbol, kind 'payouts')

import { createServiceClient } from './service'

type ContentType = 'announcements' | 'profile_overview' | 'profile_detail' | 'general_news' | 'sector_news' | 'payouts'

// How old a stored row may be before getContent() treats it as missing.
// News and announcements are refreshed by cron syncs, so any stored copy is
// served (Infinity); the API is only called when no row exists at all.
const STALE_HOURS: Record<ContentType, number> = {
  announcements:    Infinity,  // hourly sync (market-wide feed)
  general_news:     Infinity,  // hourly sync
  sector_news:      Infinity,  // every-2-hours sync
  profile_overview: 168,       // weekly sync (Sunday) — 7 days
  profile_detail:   168,
  payouts:          Infinity,  // nightly sync (2 AM PKT); always served from the database
}

// Table + key columns for each content type. `id` is the symbol / sector code / 'MARKET'.
function target(id: string, type: ContentType): { table: string; keys: Record<string, string>; conflict: string } {
  const up = id.toUpperCase()
  switch (type) {
    case 'general_news':     return { table: 'news',             keys: { scope: 'general', key: up },       conflict: 'scope,key' }
    case 'sector_news':      return { table: 'news',             keys: { scope: 'sector',  key: up },       conflict: 'scope,key' }
    case 'announcements':    return { table: 'announcements',    keys: { symbol: up },                      conflict: 'symbol' }
    case 'profile_overview': return { table: 'company_profiles', keys: { symbol: up, kind: 'overview' },    conflict: 'symbol,kind' }
    case 'profile_detail':   return { table: 'company_profiles', keys: { symbol: up, kind: 'detail' },      conflict: 'symbol,kind' }
    case 'payouts':          return { table: 'company_profiles', keys: { symbol: up, kind: 'payouts' },     conflict: 'symbol,kind' }
  }
}

export async function getContent<T>(id: string, contentType: ContentType): Promise<T[] | null> {
  try {
    const { table, keys } = target(id, contentType)
    let q = createServiceClient().from(table).select('data, fetched_at')
    for (const [col, val] of Object.entries(keys)) q = q.eq(col, val)
    const { data, error } = await q.single<{ data: T[]; fetched_at: string }>()

    if (error || !data) return null

    const ageHours = (Date.now() - new Date(data.fetched_at).getTime()) / 3_600_000
    if (ageHours > STALE_HOURS[contentType]) return null

    return data.data
  } catch {
    return null
  }
}

export async function saveContent(id: string, contentType: ContentType, items: unknown[]): Promise<void> {
  try {
    const { table, keys, conflict } = target(id, contentType)
    await createServiceClient().from(table).upsert(
      { ...keys, data: items, fetched_at: new Date().toISOString() },
      { onConflict: conflict }
    )
  } catch (err) {
    console.error('[Supabase] saveContent failed:', err)
  }
}
