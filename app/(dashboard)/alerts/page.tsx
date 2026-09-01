'use client'

import { useState, useEffect }      from 'react'
import Link                         from 'next/link'
import { Bell, BellOff, Trash2, Gift, Calendar, UserCheck, Megaphone, Activity } from 'lucide-react'
import { formatPrice }               from '@/lib/utils/format'
import { cachedFetch }               from '@/lib/utils/clientCache'

/* ── Types ───────────────────────────────────────────────────────── */
type Alert = {
  id:           string
  symbol:       string
  target_price: number
  direction:    'above' | 'below'
  is_active:    boolean
  triggered_at: string | null
  created_at:   string
}

type CorporateEvent = {
  symbol:    string
  name:      string
  sector:    string
  eventType: 'Dividend' | 'Bonus' | 'Rights'
  dps:       number
  price:     number
  changePct: number
}

type BoardMeeting = {
  symbol: string
  name:   string
  date:   string
  agenda: string
  status: string
}

type Announcement = {
  symbol: string
  name:   string
  date:   string
  title:  string
  type:   string
}

type EventFilter = 'all' | 'dividend' | 'board' | 'insider' | 'announcements'
type MainTab     = 'events' | 'price'

const FILTER_TABS: { value: EventFilter; label: string; Icon: React.ElementType }[] = [
  { value: 'all',           label: 'All Events',          Icon: Activity     },
  { value: 'dividend',      label: 'Dividend',            Icon: Gift         },
  { value: 'board',         label: 'Board Meetings',      Icon: Calendar     },
  { value: 'insider',       label: 'Insider Transaction', Icon: UserCheck    },
  { value: 'announcements', label: 'Announcements',       Icon: Megaphone    },
]

/* ── Skeleton row ────────────────────────────────────────────────── */
function SkeletonRows({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="h-5 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
          <div className="flex-1 h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
          <div className="h-4 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        </div>
      ))}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────── */
