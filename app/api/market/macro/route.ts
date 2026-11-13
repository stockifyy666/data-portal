import { NextResponse }          from 'next/server'
import { withCache, TTL_SECONDS } from '@/lib/redis/cache'

// ── IMF DataMapper helper ─────────────────────────────────────────────────────
// Fast, no-auth, returns annual data for Pakistan.
// Response: { values: { [indicator]: { PAK: { "2023": 4.6, "2022": 6.1, ... } } } }
async function fetchIMF(
  indicator: string,
  scale: (v: number) => number = v => v,
): Promise<{ value: number; change: number; date: string }> {
  const url = `https://www.imf.org/external/datamapper/api/v1/${indicator}/PAK`
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`IMF ${indicator} HTTP ${res.status}`)
  const json = await res.json()
  const yearMap: Record<string, number> = json?.values?.[indicator]?.PAK ?? {}
  const currentYear = new Date().getFullYear()
  const entries = Object.entries(yearMap)
    .filter(([y, v]) => Number(y) <= currentYear - 1 && v !== null && v !== undefined && !isNaN(Number(v)))
    .sort(([a], [b]) => Number(b) - Number(a))  // newest first, past years only
  if (!entries.length) throw new Error(`IMF no data for ${indicator}`)
  const [latestYear, latestRaw] = entries[0]
  const prevRaw = entries[1]?.[1]
  const val = +scale(Number(latestRaw)).toFixed(3)
  // Annual IMF data: don't compute % change of a rate — it's misleading (e.g. inflation 23%→4.5% shows -80%)
  return { value: val, change: 0, date: latestYear }
}

async function fetchUsdPkr(): Promise<{ value: number; change: number }> {
  // open.er-api.com — free, no API key, updates hourly
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    next: { revalidate: 0 },
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`exchange-rate API ${res.status}`)
  const json = await res.json()
  const rate: number = json?.rates?.PKR
  if (!rate) throw new Error('PKR rate missing from response')

  // Approximate 24h change — the free tier doesn't give previous close
  // so we fetch yesterday's snapshot from the same API
  let change = 0
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const ymd = yesterday.toISOString().slice(0, 10)
    const prev = await fetch(`https://open.er-api.com/v6/history/USD/${ymd}`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(6000),
    })
    if (prev.ok) {
      const pj = await prev.json()
      const prevRate: number = pj?.rates?.PKR
      if (prevRate) change = +((((rate - prevRate) / prevRate) * 100).toFixed(2))
    }
  } catch { /* change stays 0 */ }

  return { value: +rate.toFixed(2), change }
}

async function fetchYahooFuture(ticker: string): Promise<{ value: number; change: number }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Yahoo Finance ${ticker} ${res.status}`)
  const json   = await res.json()
  const meta   = json?.chart?.result?.[0]?.meta
  const closes: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
  const current = meta?.regularMarketPrice ?? closes[closes.length - 1]
  const prev    = closes.filter(Boolean).slice(-2)[0] ?? current
  if (!current) throw new Error(`${ticker} price missing`)
  const change = prev ? +((((current - prev) / prev) * 100).toFixed(2)) : 0
  return { value: +current.toFixed(2), change }
}

// ── World Bank helper (backup for indicators IMF doesn't cover) ───────────────
async function fetchWorldBank(
  indicator: string,
  scale: (v: number) => number = v => v,
): Promise<{ value: number; change: number; date: string }> {
  // mrnev=2 = 2 most-recent NON-EMPTY values (skips null years)
  const url = `https://api.worldbank.org/v2/country/PK/indicator/${indicator}?format=json&mrnev=2`
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`World Bank ${indicator} HTTP ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json) || !Array.isArray(json[1])) {
    throw new Error(`World Bank unexpected response for ${indicator}`)
  }
  const rows: Array<{ value: number | null; date: string }> = json[1]
  const valid = rows.filter(r => r.value !== null && r.value !== undefined)
  if (!valid.length) throw new Error(`World Bank no data for ${indicator}`)
  const [latest, previous] = valid
  const val    = +scale(latest.value!).toFixed(3)
  const prevVal = previous ? scale(previous.value!) : val
  const change  = prevVal !== 0 ? +((((val - prevVal) / Math.abs(prevVal)) * 100).toFixed(2)) : 0
  return { value: val, change, date: latest.date }
}

export async function GET() {
  const TTL    = TTL_SECONDS.MARKET_STATUS
  const TTL_1D = 86400

  // All 6 annual indicators from IMF DataMapper (no World Bank dependency — WB is unreliable in this env)
  // IMF WEO codes for Pakistan:
  //   NGDP_RPCH  = Real GDP growth rate (%)
  //   PCPIPCH    = CPI Inflation (annual average %)
  //   BCA        = Current account balance (USD billions)
  //   FIDR       = Financial institutions deposit rate (% — closest IMF proxy to SBP policy rate)
  //   RA         = Reserve assets, total incl gold (USD billions)
  //   BM_TRF     = Net secondary income / personal transfers (USD billions) — remittances proxy

  const [usdPkr, brent, wti, gdpGrowth, inflation, currentAcct] =
    await Promise.allSettled([
      withCache('macro:usdpkr', TTL, fetchUsdPkr),
      withCache('macro:brent',  TTL, () => fetchYahooFuture('BZ=F')),
      withCache('macro:wti',    TTL, () => fetchYahooFuture('CL=F')),
      withCache('macro:imf2:gdp',         TTL_1D, () => fetchIMF('NGDP_RPCH')),
      withCache('macro:imf2:inflation',   TTL_1D, () => fetchIMF('PCPIPCH')),
      withCache('macro:imf2:currentacct', TTL_1D, () => fetchIMF('BCA')),
    ])

  function val<T>(r: PromiseSettledResult<T>, label: string): T | null {
    if (r.status === 'fulfilled') return r.value
    console.error(`[macro API] ${label}:`, r.reason instanceof Error ? r.reason.message : r.reason)
    return null
  }

  return NextResponse.json({
    usdPkr:      val(usdPkr,      'usdPkr'),
    brent:       val(brent,       'brent'),
    wti:         val(wti,         'wti'),
    gdpGrowth:   val(gdpGrowth,   'gdpGrowth'),
    inflation:   val(inflation,   'inflation'),
    currentAcct: val(currentAcct, 'currentAcct'),
    policyRate:  null,
    ncpi:        null,
    spi:         null,
    csGdp:       null,
    fetchedAt:   new Date().toISOString(),
  })
}
