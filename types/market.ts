// =============================================================================
// FILE: types/market.ts
// PURPOSE: TypeScript types for all market data coming from Capital Stake API.
//          These types match exactly what Capital Stake returns in their JSON
//          responses. Using these prevents bugs where we access wrong field names.
//          Field names match the Capital Stake documentation (short keys like
//          s=symbol, c=close, v=volume — same as WebSocket tick format).
// =============================================================================

// =============================================================================
// Standard wrapper around every Capital Stake REST response
// { status: 'ok', message: '', data: <actual data> }
// =============================================================================
export type CSResponse<T> = {
  status:  'ok' | 'error'
  message: string
  data:    T
  count?:  number
  offset?: number
  total?:  number
}

// =============================================================================
// Market Quote — real-time price snapshot for a single stock
// Field names match Capital Stake WebSocket tick format
// =============================================================================
export type Quote = {
  m:    string   // market type: REG, IDX, FUT, ODL
  st:   string   // session state: OPN, PRE, PCL, HLT, CBR, SUS
  s:    string   // symbol (e.g. "DGKC")
  t:    number   // unix timestamp (seconds)
  o:    number   // open price
  h:    number   // high price
  l:    number   // low price
  c:    number   // current/close price
  v:    number   // volume traded
  ldcp: number   // last day close price
  ch:   number   // price change from previous close
  pch:  number   // percent change (decimal e.g. 0.00189 = 0.189%)
  bp:   number   // bid price
  bv:   number   // bid volume
  ap:   number   // ask price
  av:   number   // ask volume
  val:  number   // total traded value (PKR)
  tr:   number   // number of trades
  lt:   { t: number; x: number; v: number } | null  // last trade
}

// =============================================================================
// Symbol Overview — full market snapshot with company info
// =============================================================================
export type SymbolOverview = {
  symbol:      string
  name:        string
  sector:      string
  market:      string
  price:       number
  change:      number
  changePercent: number
  volume:      number
  value:       number
  high:        number
  low:         number
  open:        number
  prevClose:   number
  marketCap:   number
  peRatio:     number | null
  eps:         number | null
}

// =============================================================================
// Index — KSE-100, KSE-30, KMI-30, sectoral indices
// =============================================================================
export type Index = {
  code:         string    // e.g. "KSE100"
  name:         string    // e.g. "KSE-100 Index"
  current:      number
  change:       number
  changePercent: number
  volume:       number
  high:         number
  low:          number
  open:         number
  prevClose:    number
}

// =============================================================================
// OHLCV Candle — one candlestick bar for charting
// Used for 1min, 5min, 15min intraday and EOD historical charts
// =============================================================================
export type OHLCVCandle = {
  time:   number   // unix timestamp
  open:   number
  high:   number
  low:    number
  close:  number
  volume: number
}

// =============================================================================
// StockQuote — normalized quote from the screener endpoint
// =============================================================================
export type StockQuote = {
  symbol:     string
  name:       string
  price:      number
  open:       number
  high:       number
  low:        number
  change:     number
  changePct:  number   // as percentage e.g. -0.46
  volume:     number
  high52:     number
  low52:      number
  lastClose:  number
  eps:        number
  sector:     string   // sector code e.g. "0831"
  indexKeys:  string[] // e.g. ["KSE100","ALLSHR"]
  dps:        number   // dividend per share
  xd:         boolean  // ex-dividend
  xb:         boolean  // ex-bonus
  xr:         boolean  // ex-rights
}

// =============================================================================
// Market Mover — a gainer or loser stock
// =============================================================================
export type MarketMover = {
  symbol:        string
  name:          string
  price:         number
  change:        number
  changePercent: number
  volume:        number
}

// =============================================================================
// Market Status — is PSX currently open or closed?
// =============================================================================
export type MarketStatus = {
  isOpen:      boolean
  session:     string    // e.g. "Regular Trading", "Pre-Open", "Closed"
  nextOpen:    string | null   // ISO timestamp of next open
  nextClose:   string | null   // ISO timestamp of next close
}

// =============================================================================
// Company Profile — basic and detailed info
// =============================================================================
export type CompanyProfile = {
  symbol:       string
  name:         string
  sector:       string
  industry:     string
  ceo:          string | null
  website:      string | null
  description:  string | null
  listed:       string | null
  employees:    number | null
  address:      string | null
}

// =============================================================================
// Financial Statement Row — one line item in balance sheet, income, cashflow
// =============================================================================
export type FinancialRow = {
  label:  string
  values: Record<string, number | null>  // { "2023": 1234567, "2022": 9876543 }
}

// =============================================================================
// Mutual Fund — NAV and profile data
// =============================================================================
export type MutualFund = {
  id:           string
  name:         string
  amc:          string    // Asset Management Company
  category:     string    // Equity, Money Market, Income, etc.
  nav:          number    // Net Asset Value per unit
  navDate:      string
  returns1Y:    number | null
  returns3Y:    number | null
  returns5Y:    number | null
  risk:         string | null
  minInvestment: number | null
}

// =============================================================================
// Announcement — corporate disclosure from PUCARS feed
// =============================================================================
export type Announcement = {
  id:       string
  symbol:   string
  company:  string
  type:     string
  title:    string
  date:     string
  content:  string | null
  url:      string | null
}

// =============================================================================
// Forex Rate — PKR vs foreign currency
// =============================================================================
export type ForexRate = {
  currency:  string   // e.g. "USD", "EUR", "GBP"
  buyRate:   number
  sellRate:  number
  date:      string
}
