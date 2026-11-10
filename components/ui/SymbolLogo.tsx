'use client'

import { useState } from 'react'
import logoMap from '@/public/images/stock_logos/symbol_to_logo.json'

const LOGO_MAP = logoMap as Record<string, string>

const HUES = [210, 160, 280, 30, 320, 180, 60, 240]
function symColor(s: string) {
  const h = s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return `hsl(${HUES[h % HUES.length]},55%,52%)`
}

interface Props {
  symbol: string
  size?: number
  className?: string
  style?: React.CSSProperties
  isSelf?: boolean
}

export default function SymbolLogo({ symbol, size = 28, className = '', style, isSelf }: Props) {
  const logoUrl = LOGO_MAP[symbol] ?? null
  const [failed, setFailed] = useState(false)
  const color = symColor(symbol)
  const initials = symbol.slice(0, 2).toUpperCase()
  const fontSize = Math.max(7, Math.round(size * 0.35))

  const base: React.CSSProperties = {
    width: size, height: size,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: isSelf ? '2px solid #FEA500' : `1.5px solid ${color}`,
    boxShadow: isSelf ? '0 0 0 3px rgba(254,165,0,0.2)' : 'none',
    background: isSelf ? 'white' : 'var(--bg-card)',
    ...style,
  }

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={symbol}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={className}
        style={{ ...base, objectFit: 'contain', padding: 2 }}
      />
    )
  }

  return (
    <div className={className} style={base}>
      <span style={{ fontSize, fontWeight: 700, color: isSelf ? '#FEA500' : color, lineHeight: 1 }}>
        {initials}
      </span>
    </div>
  )
}
