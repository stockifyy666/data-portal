import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'

export const metadata = { title: 'Settings — Stockifyy' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, avatar_url')
    .eq('id', session.user.id)
    .single()

  return (
    <div className="max-w-2xl space-y-6 animate-data">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
          Profile
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Full Name</label>
            <p className="text-sm text-slate-900 font-medium">{profile?.full_name ?? '—'}</p>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Email</label>
            <p className="text-sm text-slate-900 font-medium">{session.user.email}</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400">
          Profile editing coming soon. Contact support to update your details.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
          Broker Account
        </h2>
        <p className="text-xs text-slate-500">
          Link your Capital Stake broker account to enable trading terminal access via SSO.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50
                        border border-slate-200 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="text-xs text-slate-400">No broker linked</span>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
          Account
        </h2>
        <p className="text-[10px] text-slate-400">
          Member since{' '}
          {new Date(session.user.created_at).toLocaleDateString('en-PK', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>
    </div>
  )
}
