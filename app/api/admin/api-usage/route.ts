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
    const [usage, fin, fund, news, anns, profiles] = await Promise.all([
      getCSAPIUsage(),
      count('financial_statements'), count('fundamentals'),
      count('news'), count('announcements'), count('company_profiles'),
    ])

    return NextResponse.json({
      usage,
      fsCount: fin + fund,                 // financial data rows
      scCount: news + anns + profiles,     // content rows
      tables:  { financial_statements: fin, fundamentals: fund, news, announcements: anns, company_profiles: profiles },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
