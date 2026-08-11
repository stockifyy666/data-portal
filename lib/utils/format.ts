// =============================================================================
// FILE: lib/utils/format.ts
// PURPOSE: Helper functions for formatting numbers, currencies, and percentages
//          in the way Pakistani financial markets display them.
//          Used across all market data components — quotes, tables, charts.
// =============================================================================

// =============================================================================
// formatPKR — Format a number as Pakistani Rupees
// Example: formatPKR(1234567.89) → "PKR 12,34,567.89"
// Uses Pakistani number grouping (lakh/crore system)
// =============================================================================
export function formatPKR(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '—'

  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// =============================================================================
// formatPrice — Format a stock price (no currency symbol, just clean number)
// Example: formatPrice(408.75) → "408.75"
// =============================================================================
export function formatPrice(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return value.toFixed(decimals)
}

// =============================================================================
// formatChange — Format price change with + or - sign and color hint
// Example: formatChange(1.25) → "+1.25"
//          formatChange(-0.50) → "-0.50"
// =============================================================================
export function formatChange(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}`
}

// =============================================================================
// formatPercent — Format a decimal ratio as percentage
// Example: formatPercent(0.00189) → "+0.19%"
//          formatPercent(-0.025) → "-2.50%"
// Note: Capital Stake sends pch (percent change) as a decimal like 0.00189
// =============================================================================
export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const percent = value * 100
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(decimals)}%`
}

// =============================================================================
// formatVolume — Format trading volume in readable form
// Example: formatVolume(1234567) → "1.23M"
//          formatVolume(45000) → "45.0K"
// =============================================================================
export function formatVolume(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—'

  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000)         return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

// =============================================================================
// formatMarketCap — Format large values as crore (Pakistani system)
// Example: formatMarketCap(50000000000) → "500.00 Cr"
// =============================================================================
export function formatMarketCap(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—'

  const crore  = 10_000_000
  const lakh   = 100_000
  const billion = 1_000_000_000

  if (value >= billion)  return `${(value / crore).toFixed(0)} Cr`
  if (value >= crore)    return `${(value / crore).toFixed(2)} Cr`
  if (value >= lakh)     return `${(value / lakh).toFixed(2)} Lakh`
  return formatPKR(value, 0)
}

// =============================================================================
// getChangeColor — Return a Tailwind CSS color class based on positive/negative
// Use this to color price changes — green for up, red for down, gray for flat
// =============================================================================
export function getChangeColor(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'text-gray-400'
  if (value > 0)  return 'text-green-500'
  if (value < 0)  return 'text-red-500'
  return 'text-gray-400'
}
