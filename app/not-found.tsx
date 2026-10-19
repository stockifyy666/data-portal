import Link  from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg-page)', padding: '24px 16px',
      textAlign: 'center',
    }}>
      <Image src="/images/logo.svg" alt="Stockifyy" width={130} height={34} style={{ objectFit: 'contain', marginBottom: 40 }} />

      <div style={{
        fontSize: 96, fontWeight: 800, lineHeight: 1,
        color: 'var(--brand)', fontVariantNumeric: 'tabular-nums',
        marginBottom: 16,
      }}>
        404
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6, margin: '0 0 36px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/dashboard" style={{
          padding: '10px 22px', background: 'var(--brand)', color: '#000',
          fontSize: 13, fontWeight: 600, textDecoration: 'none', borderRadius: 5,
        }}>
          Go to Dashboard
        </Link>
        <Link href="/login" style={{
          padding: '10px 22px', background: 'transparent',
          border: '1px solid var(--bg-border)', color: 'var(--text-secondary)',
          fontSize: 13, fontWeight: 500, textDecoration: 'none', borderRadius: 5,
        }}>
          Sign In
        </Link>
      </div>
    </div>
  )
}
