import { NextResponse }         from 'next/server'
import { cookies }              from 'next/headers'
import { createServerClient }   from '@supabase/ssr'
import { getCSAPIUsage }        from '@/lib/utils/rateLimit'
import { createServiceClient }  from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.app_metadata?.role as string | undefined
    if (!user || (role !== 'admin' && role !== 'superadmin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createServiceClient()
    const count = (t: string) => db.from(t).select('*', { count: 'exact', head: true }).then(r => r.count ?? 0)
    // Row count with equality filters, e.g. where('company_profiles', { kind: 'detail' })
    const where = (t: string, f: Record<string, string>) => {
      let q = db.from(t).select('*', { count: 'exact', head: true })
      for (const [k, v] of Object.entries(f)) q = q.eq(k, v)
      return q.then(r => r.count ?? 0)
    }
    const stmt = (type: string, interval: string) => where('financial_statements', { stmt_type: type, interval })

    const [
      usage,
      incA, incQ, balA, balQ, cfA, cfQ,
      fund, overview, detail, shareholders, payouts,
      insider, anns, generalNews, sectorNews,
    ] = await Promise.all([
      getCSAPIUsage(),
      stmt('income', 'annual'),   stmt('income', 'quarterly'),
      stmt('balance', 'annual'),  stmt('balance', 'quarterly'),
      stmt('cashflow', 'annual'), stmt('cashflow', 'quarterly'),
      count('fundamentals'),
      where('company_profiles', { kind: 'overview' }),     where('company_profiles', { kind: 'detail' }),
      where('company_profiles', { kind: 'shareholders' }), where('company_profiles', { kind: 'payouts' }),
      count('insider_transactions'), count('announcements'),
      where('news_items', { scope: 'general' }), where('news', { scope: 'sector' }),
    ])

    const fin = incA + incQ + balA + balQ + cfA + cfQ
    return NextResponse.json({
      usage,
      fsCount: fin + fund,
      scCount: overview + detail + shareholders + payouts + insider + anns + generalNews + sectorNews,
      tables: {
        income_annual: incA, income_quarterly: incQ,
        balance_annual: balA, balance_quarterly: balQ,
        cashflow_annual: cfA, cashflow_quarterly: cfQ,
        fundamentals: fund,
        profile_overview: overview, profile_detail: detail, shareholders, payouts,
        insider_transactions: insider, announcements: anns,
        news_general: generalNews, news_sector: sectorNews,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
