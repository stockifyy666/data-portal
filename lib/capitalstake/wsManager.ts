// Server-side WebSocket manager for Capital Stake Live Feed.
// Maintains at most 1 persistent WS connection to Capital Stake (respecting
// the 3-connection server-side limit) and fans ticks out to all SSE clients.
// Works as a Node.js module singleton — one instance per process.

import WebSocket from 'ws'

export interface TickData {
  m:    string   // Market type: IDX | REG | FUT | ODL
  st:   string   // Session state: OPN | PCL | PRE | BRK | HLT | SUS
  s:    string   // Symbol
  t:    number   // Unix timestamp (seconds)
  o:    number   // Open
  h:    number   // High
  l:    number   // Low
  c:    number   // Close / current price
  v:    number   // Volume
  ldcp: number   // Last day close price
  ch:   number   // Change
  pch:  number   // Change percent
  bp?:  number   // Bid price
  ap?:  number   // Ask price
  val?: number   // Total traded value
  tr?:  number   // Total trades
  lt?:  { t: number; x: number; v: number } // Last trade
}

type TickCallback = (tick: TickData) => void

class CSWebSocketManager {
  private ws:           WebSocket | null = null
  private subscribers:  Map<string, Set<TickCallback>> = new Map() // symbol → callbacks
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connected:    boolean = false
  private connecting:   boolean = false

  private get wsUrl(): string {
    const base = (process.env.CAPITAL_STAKE_BASE_URL ?? 'https://stockifyy.capitalstake.com')
      .replace(/^https/, 'wss')
      .replace(/^http/, 'ws')
      .replace(/\/$/, '')
    return `${base}/2.0/market/feed/full`
  }

  private get token(): string {
    return process.env.CAPITAL_STAKE_BEARER_TOKEN ?? ''
  }

  private connect() {
    if (this.connecting || this.connected) return
    if (this.subscribers.size === 0) return // don't connect if no one is listening

    this.connecting = true
    console.log('[CS WS] Connecting to', this.wsUrl)

    const ws = new WebSocket(this.wsUrl, {
      headers: { Authorization: `Bearer ${this.token}` },
    })

    ws.on('open', () => {
      this.connected  = true
      this.connecting = false
      console.log('[CS WS] Connected')

      // Subscribe to all currently watched symbols
      const symbols = Array.from(this.subscribers.keys()).filter(s => s !== '*')
      if (symbols.length > 0) this.sendSubscribe(ws, symbols)
    })

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; data: TickData }
        if (msg.type !== 'tick' || !msg.data?.s) return
        this.dispatch(msg.data)
      } catch {}
    })

    ws.on('close', (code) => {
      this.connected  = false
      this.connecting = false
      this.ws = null
      console.log(`[CS WS] Disconnected (code ${code}) — reconnecting in 5s`)
      if (this.subscribers.size > 0) {
        this.reconnectTimer = setTimeout(() => this.connect(), 5_000)
      }
    })

    ws.on('error', (err) => {
      console.error('[CS WS] Error:', err.message)
      ws.terminate()
    })

    this.ws = ws
  }

  private sendSubscribe(ws: WebSocket, symbols: string[]) {
    // Capital Stake uses the standard subscribe message; adjust if their docs differ
    const msg = JSON.stringify({ type: 'subscribe', symbols })
    if (ws.readyState === WebSocket.OPEN) ws.send(msg)
  }

  private dispatch(tick: TickData) {
    // Notify exact-symbol subscribers
    const cbs = this.subscribers.get(tick.s)
    cbs?.forEach(cb => cb(tick))

    // Notify wildcard subscribers (e.g. quotes page watching everything)
    this.subscribers.get('*')?.forEach(cb => cb(tick))
  }

  subscribe(symbol: string, cb: TickCallback): () => void {
    const key = symbol.toUpperCase()
    if (!this.subscribers.has(key)) this.subscribers.set(key, new Set())
    this.subscribers.get(key)!.add(cb)

    // Start connection / subscribe new symbol
    if (!this.connected && !this.connecting) {
      this.connect()
    } else if (this.connected && this.ws && key !== '*') {
      this.sendSubscribe(this.ws, [key])
    }

    // Return unsubscribe function
    return () => {
      const set = this.subscribers.get(key)
      if (!set) return
      set.delete(cb)
      if (set.size === 0) {
        this.subscribers.delete(key)
        console.log(`[CS WS] No more subscribers for ${key}`)
      }
      // Disconnect if nobody is left
      if (this.subscribers.size === 0) {
        console.log('[CS WS] No subscribers — closing connection')
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
        this.ws?.close()
      }
    }
  }

  get isConnected() { return this.connected }
  get subscriberCount() { return this.subscribers.size }
}

// Module-level singleton — one WS connection per Node.js process
declare global { var __csWsManager: CSWebSocketManager | undefined }
export const csWsManager: CSWebSocketManager =
  globalThis.__csWsManager ?? (globalThis.__csWsManager = new CSWebSocketManager())
