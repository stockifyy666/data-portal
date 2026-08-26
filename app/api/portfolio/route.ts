// =============================================================================
// FILE: app/api/portfolio/route.ts
// PURPOSE: CRUD for the user's portfolio holdings.
//          GET  — returns all portfolios with their holdings.
//          POST — add or update a holding (symbol, quantity, averagePrice).
//          All operations are scoped to the logged-in user via Supabase RLS.
// =============================================================================

import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { z }             from 'zod'

const HoldingSchema = z.object({
  symbol:        z.string().min(2).max(6).toUpperCase(),
  quantity:      z.number().positive(),
  averagePrice:  z.number().positive(),
  portfolioId:   z.string().uuid().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: portfolios } = await (supabase as any)
    .from('portfolios')
    .select(`
      id, name,
      portfolio_holdings (
        id, symbol, quantity, avg_buy_price, updated_at
      )
    `)
    .eq('user_id', user.id)

  const allHoldings = (portfolios ?? []).flatMap(
    (p: { portfolio_holdings: unknown[] }) => p.portfolio_holdings
  )

  return NextResponse.json({
    data: { portfolios: portfolios ?? [], holdings: allHoldings },
  })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { holdingId } = await request.json()
  if (!holdingId) return NextResponse.json({ error: 'holdingId required' }, { status: 400 })

  const { error } = await (supabase as any)
    .from('portfolio_holdings')
    .delete()
    .eq('id', holdingId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json()
  const parsed = HoldingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { symbol, quantity, averagePrice, portfolioId } = parsed.data

  // Find or create the default portfolio
  let pid = portfolioId
  if (!pid) {
    const { data: existing, error: findErr } = await (supabase as any)
      .from('portfolios')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (findErr && findErr.code !== 'PGRST116') {
      // PGRST116 = "no rows found" — that's fine, we'll create one
      console.error('[portfolio POST] find error:', findErr)
      return NextResponse.json({ error: findErr.message }, { status: 500 })
    }

    if (existing) {
      pid = existing.id
    } else {
      const { data: created, error: createErr } = await (supabase as any)
        .from('portfolios')
        .insert({ user_id: user.id, name: 'My Portfolio' })
        .select('id')
        .single()
      if (createErr) {
        console.error('[portfolio POST] create error:', createErr)
        return NextResponse.json({ error: createErr.message }, { status: 500 })
      }
      pid = created?.id
    }
  }

  if (!pid) return NextResponse.json({ error: 'Failed to resolve portfolio id' }, { status: 500 })

  const { error } = await (supabase as any)
    .from('portfolio_holdings')
    .upsert({
      portfolio_id:  pid,
      symbol,
      quantity,
      avg_buy_price: averagePrice,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'portfolio_id,symbol' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
