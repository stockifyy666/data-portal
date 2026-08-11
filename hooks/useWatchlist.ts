// =============================================================================
// FILE: hooks/useWatchlist.ts
// PURPOSE: Hook to read and manage the current user's watchlist.
//          Calls /api/watchlist (GET/POST/DELETE) which checks Supabase RLS —
//          so users can only see and modify their own data.
//          Returns helper functions: addSymbol, removeSymbol, isWatched.
// =============================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'

type WatchlistItem = {
  id:        string
  symbol:    string
  addedAt:   string
}

type Watchlist = {
  id:    string
  name:  string
  items: WatchlistItem[]
}

export function useWatchlist() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [loading,    setLoading]    = useState(true)

  // All symbols from all watchlists as a flat Set for O(1) lookup
  const watchedSymbols = new Set(
    watchlists.flatMap(w => w.items.map(i => i.symbol))
  )

  const fetchWatchlist = useCallback(async () => {
    try {
      const res  = await fetch('/api/watchlist')
      const json = await res.json()
      if (json.data) setWatchlists(json.data)
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  async function addSymbol(symbol: string): Promise<boolean> {
    try {
      const res = await fetch('/api/watchlist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbol }),
      })
      if (res.ok) { await fetchWatchlist(); return true }
      return false
    } catch { return false }
  }

  async function removeSymbol(symbol: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/watchlist?symbol=${symbol}`, { method: 'DELETE' })
      if (res.ok) { await fetchWatchlist(); return true }
      return false
    } catch { return false }
  }

  return {
    watchlists,
    loading,
    watchedSymbols,
    isWatched:    (symbol: string) => watchedSymbols.has(symbol),
    addSymbol,
    removeSymbol,
    refresh:      fetchWatchlist,
  }
}
