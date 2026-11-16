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
    const [usage, { count: fsCount }, { count: scCount }] = await Promise.all([
      getCSAPIUsage(),
      db.from('financial_statements').select('*', { count: 'exact', head: true }),
      db.from('stock_content').select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json({ usage, fsCount: fsCount ?? 0, scCount: scCount ?? 0 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
