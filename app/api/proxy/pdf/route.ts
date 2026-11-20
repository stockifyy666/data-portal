// Announcement files, proxied from PSX's public document server.
//   GET /api/proxy/pdf?file=289410-1.pdf               → view PDF in browser (inline)
//   GET /api/proxy/pdf?file=289410-1.pdf&download=1    → download (attachment)
//   GET /api/proxy/pdf?file=288707-1.gif               → announcement image
// Files come from the `pdf` / `docs` / `images` fields of Capital Stake announcements.
// PSX serves them publicly but rejects non-browser clients, so we fetch with a
// browser User-Agent. No Capital Stake API call is made.

import { NextRequest, NextResponse } from 'next/server'

// Live / per-user data: always run on request, never prerender at build time
export const dynamic = 'force-dynamic'

const PSX = 'https://dps.psx.com.pk/download/'
const FILE_RE = /^\d{3,10}(-\d{1,3})?\.(pdf|gif|png|jpe?g|webp)$/i   // e.g. 288433.pdf, 288707-1.gif
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

const TYPES: Record<string, string> = {
  pdf: 'application/pdf', gif: 'image/gif', png: 'image/png',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
}

// Check the real file signature so we never relay an HTML error page
function looksLike(ext: string, b: Uint8Array): boolean {
  if (ext === 'pdf')  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46        // %PDF
  if (ext === 'gif')  return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46                          // GIF
  if (ext === 'png')  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47        // .PNG
  if (ext === 'jpg' || ext === 'jpeg') return b[0] === 0xff && b[1] === 0xd8                           // JPEG
  if (ext === 'webp') return b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50      // WEBP
  return false
}

export async function GET(req: NextRequest) {
  const file     = (req.nextUrl.searchParams.get('file') ?? '').trim()
  const download = req.nextUrl.searchParams.get('download') === '1'

  if (!FILE_RE.test(file)) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }
  const ext = file.split('.').pop()!.toLowerCase()
  const url = PSX + (ext === 'pdf' ? 'document/' : 'image/') + file

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*', Referer: 'https://dps.psx.com.pk/announcements' },
      next:    { revalidate: 86_400 },
    })
    const bytes = new Uint8Array(await res.arrayBuffer())

    if (!res.ok || !looksLike(ext, bytes)) {
      console.error(`[proxy/pdf] ${res.status} not a ${ext}: ${file}`)
      return NextResponse.json({ error: 'File not available' }, { status: 404 })
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type':        TYPES[ext],
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${file}"`,
        'Cache-Control':       'private, max-age=86400',
      },
    })
  } catch (err) {
    console.error('[proxy/pdf] fetch failed:', file, err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'File not available' }, { status: 502 })
  }
}
