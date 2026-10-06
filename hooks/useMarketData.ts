'use client'

// =============================================================================
// FILE: hooks/useMarketData.ts
// PURPOSE: Custom React hooks for fetching market data in components.
//          Wraps cachedFetch with React state (loading, error, data, refresh).
//          All hooks auto-refresh on the interval passed — default 5 minutes.
//
//          AVAILABLE HOOKS:
//          useAllQuotes()     → all 500+ PSX stock quotes
//          useIndices()       → KSE100, KSE30, KMI30 index levels
//          useMarketStatus()  → market open/closed status
//          useMarketMovers()  → top gainers and losers
//          useStockOverview() → single stock company overview
//          useStockChart()    → single stock chart data
//
//          Uses cachedFetch internally so multiple components using the same
//          hook share one network request (no duplicate API calls).
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import { cachedFetch } from '@/lib/utils/clientCache'

type FetchState<T> = {
  data:     T | null
  loading:  boolean
  error:    string | null
  refresh:  () => void
}

// Generic hook — pass the endpoint and refresh interval in ms
function useMarketFetch<T>(
  endpoint:    string,
  intervalMs:  number = 5 * 60 * 1000,  // Default: 5 minutes
): FetchState<T> {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    try {
      const json = await cachedFetch<{ data: T }>(endpoint, intervalMs)
      setData((json as any).data ?? json)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [endpoint, intervalMs])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, intervalMs)
    return () => clearInterval(id)
  }, [fetch_, intervalMs])

  return { data, loading, error, refresh: fetch_ }
}

// ─── Named exports for each data type ─────────────────────────────────────

import type { Quote, Index, MarketMover, MarketStatus } from '@/types/market'

export function useAllQuotes() {
  return useMarketFetch<Quote[]>('/api/market/quotes', 5 * 60 * 1000)
}

export function useIndices() {
  return useMarketFetch<Index[]>('/api/market/indices', 5 * 60 * 1000)
}

export function useMarketStatus() {
  return useMarketFetch<MarketStatus>('/api/market/status', 10 * 60 * 1000)
}

export function useMarketMovers() {
  return useMarketFetch<{ gainers: MarketMover[]; losers: MarketMover[] }>(
    '/api/market/movers',
    5 * 60 * 1000,
  )
}

export function useStockOverview(symbol: string) {
  return useMarketFetch<Record<string, unknown>>(
    `/api/market/${symbol}/overview`,
    60 * 60 * 1000,  // 1 hour — company data rarely changes
  )
}

export function useStockChart(symbol: string, tf: '1min' | '5min' | '15min' | 'eod' = 'eod') {
  return useMarketFetch<unknown[]>(
    `/api/market/${symbol}/chart?tf=${tf}`,
    60 * 60 * 1000,  // 1 hour cache
  )
}
