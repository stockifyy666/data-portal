// =============================================================================
// FILE: app/api/auth/broker-sso/route.ts
// PURPOSE: Handles the Capital Stake broker SSO flow described in the
//          Stockifyy Integration document by Bilal Tariq.
//
//          FLOW:
//          1. User clicks "Open in Terminal" on a stock page
//          2. Frontend calls POST /api/auth/broker-sso with { symbol, page }
//          3. This route looks up the user's encrypted brokerUserCode from DB
//          4. Calls Capital Stake SSO API with vendor credentials + brokerUserCode
//          5. Capital Stake returns a one-time token URL
//          6. We return that URL to the frontend — it opens in user's browser
//
//          SECURITY:
//          - brokerUserCode is NEVER sent to or from the browser
//          - Vendor username/password stay in env variables on the server
//          - Token URL is one-time use — we do not store it
//          - Full audit log entry written for every SSO call
// =============================================================================

import { NextRequest, NextResponse }   from 'next/server'
import { createClient }                from '@/lib/supabase/server'
import { csSSOAuthenticate }           from '@/lib/capitalstake/client'
import { z }                           from 'zod'

// Validate the request body using Zod — reject anything unexpected
const SSORequestSchema = z.object({
  symbol: z.string().min(2).max(6).toUpperCase().optional(),
  page:   z.string().max(50).optional().default('dashboard'),
})

export async function POST(request: NextRequest) {
  try {
    // Step 1: Verify user is logged in
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: Validate request body
    const body = await request.json()
    const parsed = SSORequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { symbol, page } = parsed.data

    // Step 3: Get the user's broker link from database
    // brokerUserCode is fetched server-side — NEVER goes to the browser
    const { data: brokerLink, error: dbError } = await supabase
      .from('user_broker_links')
      .select('broker_user_code, is_demo, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (dbError || !brokerLink) {
      return NextResponse.json(
        { error: 'No active broker account linked. Please connect your broker first.' },
        { status: 404 }
      )
    }

    // Step 4: Get user IP for the SSO request
    // Capital Stake requires the end user's IP address
    const userIP =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1'

    // Step 5: Call Capital Stake SSO API — all secrets stay on server
    const ssoResult = await csSSOAuthenticate({
      brokerUserCode: brokerLink.broker_user_code,
      ip:             userIP,
      isUserDemo:     brokerLink.is_demo,
      symbol,
      page,
    })

    // Step 6: Write audit log — record every SSO access for security review
    await supabase.from('audit_logs').insert({
      user_id:    user.id,
      action:     'BROKER_SSO',
      resource:   symbol ?? 'dashboard',
      metadata:   { page, success: ssoResult.response === 'success' },
      ip_address: userIP,
      user_agent: request.headers.get('user-agent') ?? undefined,
    })

    // Step 7: If SSO failed, return the error message
    if (ssoResult.response === 'failure') {
      return NextResponse.json(
        { error: ssoResult.message ?? 'SSO authentication failed' },
        { status: 400 }
      )
    }

    // Step 8: Return the one-time access URL to the frontend
    // Frontend will open this in the user's browser — do not store it
    return NextResponse.json(
      { link: ssoResult.link },
      { status: 200 }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /auth/broker-sso]', message)
    return NextResponse.json(
      { error: 'SSO request failed', details: message },
      { status: 500 }
    )
  }
}
