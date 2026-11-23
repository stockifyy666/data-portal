// Feature switches for user-facing pages.
// Settings is hidden for now: no sidebar link, and /settings redirects to /dashboard
// (see middleware.ts). Flip to true to bring it back. Admin settings are unaffected.
export const SHOW_USER_SETTINGS = false

// Facebook sign-in button on login/register. Hidden until the Facebook app is
// configured in Supabase (Authentication > Providers). Flip to true to show it.
export const SHOW_FACEBOOK_LOGIN = false
