// Small Shariah-compliance indicator shown next to KMI stocks system-wide.
// A stock is KMI (Shariah-compliant) if its indexKeys includes 'KMI30' or 'KMIALLSHR'.

export function isKMI(indexKeys?: string[]): boolean {
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
