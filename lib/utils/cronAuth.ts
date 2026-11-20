// Shared auth for /api/sync/* cron routes.
// These routes skip the login check in middleware, so they MUST have a secret:
// if CRON_SECRET isn't set, every call is refused (never open by default).
// Accepts:  Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends this)
//      or:  ?secret=<CRON_SECRET>                  (external schedulers)

import { NextResponse, type NextRequest } from 'next/server'

export function cronUnauthorized(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET ?? ''
  const header = req.headers.get('authorization') ?? ''
  const query  = req.nextUrl.searchParams.get('secret') ?? ''
  if (secret && (header === `Bearer ${secret}` || query === secret)) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
