import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { z }                         from 'zod'

const AddSymbolSchema = z.object({
  symbol:      z.string().min(2).max(10).toUpperCase(),
  watchlistId: z.string().uuid().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ data: [] })

    const { data, error } = await supabase
      .from('watchlists')
      .select(`id, name, is_default, created_at, watchlist_items(id, symbol, sort_order, added_at)`)
      .eq('user_id', session.user.id)
      .order('is_default', { ascending: false })
      .order('created_at')

    if (error) throw error
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API GET /watchlist]', message)
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Login to use watchlist' }, { status: 401 })

    const body   = await request.json()
    const parsed = AddSymbolSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { symbol, watchlistId } = parsed.data
    let targetWatchlistId = watchlistId

    if (!targetWatchlistId) {
      const { data: existing } = await supabase
        .from('watchlists').select('id')
        .eq('user_id', session.user.id).eq('is_default', true).single()

      if (existing) {
        targetWatchlistId = existing.id
      } else {
        const { data: created, error: createError } = await supabase
          .from('watchlists')
          .insert({ user_id: session.user.id, name: 'My Watchlist', is_default: true })
          .select('id').single()
        if (createError) throw createError
        targetWatchlistId = created.id
      }
    }

    const { error: insertError } = await supabase
      .from('watchlist_items').insert({ watchlist_id: targetWatchlistId, symbol })

    if (insertError && !insertError.message.includes('duplicate')) throw insertError
    return NextResponse.json({ success: true, symbol }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API POST /watchlist]', message)
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Login to use watchlist' }, { status: 401 })

    const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase()
    if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })

    const { error } = await supabase
      .from('watchlist_items').delete().eq('symbol', symbol)

    if (error) throw error
    return NextResponse.json({ success: true, symbol }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API DELETE /watchlist]', message)
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 })
  }
}
