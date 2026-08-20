import { notFound } from 'next/navigation'
import Link         from 'next/link'
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react'
import { REPORTS }  from '../data'

type Params = { slug: string }

export async function generateStaticParams() {
  return REPORTS.map(r => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const report   = REPORTS.find(r => r.slug === slug)
  if (!report) return {}
  return { title: `${report.title} — Stockifyy Reports` }
}

const TEAM_COLORS: Record<string, string> = {
  Research:    '#3b82f6',
  Technical:   '#16a34a',
  Fundamental: '#a855f7',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ReportDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const report   = REPORTS.find(r => r.slug === slug)
  if (!report) notFound()

  const color    = TEAM_COLORS[report.team] ?? '#6b7280'
  const idx      = REPORTS.findIndex(r => r.slug === slug)
  const prev     = REPORTS[idx - 1] ?? null
  const next     = REPORTS[idx + 1] ?? null

  return (
    <div className="space-y-8 animate-data">

      {/* Back */}
      <Link href="/reports"
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color:'var(--text-secondary)' }}>
        <ArrowLeft size={14} />
        All Reports
      </Link>

      {/* Header card */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor:`${color}18`, color, border:`1px solid ${color}30` }}>
            {report.team}
          </span>
          {report.featured && (
            <span className="text-[9px] font-bold px-2.5 py-1 rounded-full"
              style={{ background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }}>
              Featured
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-black leading-snug" style={{ color:'var(--text-primary)' }}>
          {report.title}
        </h1>

        {/* Summary */}
        <p className="text-sm leading-relaxed" style={{ color:'var(--text-secondary)' }}>
          {report.summary}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-4 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color:'var(--text-muted)' }}>
            <Calendar size={12} />
            {fmtDate(report.date)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color:'var(--text-muted)' }}>
            <Clock size={12} />
            {report.readTime} read
          </div>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color:'var(--text-muted)' }}>
            <Tag size={12} />
            {report.tags.join(' · ')}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="rounded-2xl p-8 prose-report"
        style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>
        <div className="columns-1 lg:columns-2 gap-8"
          dangerouslySetInnerHTML={{ __html: report.body }} />
      </div>

      {/* Prev / Next navigation */}
      <div className="grid grid-cols-2 gap-4">
        {prev ? (
          <Link href={`/reports/${prev.slug}`}
            className="rounded-xl p-4 flex flex-col gap-1 group transition-all hover:scale-[1.01]"
            style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>
            <span className="text-[10px]" style={{ color:'var(--text-muted)' }}>← Previous</span>
            <span className="text-xs font-semibold leading-snug group-hover:text-amber-500 transition-colors"
              style={{ color:'var(--text-primary)' }}>
              {prev.title}
            </span>
          </Link>
        ) : <div />}

        {next ? (
          <Link href={`/reports/${next.slug}`}
            className="rounded-xl p-4 flex flex-col gap-1 text-right group transition-all hover:scale-[1.01]"
            style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>
            <span className="text-[10px]" style={{ color:'var(--text-muted)' }}>Next →</span>
            <span className="text-xs font-semibold leading-snug group-hover:text-amber-500 transition-colors"
              style={{ color:'var(--text-primary)' }}>
              {next.title}
            </span>
          </Link>
        ) : <div />}
      </div>
    </div>
  )
}
