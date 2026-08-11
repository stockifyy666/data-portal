// =============================================================================
// FILE: app/page.tsx
// PURPOSE: Root page — redirects straight to the market dashboard.
//          No login required. Data is publicly visible.
// =============================================================================

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
