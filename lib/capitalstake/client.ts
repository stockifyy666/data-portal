// Capital Stake UAT API client (uat.csapis.com).
// All requests use the UAT bearer token — no session cookies needed.

// GET any uat.csapis.com endpoint
export async function csUatGet<T = unknown>(url: string): Promise<T> {
  const rawToken =
    process.env.CAPITAL_STAKE_CHART_BEARER_TOKEN ||
    process.env.CAPITAL_STAKE_BEARER_TOKEN!
  const res = await fetch(url, {
    method:  'GET',
    headers: { 'Authorization': `Bearer ${rawToken}`, 'Accept': 'application/json' },
    cache:   'no-store',
  })
  if (res.status === 401) throw new Error(`CS UAT API 401 Unauthorized: ${url}`)
  if (res.status === 403) throw new Error(`CS UAT API 403 Forbidden: ${url}`)
  if (!res.ok)            throw new Error(`CS UAT API ${res.status} ${res.statusText}: ${url}`)
  const data = await res.json()
  if (data.status === 'error') throw new Error(`CS UAT API error: ${data.message}`)
  return data as T
}
