// Central list of every Capital Stake UAT API endpoint (uat.csapis.com).

const UAT_BASE = process.env.CAPITAL_STAKE_UAT_URL ?? 'https://uat.csapis.com'

export const CS_ENDPOINTS = {

  // ── MARKET DATA ──────────────────────────────────────────────────────────────
  STOCKS_LIST:  `${UAT_BASE}/3.0/market/stocks`,
  QUOTES_LIST:  `${UAT_BASE}/3.0/market/quotes`,
  TICKERS:      `${UAT_BASE}/3.0/market/tickers`,
  MARKET_QUOTE: (symbol: string) => `${UAT_BASE}/3.0/market/quote?symbol=${symbol}`,

  // ── CHART DATA ───────────────────────────────────────────────────────────────
  CHART_1MIN:  (symbol: string) => `${UAT_BASE}/3.0/market/intraday/1m?symbol=${symbol}`,
  CHART_5MIN:  (symbol: string) => `${UAT_BASE}/3.0/market/intraday/5m?symbol=${symbol}`,
  CHART_10MIN: (symbol: string) => `${UAT_BASE}/3.0/market/intraday/10m?symbol=${symbol}`,
  CHART_15MIN: (symbol: string) => `${UAT_BASE}/3.0/market/intraday/15m?symbol=${symbol}`,
  CHART_30MIN: (symbol: string) => `${UAT_BASE}/3.0/market/intraday/30m?symbol=${symbol}`,
  CHART_1H:    (symbol: string) => `${UAT_BASE}/3.0/market/intraday/1h?symbol=${symbol}`,

  // ── COMPANY PROFILE ──────────────────────────────────────────────────────────
  COMPANY_PROFILE_OVERVIEW: (symbol: string) => `${UAT_BASE}/3.0/company/profile/overview?symbol=${symbol}`,
  COMPANY_PROFILE_DETAIL:   (symbol: string) => `${UAT_BASE}/3.0/company/profile/detail?symbol=${symbol}`,

  // ── FINANCIAL STATEMENTS ─────────────────────────────────────────────────────
  COMPANY_FINANCIALS: (symbol: string, type: 'income' | 'balance' | 'cashflow', interval: 'annual' | 'quarterly') =>
    `${UAT_BASE}/3.0/company/financials/${type}/${interval}?symbol=${symbol}`,
  COMPANY_FUNDAMENTALS: (symbol: string) =>
    `${UAT_BASE}/3.0/company/fundamentals/key-metrics/annual?symbol=${symbol}`,
  COMPANY_SHAREHOLDERS: (symbol: string) =>
    `${UAT_BASE}/3.0/company/shareholders?symbol=${symbol}`,

  // ── NEWS & ANNOUNCEMENTS ─────────────────────────────────────────────────────
  COMPANY_NEWS:      (symbol: string, offset = 0, count = 50) =>
    `${UAT_BASE}/3.0/news/company?symbol=${symbol}&offset=${offset}&count=${count}`,
  NEWS_GENERAL:      (offset = 0, count = 50) =>
    `${UAT_BASE}/3.0/news/general?offset=${offset}&count=${count}`,
  ANNOUNCEMENTS_UAT: (symbol: string, offset = 0, count = 50) =>
    `${UAT_BASE}/3.0/announcements/symbol?symbol=${symbol}&offset=${offset}&count=${count}`,
  ANNOUNCEMENTS_ALL: (offset = 0, count = 50) =>
    `${UAT_BASE}/3.0/announcements?offset=${offset}&count=${count}`,

} as const
