// Helpers for the big cron syncs (financials, weekly profiles).
//  - paced(): starts at most `rps` jobs per second (CS limit is 5 req/sec — we use 4)
//  - stops starting new jobs at the deadline, so a run fits in one serverless call;
//    the next cron run picks up whatever is still stale (resumable).
//  - freshKeys(): which rows were already refreshed since a cutoff, read in pages
//    (Supabase returns at most 1,000 rows per request).

import { createServiceClient } from '@/lib/supabase/service'
import { getAllStocks }        from '@/lib/news/sectorNews'
import { isRightSymbol } from '@/lib/utils/rights'

export async function paced<T>(
  jobs: Array<() => Promise<T>>,
  opts: { rps?: number; deadlineMs: number }
): Promise<{ results: T[]; started: number; skipped: number }> {
  const gap = 1000 / (opts.rps ?? 4)
  const running: Promise<T>[] = []
  for (const job of jobs) {
    if (Date.now() >= opts.deadlineMs) break
    running.push(job())
    await new Promise(r => setTimeout(r, gap))
  }
  const results = await Promise.all(running)
  return { results, started: running.length, skipped: jobs.length - running.length }
}

/** Active, non-rights-issue symbols. */
export async function activeSymbols(): Promise<string[]> {
  const stocks = await getAllStocks()
  return stocks
    .filter(s => s.status === 1 && !/\(R\d*\)|\bRight\b/i.test(s.name) && !isRightSymbol(s.symbol))
    .map(s => s.symbol)
}

/** Set of "col1|col2|…" keys for rows in `table` with fetched_at newer than `since`. */
export async function freshKeys(table: string, cols: string[], since: Date): Promise<Set<string>> {
  const db   = createServiceClient()
  const keys = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols.join(','))
      .gt('fetched_at', since.toISOString()).range(from, from + 999)
    if (error || !data?.length) break
    for (const row of data as unknown as Record<string, string>[]) keys.add(cols.map(c => row[c]).join('|'))
    if (data.length < 1000) break
  }
  return keys
}
