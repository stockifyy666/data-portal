import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Broker SSO not yet configured' }, { status: 501 })
}
