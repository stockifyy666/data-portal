// Capital Stake API client.
// Every request uses Bearer token + laravel_session cookie together.
// Session is managed by session.ts (auto-refreshes every 90 min via Playwright).

import { getSession } from './session'

const BASE = process.env.CAPITAL_STAKE_BASE_URL!

async function buildHeaders(contentType = 'application/json') {
  const { cookieHeader, xsrfToken, bearerToken } = await getSession()
  // Use token captured from /token endpoint at login; fall back to env var
  const token = bearerToken || process.env.CAPITAL_STAKE_BEARER_TOKEN!
  return {
    'Authorization':    `Bearer ${token}`,
    'Content-Type':     contentType,
    'Accept':           'application/json',
    'Origin':           BASE,
    'Referer':          `${BASE}/dashboard`,
    'X-Requested-With': 'XMLHttpRequest',
    'Cookie':           cookieHeader,
    'X-XSRF-TOKEN':     xsrfToken,
  }
}

// GET any Capital Stake endpoint
export async function csGet<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'GET', headers: await buildHeaders(), cache: 'no-store' })

  if (res.status === 401) throw new Error(`CS API 401 Unauthorized: ${url}`)
  if (res.status === 403) throw new Error(`CS API 403 Forbidden: ${url}`)
  if (!res.ok)            throw new Error(`CS API ${res.status} ${res.statusText}: ${url}`)

  const data = await res.json()
  if (data.status === 'error') throw new Error(`CS API error: ${data.message}`)
  return data as T
}

// POST any Capital Stake endpoint with form-encoded body
export async function csPost<T = unknown>(url: string, body: string, formEncoded = true): Promise<T> {
  const contentType = formEncoded ? 'application/x-www-form-urlencoded' : 'application/json'
  const res = await fetch(url, {
    method:  'POST',
    headers: await buildHeaders(contentType),
    body,
    cache:   'no-store',
  })

  if (res.status === 401) throw new Error(`CS API 401 Unauthorized: ${url}`)
  if (res.status === 403) throw new Error(`CS API 403 Forbidden: ${url}`)
  if (!res.ok)            throw new Error(`CS API ${res.status} ${res.statusText}: ${url}`)

  const data = await res.json()
  if (data.status === 'error') throw new Error(`CS API error: ${data.message}`)
  return data as T
}

// The main market data call — returns all stocks, indices, futures in one shot
export async function csMarketData() {
  const url  = `${BASE}/api/v3/market?path=/req`
  const data = await csPost<any>(url, 'item=market')
  return data?.data ?? {}
}
