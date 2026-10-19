import React from 'react'

const pulse = `
  @keyframes sk-pulse {
    0%, 100% { opacity: 1 }
    50%       { opacity: .4 }
  }
`

function Bone({ w = '100%', h = 16, radius = 4, style }: {
  w?: string | number
  h?: string | number
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <>
      <style>{pulse}</style>
      <div style={{
        width: w, height: h, borderRadius: radius,
        background: 'var(--bg-hover)',
        animation: 'sk-pulse 1.6s ease-in-out infinite',
        flexShrink: 0,
        ...style,
      }} />
    </>
  )
}

/* ── Row of stat cards ── */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Bone w={90} h={13} />
            <Bone w={36} h={36} radius={5} />
          </div>
          <Bone w={60} h={32} />
        </div>
      ))}
    </div>
  )
}

/* ── Generic table skeleton ── */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5, overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bg-border)', display: 'flex', gap: 12 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} w={`${100 / cols}%`} h={11} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ padding: '13px 20px', borderBottom: r < rows - 1 ? '1px solid var(--bg-border)' : 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Bone key={c} w={`${100 / cols}%`} h={13} style={{ animationDelay: `${(r * cols + c) * 40}ms` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ── Chart area skeleton ── */
export function ChartSkeleton({ height = 420 }: { height?: number }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Bone w={160} h={16} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[50, 50, 60].map((w, i) => <Bone key={i} w={w} h={28} radius={5} />)}
        </div>
      </div>
      <Bone w="100%" h={height} radius={5} />
    </div>
  )
}

/* ── Card grid skeleton (news, reports etc) ── */
export function CardGridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 5, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Bone w="40%" h={11} />
          <Bone w="100%" h={14} />
          <Bone w="75%" h={14} />
          <Bone w="50%" h={11} style={{ marginTop: 4 }} />
        </div>
      ))}
    </div>
  )
}

/* ── Page header skeleton ── */
export function PageHeaderSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
      <Bone w={200} h={22} />
      <Bone w={320} h={13} />
    </div>
  )
}

/* ── Full page generic skeleton ── */
export function PageSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeaderSkeleton />
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  )
}
