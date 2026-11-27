// Small presentational helpers shared by the legal pages.
import type { ReactNode } from 'react'

export function LegalHeader({ title, intro, effective }: { title: string; intro: string; effective: string }) {
  return (
    <div className="mb-10">
      <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: '#c27c00' }}>Legal</p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: '#475569' }}>{intro}</p>
      <p className="mt-3 text-sm font-medium" style={{ color: '#64748b' }}>Effective date: {effective}</p>
    </div>
  )
}

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold">{n}. {title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed" style={{ color: '#334155' }}>{children}</div>
    </section>
  )
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-6 space-y-1.5">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}
