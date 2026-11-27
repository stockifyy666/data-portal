// Right shares on PSX use symbols ending in R / R1 / R2 (FFLR1, FFBLR …).
// A few real listings also end in R and must NOT be treated as rights.
const NOT_RIGHTS = new Set(['DCR', 'GRR'])   // Dolmen City REIT, Globe Residency REIT

/** True when the symbol looks like a right share (ends in R or R<digits>), except known REITs. */
export function isRightSymbol(symbol: string): boolean {
  const s = (symbol || '').toUpperCase()
  return /R\d*$/.test(s) && !NOT_RIGHTS.has(s)
}
