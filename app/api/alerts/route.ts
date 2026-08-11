// =============================================================================
// FILE: app/api/alerts/route.ts
// PURPOSE: CRUD for price alerts.
//          GET    — returns all active and triggered alerts for current user.
//          POST   — creates a new price alert.
//          DELETE — deletes an alert by ID (?id=...).
//          All operations scoped to logged-in user, RLS enforced in DB.
// =============================================================================

import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { z }             from 'zod'

const CreateSchema = z.object({
  symbol:      z.string().min(2).max(6).toUpperCase(),
  targetPrice: z.number().positive(),
  direction:   z.enum(['above', 'below']),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { symbol, targetPrice, direction } = parsed.data

  const { error } = await supabase.from('price_alerts').insert({
    user_id:      session.user.id,
    symbol,
    target_price: targetPrice,
    direction,
    is_active:    true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)  // RLS double-check in query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
