// =============================================================================
// FILE: app/api/market/mutual-funds/route.ts
// PURPOSE: Returns a list of all mutual funds from Capital Stake.
//          Cached in Redis for 1 hour — fund data updates once daily.
//          Auth required — only logged-in users can call this.
// =============================================================================

import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { withCache, CACHE_KEYS, TTL_SECONDS } from '@/lib/redis/cache'
import { csGet }             from '@/lib/capitalstake/client'
import { CS_ENDPOINTS }      from '@/lib/capitalstake/endpoints'
import { trackCSAPICall }    from '@/lib/utils/rateLimit'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await withCache(
      CACHE_KEYS.mutualFunds(),
      TTL_SECONDS.MUTUAL_FUNDS,
      async () => {
        await trackCSAPICall('mutual-funds-list')
        const res = await csGet<unknown[]>(CS_ENDPOINTS.MUTUAL_FUNDS_LIST)
        return res.data
      },
    )
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch mutual funds'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
