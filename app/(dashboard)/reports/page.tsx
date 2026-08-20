'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, FileText, TrendingUp, BarChart2, ChevronRight, Calendar, Clock } from 'lucide-react'
import { REPORTS, type Report, type ReportTeam } from './data'

/* ── Team config ─────────────────────────────────────────────────── */
const TEAMS: { id: ReportTeam | 'All'; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { id: 'All',         label: 'All Reports',       icon: FileText,  color: '#6b7280', desc: '' },
  { id: 'Research',    label: 'Research',           icon: Search,    color: '#3b82f6', desc: 'Macro, sector & industry analysis' },
  { id: 'Technical',   label: 'Technical Analysis', icon: TrendingUp,color: '#16a34a', desc: 'Charts, patterns & price action' },
  { id: 'Fundamental', label: 'Fundamental',        icon: BarChart2, color: '#a855f7', desc: 'Earnings, valuations & company models' },
]

function teamColor(team: ReportTeam) {
  return TEAMS.find(t => t.id === team)?.color ?? '#6b7280'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ── Report card ─────────────────────────────────────────────────── */
function ReportCard({ r }: { r: Report }) {
  const color = teamColor(r.team)
  return (
    <Link href={`/reports/${r.slug}`}
      className="group rounded-2xl p-5 flex flex-col gap-3 transition-all hover:scale-[1.01]"
      style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor:`${color}18`, color, border:`1px solid ${color}30` }}>
            {r.team}
          </span>
          {r.featured && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }}>
              Featured
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-[10px]" style={{ color:'var(--text-muted)' }}>
            <Calendar size={10} />
            {fmtDate(r.date)}
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color:'var(--text-muted)' }}>
            <Clock size={10} />
            {r.readTime}
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold leading-snug group-hover:text-amber-500 transition-colors"
        style={{ color:'var(--text-primary)' }}>
        {r.title}
      </h3>

      {/* Summary */}
      <p className="text-[11px] leading-relaxed flex-1" style={{ color:'var(--text-secondary)' }}>
        {r.summary}
      </p>

      {/* Tags + CTA */}
      <div className="flex items-center justify-between gap-2 mt-auto flex-wrap">
        <div className="flex flex-wrap gap-1">
          {r.tags.map(tag => (
            <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-muted)' }}>
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold shrink-0" style={{ color:'#FEA500' }}>
          Read Report <ChevronRight size={12} />
        </div>
      </div>
    </Link>
  )
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function ReportsPage() {
  const [activeTeam, setActiveTeam] = useState<ReportTeam | 'All'>('All')
  const [search,     setSearch]     = useState('')

  const filtered = REPORTS.filter(r => {
    const matchTeam = activeTeam === 'All' || r.team === activeTeam
    const q         = search.trim().toLowerCase()
    const matchSrch = !q || r.title.toLowerCase().includes(q) ||
                      r.summary.toLowerCase().includes(q) ||
                      r.tags.some(t => t.toLowerCase().includes(q))
    return matchTeam && matchSrch
  })

  const featured = filtered.filter(r => r.featured)
  const rest     = filtered.filter(r => !r.featured)

  return (
    <div className="space-y-8 animate-data">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color:'var(--text-primary)' }}>Stockifyy Reports</h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-secondary)' }}>
            In-depth research, technical and fundamental analysis by the Stockifyy team
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reports…"
            className="w-full pl-8 pr-4 py-2 rounded-xl border text-xs focus:outline-none"
            style={{ backgroundColor:'var(--bg-card)', borderColor:'var(--bg-border)', color:'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Team filter tabs */}
      <div className="flex flex-wrap gap-2">
        {TEAMS.map(t => {
          const Icon    = t.icon
          const isActive = activeTeam === t.id
          return (
            <button key={t.id} onClick={() => setActiveTeam(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={isActive
                ? { background:'linear-gradient(135deg,#FEA500,#986300)', color:'white' }
                : { backgroundColor:'var(--bg-card)', color:'var(--text-secondary)', border:'1px solid var(--bg-border)' }}>
              <Icon size={13} />
              {t.label}
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-hover)', color: isActive ? 'white' : 'var(--text-muted)' }}>
                {REPORTS.filter(r => t.id === 'All' || r.team === t.id).length}
              </span>
            </button>
          )
        })}
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <div className="rounded-2xl px-6 py-12 text-center" style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--bg-border)' }}>
          <p className="text-sm font-semibold" style={{ color:'var(--text-secondary)' }}>No reports found</p>
          <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>Try a different search or filter</p>
        </div>
      )}

      {/* Featured reports */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background:'linear-gradient(135deg,#FEA500,#986300)' }}>
              Featured
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor:'var(--bg-border)' }} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {featured.map(r => <ReportCard key={r.id} r={r} />)}
          </div>
        </section>
      )}

      {/* Rest of reports — grouped by team when showing all */}
      {rest.length > 0 && activeTeam === 'All' ? (
        (['Research','Technical','Fundamental'] as ReportTeam[]).map(team => {
          const teamReports = rest.filter(r => r.team === team)
          if (!teamReports.length) return null
          const cfg = TEAMS.find(t => t.id === team)!
          return (
            <section key={team}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: cfg.color }}>
                  <cfg.icon size={12} />
                  {team}
                </div>
                <span className="text-[10px]" style={{ color:'var(--text-muted)' }}>{cfg.desc}</span>
                <div className="flex-1 h-px" style={{ backgroundColor:'var(--bg-border)' }} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {teamReports.map(r => <ReportCard key={r.id} r={r} />)}
              </div>
            </section>
          )
        })
      ) : (
        rest.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rest.map(r => <ReportCard key={r.id} r={r} />)}
          </div>
        )
      )}
    </div>
  )
}
