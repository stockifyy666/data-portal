// Reads the Capital Stake session cookie from Redis.
// The session is written by session-manager.js (runs separately).
// No Playwright or browser needed in the Next.js app.

import { redis } from '@/lib/redis/client'

const REDIS_KEY = 'cs:session'

export interface CSSession {
  cookieHeader: string
  xsrfToken:   string
  bearerToken?: string
  refreshedAt: string
}

export async function getSession(): Promise<CSSession> {
  const raw = await redis.get<string>(REDIS_KEY)

  if (!raw) {
    throw new Error(
      'Capital Stake session not found in Redis. ' +
      'Run: node "C:\\Stockifyy\\Research and develop\\session-manager.js"'
    )
  }

  const session: CSSession = typeof raw === 'string' ? JSON.parse(raw) : raw
  return session
}
