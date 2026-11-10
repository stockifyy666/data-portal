// Shared types for Capital Stake UAT API (uat.csapis.com)
// Used by both API routes (server) and components (client) via `import type`

export interface RawStock {
  symbol:     string
  name:       string
  sector:     string
  type:       number
  status:     number
  ldcp:       number
  ldcv:       number
  high52:     number
  low52:      number
  ucap:       number
  lcap:       number
  shares:     number
  free_float: number
  market_cap: number
  listed_in:  string[]
  xb: boolean; xd: boolean; xr: boolean; sd: boolean
}

export interface RawQuote {
  symbol:         string
  date:           string
  open:           number
  high:           number
  low:            number
  close:          number
  volume:         number
  change:         number
  change_percent: number
  bid_price:      number
  bid_volume:     number
  ask_price:      number
  ask_volume:     number
}

// Merged shape: static reference data + live quote fields
// price/change/volume are null when market is closed or quote is unavailable
export interface MergedStock extends RawStock {
  price:          number | null
  open:           number | null
  high:           number | null
  low:            number | null
  volume:         number | null
  change:         number | null
  change_percent: number | null
  bid_price:      number | null
  ask_price:      number | null
  last_trade:     string | null
}
