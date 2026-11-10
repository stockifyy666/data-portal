import { NextRequest, NextResponse } from 'next/server'

const UAT_BASE  = (process.env.CAPITAL_STAKE_CHART_BASE_URL ?? 'https://uat.csapis.com').replace(/\/$/, '')
const MAIN_BASE = (process.env.CAPITAL_STAKE_BASE_URL ?? 'https://stockifyy.capitalstake.com').replace(/\/$/, '')
const UAT_TOKEN  = process.env.CAPITAL_STAKE_CHART_BEARER_TOKEN ?? process.env.CAPITAL_STAKE_BEARER_TOKEN ?? ''
const MAIN_TOKEN = process.env.CAPITAL_STAKE_BEARER_TOKEN ?? ''

function isPdf(bytes: Uint8Array) {
  // %PDF magic bytes
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}

async function tryUrl(url: string, token: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/pdf,application/octet-stream,*/*',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (!isPdf(bytes)) return null
    return bytes
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const id       = req.nextUrl.searchParams.get('id') ?? ''
  const filename = req.nextUrl.searchParams.get('filename') ?? ''

  if (!id && !filename) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  // Try every plausible URL pattern — first real PDF wins
  const candidates: [string, string][] = [
    // UAT base with auth
    [`${UAT_BASE}/3.0/announcements/pdf/${filename}`,    UAT_TOKEN],
    [`${UAT_BASE}/3.0/announcements/files/${filename}`,  UAT_TOKEN],
    [`${UAT_BASE}/3.0/announcements/${id}/document`,     UAT_TOKEN],
    [`${UAT_BASE}/3.0/announcements/${id}/pdf`,          UAT_TOKEN],
    [`${UAT_BASE}/3.0/files/${filename}`,                UAT_TOKEN],
    [`${UAT_BASE}/files/${filename}`,                    UAT_TOKEN],
    // UAT base without auth (public CDN)
    [`${UAT_BASE}/3.0/announcements/pdf/${filename}`,    ''],
    [`${UAT_BASE}/files/${filename}`,                    ''],
    // Main base with auth
    [`${MAIN_BASE}/announcements/pdf/${filename}`,       MAIN_TOKEN],
    [`${MAIN_BASE}/api/v3/announcements/pdf/${filename}`,MAIN_TOKEN],
    [`${MAIN_BASE}/files/${filename}`,                   MAIN_TOKEN],
    // PSX public CDN (no auth)
    [`https://www.psx.com.pk/psx/resources-and-tools/listing/announcements/${filename}`, ''],
  ]

  for (const [url, token] of candidates) {
    if (!url.includes('undefined') && !url.endsWith('/')) {
      try {
        const res = await fetch(url, {
          headers: {
            Accept: 'application/pdf,application/octet-stream,*/*',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        const bytes = new Uint8Array(await res.arrayBuffer())
        const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
        console.log(`[proxy/pdf] ${res.status} ct=${res.headers.get('content-type')} isPdf=${isPdf} url=${url}`)
        if (res.ok && isPdf) {
          const name = filename || `${id}.pdf`
          return new NextResponse(bytes, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${name}"`,
              'Cache-Control': 'private, max-age=3600',
            },
          })
        }
      } catch (e) {
        console.log(`[proxy/pdf] error url=${url}`, e)
      }
    }
  }

  console.error('[proxy/pdf] ✗ all failed for id=%s filename=%s', id, filename)
  return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
}
