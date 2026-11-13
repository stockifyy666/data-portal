// Read / write announcements and news from Supabase stock_content table.
// Nightly sync writes here; API routes read from here — zero CS calls per user.

import { createServiceClient } from './service'

const STALE_HOURS: Record<ContentType, number> = {
  announcements:   23,   // nightly sync
  news:            23,
  general_news:    23,
  profile_overview: 168, // 7 days — profiles rarely change
  profile_detail:   168,
}

type ContentType = 'announcements' | 'news' | 'profile_overview' | 'profile_detail' | 'general_news'

export async function getContent<T>(
  symbol:      string,
  contentType: ContentType
): Promise<T[] | null> {
  try {
    const db = createServiceClient()
    const { data, error } = await db
      .from('stock_content')
      .select('data, fetched_at')
      .eq('symbol',       symbol.toUpperCase())
      .eq('content_type', contentType)
      .single<{ data: T[]; fetched_at: string }>()

    if (error || !data) return null

    const ageHours = (Date.now() - new Date(data.fetched_at).getTime()) / 3_600_000
    if (ageHours > STALE_HOURS[contentType]) return null

    return data.data
  } catch {
    return null
  }
}

export async function saveContent(
  symbol:      string,
  contentType: ContentType,
  items:       unknown[]
): Promise<void> {
  try {
    const db = createServiceClient()
    await db.from('stock_content').upsert(
      {
        symbol:       symbol.toUpperCase(),
        content_type: contentType,
        data:         items,
        fetched_at:   new Date().toISOString(),
      },
      { onConflict: 'symbol,content_type' }
    )
  } catch (err) {
    console.error('[Supabase] saveContent failed:', err)
  }
}
