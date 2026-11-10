// SSE endpoint: GET /api/market/stream?symbol=HBL
// Streams real-time Capital Stake tick data to the browser via Server-Sent Events.
// The server holds 1 WebSocket to Capital Stake and fans ticks to all SSE clients,
// so we never exceed the 3-connection server-side limit.

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csWsManager, type TickData } from '@/lib/capitalstake/wsManager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // needs ws package — not compatible with Edge

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  const symbol = (request.nextUrl.searchParams.get('symbol') ?? '').toUpperCase()
  if (!symbol || !/^[A-Z0-9]{2,10}$/.test(symbol)) {
    return new Response(JSON.stringify({ error: 'Invalid symbol' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  // SSE stream
  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat so the client knows we're connected
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      send({ type: 'connected', symbol, ts: Date.now() })

      // Subscribe to ticks for this symbol
      unsubscribe = csWsManager.subscribe(symbol, (tick: TickData) => {
        send({ type: 'tick', data: tick })
      })

      // Keep-alive ping every 25s (proxy timeout protection)
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(ping)
        }
      }, 25_000)

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(ping)
        unsubscribe?.()
        try { controller.close() } catch {}
      })
    },
    cancel() {
      unsubscribe?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering
    },
  })
}
