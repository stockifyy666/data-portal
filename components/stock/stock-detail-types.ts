// Shared types used across StockDetailClient and its tab components

export type Overview = {
  symbol:      string
  name:        string
  price:       number
  open:        number
  high:        number
  low:         number
  change:      number
  changePct:   number
  volume:      number
  high52:      number
  low52:       number
  lastClose:   number
  lastDayVol:  number
  sector:      string
  bidPrice:    number
  askPrice:    number
  lastTrade:   string | null
  sharesOut:   number
  freeFloat:   number
  marketCap:   number
  freeFloatPct: number
  listedIn:    string[]
  xd:          boolean
  xb:          boolean
  xr:          boolean
}

export type Candle = {
  date: string; open: number; high: number
  low: number; close: number; volume: number
}

export type StatementData = {
  periods:  Array<{ year: string; quarter?: string; period_end: string }>
  fields:   Array<{ label: string; values: (number | null)[]; is_heading?: boolean }>
}

export type ProfileData = {
  profile: { data: {
    name: string; symbol: string; sector_name: string; description: string
    people:   Array<{ position: string; name: string }>
    auditors: string; offices: string[]
  }}
  org: { data: {
    nm: string; per: Array<{ nm: string; des: string; pht: string; ed: string | null }>
  }} | null
  overview: {
    symbol: string; name: string; description: string
    sector_code: string; sector_name: string
    people: Array<{ position: string; name: string }>
    auditors: string
    offices: string[]; factories: string[]; registrar: string[]
    website: string
    employees: number | null
    capacity: string[]; capacity_util: string[]
    associated: string[]
    year_end: string; par_value: number | null
  } | null
}

export type NewsItem = {
  title: string; date: string; description: string
  link: string; image: string; source: string
}

export type Announcement = {
  id: number; title: string; date: string; announcementType: string
  dividend: number | null; bonus: number | null; exDate: string | null
  pdf_id: string | null; name: string
}