export default function AlertsPage() {
  const [tab,      setTab]      = useState<MainTab>('events')
  const [evFilter, setEvFilter] = useState<EventFilter>('all')

  const [events,        setEvents]        = useState<CorporateEvent[]>([])
  const [boardMeetings, setBoardMeetings] = useState<BoardMeeting[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [evLoad,        setEvLoad]        = useState(true)
  const [boardLoad,     setBoardLoad]     = useState(true)
  const [annLoad,       setAnnLoad]       = useState(true)
  const [evErr,         setEvErr]         = useState('')
  const [boardErr,      setBoardErr]      = useState('')
  const [annErr,        setAnnErr]        = useState('')

  const [alerts,  setAlerts]  = useState<Alert[]>([])
  const [alLoad,  setAlLoad]  = useState(true)
  const [symbol,  setSymbol]  = useState('')
  const [price,   setPrice]   = useState('')
  const [dir,     setDir]     = useState<'above' | 'below'>('above')
  const [adding,  setAdding]  = useState(false)

  useEffect(() => {
    cachedFetch<{ events: CorporateEvent[] }>('/api/market/events', 5 * 60 * 1000)
      .then(json => { if (json.events) setEvents(json.events); else setEvErr('No event data returned') })
      .catch(() => setEvErr('Failed to load events'))
      .finally(() => setEvLoad(false))

    cachedFetch<{ meetings: BoardMeeting[] }>('/api/market/board-meetings', 10 * 60 * 1000)
      .then(json => { if (json.meetings) setBoardMeetings(json.meetings); else setBoardErr('No board meeting data') })
      .catch(() => setBoardErr('Failed to load board meetings'))
      .finally(() => setBoardLoad(false))

    cachedFetch<{ announcements: Announcement[] }>('/api/market/announcements', 10 * 60 * 1000)
      .then(json => { if (json.announcements) setAnnouncements(json.announcements); else setAnnErr('No announcement data') })
      .catch(() => setAnnErr('Failed to load announcements'))
      .finally(() => setAnnLoad(false))

    fetch('/api/alerts')
      .then(r => r.json())
      .then(json => { if (json.data) setAlerts(json.data) })
      .catch(() => {})
      .finally(() => setAlLoad(false))
  }, [])

  async function addAlert(e: React.FormEvent) {
    e.preventDefault()
    if (!symbol || !price) return
    setAdding(true)
    await fetch('/api/alerts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ symbol: symbol.toUpperCase(), targetPrice: parseFloat(price), direction: dir }),
    })
    setSymbol(''); setPrice('')
    const res  = await fetch('/api/alerts')
    const json = await res.json()
    if (json.data) setAlerts(json.data)
    setAdding(false)
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const visibleEvents = evFilter === 'all'
    ? events
    : evFilter === 'dividend'
    ? events.filter(e => e.eventType === 'Dividend')
    : []

  const inputStyle = {
    backgroundColor: 'var(--bg-hover)',
    borderColor:     'var(--bg-border)',
    color:           'var(--text-primary)',
  }

  /* ── Event card content ──────────────────────────────────────────── */
  function EventCardContent() {
    /* Board Meetings */
    if (evFilter === 'board') {
      if (boardLoad) return <SkeletonRows />
      if (boardErr)  return <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>{boardErr}</p>
      if (boardMeetings.length === 0) return (
        <div className="py-14 text-center">
          <Calendar size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No board meetings found.</p>
        </div>
      )
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {['Symbol', 'Company', 'Date', 'Agenda', 'Status'].map(col => (
                  <th key={col} className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boardMeetings.map((m, i) => (
                <tr key={`${m.symbol}-${i}`} style={{ borderBottom: '1px solid var(--bg-border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                  <td className="py-2.5 px-2"><Link href={`/stocks/${m.symbol}`} className="font-bold hover:underline" style={{ color: '#FEA500' }}>{m.symbol}</Link></td>
                  <td className="py-2.5 px-2 max-w-[180px]"><Link href={`/stocks/${m.symbol}`} className="truncate font-medium hover:underline block" style={{ color: 'var(--text-primary)' }}>{m.name}</Link></td>
                  <td className="py-2.5 px-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{m.date || '—'}</td>
                  <td className="py-2.5 px-2 max-w-[220px]"><p className="truncate" style={{ color: 'var(--text-secondary)' }}>{m.agenda || '—'}</p></td>
                  <td className="py-2.5 px-2 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{m.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    /* Announcements */
    if (evFilter === 'announcements') {
      if (annLoad) return <SkeletonRows />
      if (annErr)  return <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>{annErr}</p>
      if (announcements.length === 0) return (
        <div className="py-14 text-center">
          <Megaphone size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No announcements found.</p>
        </div>
      )
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {['Symbol', 'Company', 'Date', 'Title', 'Type'].map(col => (
                  <th key={col} className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {announcements.map((a, i) => (
                <tr key={`${a.symbol}-${i}`} style={{ borderBottom: '1px solid var(--bg-border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                  <td className="py-2.5 px-2"><Link href={`/stocks/${a.symbol}`} className="font-bold hover:underline" style={{ color: '#FEA500' }}>{a.symbol}</Link></td>
                  <td className="py-2.5 px-2 max-w-[160px]"><Link href={`/stocks/${a.symbol}`} className="truncate font-medium hover:underline block" style={{ color: 'var(--text-primary)' }}>{a.name}</Link></td>
                  <td className="py-2.5 px-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{a.date || '—'}</td>
                  <td className="py-2.5 px-2 max-w-[260px]"><p className="truncate" style={{ color: 'var(--text-secondary)' }}>{a.title || '—'}</p></td>
                  <td className="py-2.5 px-2">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 whitespace-nowrap">
                      {a.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    /* Insider */
    if (evFilter === 'insider') {
      return (
        <div className="py-14 text-center">
          <UserCheck size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Insider Transactions — Coming Soon</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PSX does not publicly expose insider trading data via the API.</p>
        </div>
      )
    }

    /* Dividends / All */
    if (evLoad) return <SkeletonRows n={8} />
    if (evErr)  return <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>{evErr}</p>
    if (visibleEvents.length === 0) return (
      <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>No events found.</p>
    )
    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                {['Symbol', 'Company', 'Sector', 'Type', 'Annual DPS', 'Div Yield'].map(col => (
                  <th key={col}
                      className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}
                      title={
                        col === 'Annual DPS' ? 'Total dividends per share declared in the current financial year (sum of all interim + final dividends). Source: PSX data feed.' :
                        col === 'Div Yield'  ? 'Dividend Yield = Annual DPS ÷ Current Price × 100' :
                        undefined
                      }>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((ev, i) => (
                <tr key={`${ev.symbol}-${i}`} style={{ borderBottom: '1px solid var(--bg-border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                  <td className="py-2.5 px-2">
                    <Link href={`/stocks/${ev.symbol}`} className="font-bold hover:underline" style={{ color: '#FEA500' }}>
                      {ev.symbol}
                    </Link>
                  </td>
                  <td className="py-2.5 px-2 max-w-[180px]">
                    <Link href={`/stocks/${ev.symbol}`} className="truncate text-xs font-medium hover:underline block" style={{ color: 'var(--text-primary)' }}>{ev.name}</Link>
                  </td>
                  <td className="py-2.5 px-2 max-w-[120px]" style={{ color: 'var(--text-muted)' }}>
                    <p className="truncate text-xs">{ev.sector || '—'}</p>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap
                      ${ev.eventType === 'Dividend'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                        : ev.eventType === 'Bonus'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
                        : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800'
                      }`}>
                      <Gift size={9} />
                      {ev.eventType}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 font-number font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {ev.dps > 0 ? `Rs ${ev.dps.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2.5 px-2 font-number font-semibold"
                      style={{ color: ev.dps > 0 && ev.price > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                    {ev.dps > 0 && ev.price > 0 ? `${((ev.dps / ev.price) * 100).toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] pt-3 mt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--bg-border)' }}>
          Showing companies with active ex-dividend / ex-bonus / ex-rights status. Refreshes every 5 min. &nbsp;·&nbsp; Annual DPS = total dividends per share declared in the current financial year.
        </p>
      </>
    )
  }

  return (
    <div className="space-y-5 animate-data">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Alerts &amp; Announcements
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Corporate events and your personal price alerts
        </p>
      </div>

      {/* Main tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg-hover)' }}>
        {([
          { value: 'events', label: 'Corporate Events' },
          { value: 'price',  label: 'Price Alerts'     },
        ] as { value: MainTab; label: string }[]).map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
            style={tab === t.value
              ? { background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }
              : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CORPORATE EVENTS ──────────────────────────────────────────── */}
      {tab === 'events' && (
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="overflow-x-auto hide-scrollbar -mx-1">
            <div className="flex gap-2 px-1 w-max">
              {FILTER_TABS.map(f => {
                const Icon = f.Icon
                return (
                  <button
                    key={f.value}
                    onClick={() => setEvFilter(f.value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap"
                    style={evFilter === f.value
                      ? { background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white', borderColor: 'transparent' }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--bg-border)' }
                    }
                  >
                    <Icon size={11} />
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card">
            <EventCardContent />
          </div>
        </div>
      )}

      {/* ── PRICE ALERTS ─────────────────────────────────────────────── */}
      {tab === 'price' && (
        <div className="space-y-4 max-w-2xl">
          <form onSubmit={addAlert} className="card space-y-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              New Price Alert
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol (e.g. ENGRO)"
                maxLength={8}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition-colors"
                style={inputStyle}
              />
              <select
                value={dir}
                onChange={e => setDir(e.target.value as 'above' | 'below')}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition-colors"
                style={inputStyle}
              >
                <option value="above">Goes above</option>
                <option value="below">Falls below</option>
              </select>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Target price"
                step="0.01"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition-colors"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={adding || !symbol || !price}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #FEA500, #986300)', color: 'white' }}
            >
              {adding ? 'Adding…' : 'Add Alert'}
            </button>
          </form>

          {alLoad ? (
            <div className="card space-y-3">
              {[1,2,3].map(n => (
                <div key={n} className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="card text-center py-12">
              <Bell size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No alerts set</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Use the form above to create your first price alert.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`card flex items-center justify-between gap-4 ${alert.triggered_at ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {alert.triggered_at
                      ? <BellOff size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                      : <Bell    size={14} style={{ color: '#FEA500' }}           className="shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {alert.symbol}{' '}
                        <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>
                          {alert.direction === 'above' ? '↑ above' : '↓ below'}{' '}
                          {formatPrice(alert.target_price)}
                        </span>
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {alert.triggered_at
                          ? `Triggered: ${new Date(alert.triggered_at).toLocaleDateString('en-PK')}`
                          : 'Active — checking every 5 min'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-1 shrink-0 transition-colors hover:text-red-500"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
