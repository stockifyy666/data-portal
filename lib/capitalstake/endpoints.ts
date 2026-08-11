// =============================================================================
// FILE: lib/capitalstake/endpoints.ts
// PURPOSE: Central list of every Capital Stake REST API endpoint URL we use.
//          Keeping all URLs in one place means if Capital Stake ever changes
//          a URL, we only update it here — not across 20 different files.
//          BASE_URL comes from environment variables — never hardcoded.
// =============================================================================

const BASE = process.env.CAPITAL_STAKE_BASE_URL ?? 'https://stockifyy.capitalstake.com'

export const CS_ENDPOINTS = {

  // ── MARKET QUOTES (main market data endpoint) ───────────────────────────
  MARKET_ALL: `${BASE}/api/v3/market?path=/req`,

  // ── CHART DATA ───────────────────────────────────────────────────────────
  // Intraday 1-min candles for today — path periods: 1D, 2D, 1W, 1M, 3M, 6M, 1Y
  INTRADAY: (symbol: string, period = '1D') =>
    `${BASE}/api/v3/market?path=/intraday/${symbol}/${period}`,

  // Daily OHLCV historical bars
  DAILY: (symbol: string) =>
    `${BASE}/api/v3/market?path=/daily/${symbol}`,

  // Legacy aliases kept so existing routes don't break
  CHART_1MIN:  (symbol: string) => `${BASE}/api/v3/market?path=/intraday/${symbol}/1D`,
  CHART_5MIN:  (symbol: string) => `${BASE}/api/v3/market?path=/intraday/${symbol}/1D`,
  CHART_15MIN: (symbol: string) => `${BASE}/api/v3/market?path=/intraday/${symbol}/2D`,
  EOD_ADJUSTED:   (symbol: string) => `${BASE}/api/v3/market?path=/daily/${symbol}`,
  EOD_UNADJUSTED: (symbol: string) => `${BASE}/api/v3/market?path=/daily/${symbol}`,

  // ── COMPANY STATEMENTS (balance / income / fundamentals / shareholders) ──
  // type: balance | income | fundamentals | profile | shareholders
  // interval: annual | quarterly
  COMPANY_STATEMENT: (symbol: string, interval: string, type: string) =>
    `${BASE}/api/v3/company-statement?symbol=${symbol}&interval=${interval}&type=${type}`,

  // Convenience aliases
  ANNUAL_BALANCE_SHEET:    (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=balance`,
  QUARTERLY_BALANCE_SHEET: (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=quarterly&type=balance`,
  ANNUAL_INCOME:           (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=income`,
  QUARTERLY_INCOME:        (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=quarterly&type=income`,
  FUNDAMENTALS:            (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=fundamentals`,
  SHAREHOLDERS:            (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=shareholders`,
  COMPANY_PROFILE:         (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=profile`,

  // Financial ratios — same as fundamentals
  FINANCIAL_RATIOS: (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=fundamentals`,
  ANNUAL_CASHFLOW:  (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=balance`,

  // ── ORGANIZATION / MANAGEMENT ────────────────────────────────────────────
  ORGANIZATION: (symbol: string) => `${BASE}/persons/organization?code=${symbol}`,

  // ── NEWS ─────────────────────────────────────────────────────────────────
  NEWS: (symbol: string) => `${BASE}/api/v3/news/${symbol}`,
  NEWS_GENERIC: `${BASE}/api/v3/news/GENERIC`,

  // ── ANNOUNCEMENTS ────────────────────────────────────────────────────────
  // type: ALL | DIVIDEND | BONUS | RIGHTS | FINANCIAL_RESULT | AGM | EGM
  ANNOUNCEMENTS: (symbol: string, from: string, to: string, type = 'ALL') =>
    `${BASE}/announcements/${symbol}?rangeFrom=${from}&rangeTo=${to}&type=${type}`,

  // Legacy announcement aliases
  ALL_ANNOUNCEMENTS:       `${BASE}/api/v1/announcements/financial-result`,
  ANNOUNCEMENTS_BY_SYMBOL: (symbol: string) => `${BASE}/api/v1/announcements/financial-result?symbol=${symbol}`,
  BOARD_MEETINGS:          `${BASE}/api/v1/announcements/board-meeting`,

  // ── UNUSED / PLACEHOLDER ─────────────────────────────────────────────────
  ALL_QUOTES:           `${BASE}/api/v3/screener?id=487633`,
  ALL_SYMBOLS_OVERVIEW: `${BASE}/api/v3/screener?id=487633`,
  SINGLE_OVERVIEW:      (s: string) => `${BASE}/api/v3/market?path=/intraday/${s}/1D`,
  INDICES_OVERVIEW:     `${BASE}/api/v3/market?path=/intraday/KSE100/1D`,
  SINGLE_INDEX:         (i: string) => `${BASE}/api/v3/market?path=/intraday/${i}/1D`,
  GAINERS_LOSERS:       `${BASE}/api/v3/market?path=/intraday/KSE100/1D`,
  VOLUME_LEADERS:       `${BASE}/api/v3/market?path=/intraday/KSE100/1D`,
  MARKET_STATUS:        `${BASE}/api/v3/market?path=/intraday/KSE100/1D`,
  MARKET_HOLIDAYS:      `${BASE}/api/v3/market?path=/intraday/KSE100/1D`,
  SECTORS:              `${BASE}/api/v3/economy-data`,
  KEY_METRICS:          (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=fundamentals`,
  SHAREHOLDER_PATTERN:  (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=shareholders`,
  DIVIDENDS:            (s: string) => `${BASE}/api/v3/market?path=/daily/${s}`,
  BONUS:                (s: string) => `${BASE}/api/v3/market?path=/daily/${s}`,
  RIGHTS:               (s: string) => `${BASE}/api/v3/market?path=/daily/${s}`,
  MUTUAL_FUNDS_LIST:    `${BASE}/api/v3/market?path=/intraday/NITPGI/1D`,
  ALL_FUNDS_OVERVIEW:   `${BASE}/api/v3/market?path=/intraday/NITPGI/1D`,
  FUND_PROFILE:         (f: string) => `${BASE}/api/v3/market?path=/intraday/${f}/1D`,
  FUND_RETURNS:         (f: string) => `${BASE}/api/v3/market?path=/intraday/${f}/1D`,
  ECONOMY_DATA:         `${BASE}/api/v3/economy-data`,
  FOREX_OPEN_MARKET:    `${BASE}/api/v3/economy-data`,
  FOREX_M2M_RATE:       `${BASE}/api/v3/economy-data`,
  FOREX_REER:           `${BASE}/api/v3/economy-data`,
  FOREX_WEIGHTED_AVG:   `${BASE}/api/v3/economy-data`,
  COMMODITIES_BY_ITEM:  `${BASE}/api/v3/economy-data`,
  COMMODITIES_BY_REGION:`${BASE}/api/v3/economy-data`,
  COMPANY_PROFILE_BASIC:    (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=profile`,
  COMPANY_PROFILE_DETAILED: (s: string) => `${BASE}/api/v3/company-statement?symbol=${s}&interval=annual&type=profile`,

} as const
