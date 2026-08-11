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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: portfolios } = await supabase
    .from('portfolios')
    .select(`
      id, name,
      portfolio_holdings (
        id, symbol, quantity, average_price, last_updated
      )
    `)
    .eq('user_id', session.user.id)

  const allHoldings = (portfolios ?? []).flatMap(
    (p: { portfolio_holdings: unknown[] }) => p.portfolio_holdings
  )

  return NextResponse.json({
    data: { portfolios: portfolios ?? [], holdings: allHoldings },
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json()
  const parsed = HoldingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { symbol, quantity, averagePrice, portfolioId } = parsed.data

  // Find or create the default portfolio
  let pid = portfolioId
  if (!pid) {
    const { data: existing } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('is_default', true)
      .single()

    if (existing) {
      pid = existing.id
    } else {
      const { data: created } = await supabase
        .from('portfolios')
        .insert({ user_id: session.user.id, name: 'My Portfolio', is_default: true })
        .select('id')
        .single()
      pid = created?.id
    }
  }

  if (!pid) return NextResponse.json({ error: 'Failed to create portfolio' }, { status: 500 })

  const { error } = await supabase
    .from('portfolio_holdings')
    .upsert({
      portfolio_id:  pid,
      symbol,
      quantity,
      average_price: averagePrice,
      last_updated:  new Date().toISOString(),
    }, { onConflict: 'portfolio_id,symbol' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
