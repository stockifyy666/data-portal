// Rolling news archive (Supabase `news_items`, migration 006).
//   archiveNews()  — store articles once (keyed by link)
//   getArchived()  — read stored articles for "today" (PKT) or the last 7 days
//   purgeOldNews() — delete anything published more than 14 days ago

import { createServiceClient } from '@/lib/supabase/service'

export type NewsScope = 'market' | 'general'
export type ArchivedNews = {
  title: string; description: string; link: string; image: string; source: string; date: string
}

const KEEP_DAYS = 14
const PKT_MS    = 5 * 3600e3

type RawNews = { title?: string; description?: string; link?: string; image?: string; source?: string; date?: string }

export async function archiveNews(scope: NewsScope, items: RawNews[]): Promise<void> {
  const cutoff = Date.now() - KEEP_DAYS * 86_400e3
  const rows = items
    .map(i => ({
      link:         (i.link ?? '').trim(),
      scope,
      title:        (i.title ?? '').trim(),
      description:  (i.description ?? '').replace(/<[^>]*>/g, '').slice(0, 400),
      image:        i.image ?? '',
      source:       i.source ?? '',
      published_at: i.date ? new Date(i.date).toISOString() : '',
    }))
    // valid link + title + date, and not already past the retention window
    .filter(r => r.link && r.title && r.published_at && Date.parse(r.published_at) >= cutoff)
  if (!rows.length) return
  try {
    await createServiceClient().from('news_items').upsert(rows, { onConflict: 'link', ignoreDuplicates: true })
  } catch (err) {
    console.error('[news archive] store failed:', err instanceof Error ? err.message : err)
  }
}

/** Start of today in Pakistan time, as a UTC ISO string. */
function startOfTodayPKT(): string {
  const pkt = new Date(Date.now() + PKT_MS)
  pkt.setUTCHours(0, 0, 0, 0)
  return new Date(pkt.getTime() - PKT_MS).toISOString()
}

export async function getArchived(scope: NewsScope, range: 'today' | 'week'): Promise<ArchivedNews[]> {
  const since = range === 'today' ? startOfTodayPKT() : new Date(Date.now() - 7 * 86_400e3).toISOString()
  const { data, error } = await createServiceClient()
    .from('news_items')
    .select('title, description, link, image, source, published_at')
    .eq('scope', scope)
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({
    title: r.title, description: r.description, link: r.link, image: r.image, source: r.source, date: r.published_at,
  }))
}

export async function purgeOldNews(): Promise<number> {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400e3).toISOString()
  const { count, error } = await createServiceClient()
    .from('news_items').delete({ count: 'exact' }).lt('published_at', cutoff)
  if (error) throw new Error(error.message)
  return count ?? 0
}
