// =============================================================================
// FILE: next.config.js
// PURPOSE: Next.js configuration file. Controls how the app is built and run.
//          We lock down which external domains images can come from, and we
//          set security headers on every response to protect users.
// =============================================================================

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development'

const nextConfig = {



  // Allow images to be loaded from Capital Stake CDN and Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'csapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Security headers applied to every single page response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'X-Frame-Options',             value: 'DENY' },
          { key: 'X-XSS-Protection',            value: '1; mode=block' },
          { key: 'Strict-Transport-Security',   value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy',             value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',          value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:" : "script-src 'self' 'unsafe-inline' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://csapis.com https://*.supabase.co https://i.brecorder.com https://*.brecorder.com https://*.dawn.com https://arynews.tv https://*.arynews.tv https://*.geo.tv https://*.tribune.com.pk",
              "connect-src 'self' https://*.supabase.co https://csapis.com wss://*.supabase.co https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
