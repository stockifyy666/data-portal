// Company announcements — served only from Supabase. The hourly sync
// (/api/sync/live-content) fetches the market-wide feed and files each
// announcement under its company. No per-company API call here.

import { NextRequest, NextResponse } from 'next/server'
import { getContent }                from '@/lib/supabase/content'
import type { Announcement }         from '@/lib/announcements/sync'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!SYMBOL_RE.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }

    const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10) || 0)
    const count  = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('count') ?? '50', 10) || 50))

    const all  = (await getContent<Announcement>(symbol, 'announcements')) ?? []
    const page = all.slice(offset, offset + count).map(a => {
      const raw   = [a.pdf, ...(Array.isArray(a.docs) ? a.docs : [])] as unknown[]
      const files = Array.from(new Set(raw.filter((f): f is string => typeof f === 'string' && /\.pdf$/i.test(f.trim())).map(f => f.trim())))
      const images = (Array.isArray(a.images) ? a.images : [])
        .filter((f): f is string => typeof f === 'string' && /\.(gif|png|jpe?g|webp)$/i.test(f.trim())).map(f => f.trim())
      return { ...a, announcementType: a.form_type ?? a.category ?? 'Announcement', files, images }
    })

    return NextResponse.json({ announcements: page, total: all.length, offset, count: page.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /stock/announcements]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
