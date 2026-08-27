import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z }            from 'zod'

const SellSchema = z.object({
  holdingId:   z.string().uuid(),
  symbol:      z.string().min(2).max(10).toUpperCase(),
  quantity:    z.number().positive(),
  buyPrice:    z.number().positive(),
  sellPrice:   z.number().positive(),
  commission:  z.number().min(0).default(0),
  portfolioId: z.string().uuid(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('portfolio_transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'SELL')
    .order('transaction_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Normalise to the shape the UI expects
  const transactions = (data ?? []).map((r: any) => ({
    id:         r.id,
    symbol:     r.symbol,
    quantity:   r.quantity,
    buy_price:  r.buy_price  ?? 0,
    sell_price: r.price      ?? 0,
    commission: r.commission ?? 0,
    sold_at:    r.transaction_date,
  }))

  return NextResponse.json({ transactions })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json()
  const parsed = SellSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { holdingId, symbol, quantity, buyPrice, sellPrice, commission, portfolioId } = parsed.data

  // Get current holding to check quantity
  const { data: holding, error: fetchErr } = await (supabase as any)
    .from('portfolio_holdings')
    .select('id, quantity')
    .eq('id', holdingId)
    .single()

  if (fetchErr || !holding) {
    return NextResponse.json({ error: 'Holding not found' }, { status: 404 })
  }

  const remainingQty = holding.quantity - quantity

  // Record sell transaction using existing table schema
  const { error: txErr } = await (supabase as any)
    .from('portfolio_transactions')
    .insert({
      user_id:          user.id,
      portfolio_id:     portfolioId,
      symbol,
      type:             'SELL',
      quantity,
      price:            sellPrice,   // existing 'price' column = sell price
      buy_price:        buyPrice,    // newly added column
      commission,                    // newly added column
      total_value:      quantity * sellPrice - commission,
      transaction_date: new Date().toISOString(),
    })

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  // Reduce or remove the holding
  if (remainingQty <= 0) {
    await (supabase as any).from('portfolio_holdings').delete().eq('id', holdingId)
  } else {
    await (supabase as any)
      .from('portfolio_holdings')
      .update({ quantity: remainingQty, updated_at: new Date().toISOString() })
      .eq('id', holdingId)
  }

  return NextResponse.json({ success: true, remainingQty: Math.max(0, remainingQty) })
}
