export default function StockDetailLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`
        @keyframes sk-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .sk { background:var(--bg-hover); animation:sk-pulse 1.6s ease-in-out infinite; border-radius:4px; flex-shrink:0; }
      `}</style>

      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <div className="sk" style={{ width: 90, height: 13 }} />
      </div>

      {/* Title row: symbol + watching button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="sk" style={{ width: 160, height: 32 }} />
          <div className="sk" style={{ width: 200, height: 13 }} />
        </div>
        <div className="sk" style={{ width: 110, height: 36, borderRadius: 8 }} />
      </div>

      {/* Search bar */}
      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <div className="sk" style={{ width: '100%', height: 40, borderRadius: 8 }} />
      </div>

      {/* Tab nav */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        borderBottom: '1px solid var(--bg-border)', paddingBottom: 0,
      }}>
        {[80, 60, 110, 130, 90, 120, 115, 55, 115, 130].map((w, i) => (
          <div key={i} className="sk" style={{
            width: w, height: 34, borderRadius: '6px 6px 0 0',
            animationDelay: `${i * 60}ms`,
            opacity: i === 0 ? 1 : 0.6,
          }} />
        ))}
      </div>

      {/* Content card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-border)',
        borderRadius: 8,
        padding: 24,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="sk" style={{ width: '60%', height: 11, animationDelay: `${i * 80}ms` }} />
              <div className="sk" style={{ width: '80%', height: 22, animationDelay: `${i * 80 + 40}ms` }} />
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--bg-border)' }} />

        {/* Body lines */}
        {[100, 85, 92, 70, 88].map((w, i) => (
          <div key={i} className="sk" style={{ width: `${w}%`, height: 13, animationDelay: `${i * 70}ms` }} />
        ))}
      </div>
    </div>
  )
}
