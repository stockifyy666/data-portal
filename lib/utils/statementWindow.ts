// Free tier: financial history is served from FIRST_YEAR onward only.
// Older periods stay in our database (for the future paid plan) but are
// removed on the server, so they never appear in any API response.

import type { StatementData } from '@/components/stock/stock-detail-types'

export const FIRST_YEAR = 2021

const yearOf = (p: { year?: string; period_end?: string }) =>
  Number(String(p.year ?? '').slice(0, 4)) || Number(String(p.period_end ?? '').slice(0, 4)) || 0

/** Drop every period (and its value in each row) older than FIRST_YEAR. */
export function trimStatement<T extends StatementData | null | undefined>(data: T, fromYear = FIRST_YEAR): T {
  if (!data || !Array.isArray(data.periods) || !Array.isArray(data.fields)) return data
  // A period with no readable year is kept (never hide data we can't date)
  const keep = data.periods.map(p => { const y = yearOf(p); return !y || y >= fromYear })
  if (keep.every(Boolean)) return data
  return {
    ...data,
    periods: data.periods.filter((_, i) => keep[i]),
    fields:  data.fields.map(f => ({
      ...f,
      values: Array.isArray(f.values) ? f.values.filter((_, i) => keep[i]) : f.values,
    })),
  } as T
}
