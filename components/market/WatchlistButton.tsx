'use client'

import { useState, useEffect } from 'react'
import { Star, LogIn }         from 'lucide-react'
import { useRouter }           from 'next/navigation'

type Props = { symbol: string }

export default function WatchlistButton({ symbol }: Props) {
  const router = useRouter()
  const [watched,   setWatched]   = useState(false)
  const [loggedIn,  setLoggedIn]  = useState(true)
  const [loading,   setLoading]   = useState(true)
  const [working,   setWorking]   = useState(false)

  useEffect(() => {
    fetch('/api/watchlist')
      .then(r => {
        if (r.status === 401) { setLoggedIn(false); return null }
        return r.json()
      })
      .then(json => {
        if (!json) return
        if (json.data) {
          const allSymbols = (json.data as Array<{ watchlist_items: Array<{ symbol: string }> }>)
            .flatMap(w => w.watchlist_items?.map(i => i.symbol) ?? [])
          setWatched(allSymbols.includes(symbol))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol])

  async function toggle() {
    if (!loggedIn) { router.push('/login'); return }
    setWorking(true)
    try {
      if (watched) {
        const res = await fetch(`/api/watchlist?symbol=${symbol}`, { method: 'DELETE' })
        if (res.ok) setWatched(false)
      } else {
        const res = await fetch('/api/watchlist', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ symbol }),
        })
        if (res.ok) setWatched(true)
      }
    } catch {}
    setWorking(false)
  }

  if (loading) {
    return <div className="w-36 h-9 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
  }

  if (!loggedIn) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
        style={{ borderColor: 'var(--bg-border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}
      >
        <LogIn size={14} />
        Login to Watch
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={working}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50"
      style={watched
        ? { backgroundColor: '#fefce8', color: '#b45309', borderColor: '#fde68a' }
        : { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--bg-border)' }}
    >
      <Star size={14} className={watched ? 'fill-amber-500 text-amber-500' : ''} />
      {watched ? 'Watching' : 'Add to Watchlist'}
    </button>
  )
}
