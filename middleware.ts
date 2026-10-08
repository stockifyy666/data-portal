// =============================================================================
// FILE: middleware.ts
// PURPOSE: Runs on every request before pages or API routes.
//          1. Rate limiting via Upstash Redis — blocks abuse.
//             Auth routes: 10 req/min per IP. API routes: 120 req/min per user.
//          2. Auth guard — redirects unauthenticated users to /login.
//             Logged-in users are redirected away from /login and /register.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient }             from '@supabase/ssr'
import { Ratelimit }                      from '@upstash/ratelimit'
import { Redis }                          from '@upstash/redis/cloudflare'

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/api/auth']

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some(r => pathname.startsWith(r))
}

// ─── Upstash Redis Rate Limiters ──────────────────────────────────────────────
// Two separate limiters: strict for auth routes (IP-only), generous for API (per user)
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),   // 10 login attempts / min per IP
  prefix:  'rl:auth',
})

const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 m'),  // 120 calls / min per user or IP
  prefix:  'rl:api',
})

// Extract user ID from Supabase JWT cookie without a network call
function getUserIdFromCookie(request: NextRequest): string | null {
  try {
    const raw = request.cookies.get('sb-access-token')?.value
      ?? request.cookies.getAll().find(c => c.name.includes('auth-token'))?.value
    if (!raw) return null
    const payload = JSON.parse(atob(raw.split('.')[1]))
    return payload?.sub ?? null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit all /api/* routes
  if (pathname.startsWith('/api/')) {
    const ip         = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    const isAuthRoute = pathname.startsWith('/api/auth')
    const userId     = isAuthRoute ? null : getUserIdFromCookie(request)
    const identifier = userId ? `uid:${userId}` : `ip:${ip}`

    const { success } = await (isAuthRoute ? authLimiter : apiLimiter).limit(identifier)

    if (!success) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      })
    }
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession() — reads from cookie, no network call, safe for middleware
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && !isPublic(pathname)) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
