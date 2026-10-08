'use client'

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-muted)' }}>
      {children}
    </h3>
  )
}

export function LoadingRows({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-3 w-40 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
          <div className="h-3 flex-1 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        </div>
      ))}
    </div>
  )
}
