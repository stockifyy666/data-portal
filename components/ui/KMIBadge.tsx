// A stock is KMI/Shariah-compliant if:
// 1. Its indexKeys includes KMI30 or KMIALLSHR, OR
// 2. It's a known Shariah ETF (ETF instruments aren't listed in KMI indices by PSX data
//    but are Shariah-screened by design — e.g. MZNPETF, MIIETF, MZNETF).

const SHARIAH_ETF_PATTERN = /^(MZNP?ETF|MIIETF|MZNETF|[A-Z]+SHETF|[A-Z]+ISLETF)/i

export function isKMI(indexKeys?: string[], symbol?: string): boolean {
  if (symbol && SHARIAH_ETF_PATTERN.test(symbol)) return true
  if (!indexKeys?.length) return false
  return indexKeys.includes('KMI30') || indexKeys.includes('KMIALLSHR')
}

export default function KMIBadge({ className = '' }: { className?: string }) {
  return (
    <span
      title="Shariah Compliant (KMI)"
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ fontSize: '11px', lineHeight: 1 }}
      aria-label="Shariah Compliant"
    >
      🕌
    </span>
  )
}
