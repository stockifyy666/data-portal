import { createClient }       from '@/lib/supabase/server'
import MarketStatusBanner      from '@/components/market/MarketStatusBanner'
import DashboardClient         from '@/components/market/DashboardClient'
import MorningBrief            from '@/components/market/MorningBrief'

export const metadata = { title: 'Dashboard — Stockifyy' }
export const revalidate = 300

export default async function DashboardPage() {
  // Resolve first name server-side so no flicker
  let userName: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single()

      // Priority: profile full_name → auth metadata → username → skip
      const full =
        profile?.full_name?.trim() ||
        user.user_metadata?.full_name?.trim() ||
        user.user_metadata?.name?.trim() ||
        profile?.username?.trim() ||
        ''

      // Only use if it looks like a real name (letters/spaces, not an email handle)
      if (full && /^[A-Za-z\s]{2,40}$/.test(full)) {
        userName = full.split(' ')[0] // first name only
      }
    }
  } catch { /* not fatal */ }

  return (
    <div className="space-y-5 animate-data">
      <MorningBrief userName={userName} />
      <MarketStatusBanner />
      <DashboardClient />
    </div>
  )
}
