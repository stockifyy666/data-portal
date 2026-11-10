// =============================================================================
// FILE: next.config.js
// PURPOSE: Next.js configuration file. Controls how the app is built and run.
//          We lock down which external domains images can come from, and we
//          set security headers on every response to protect users.
// =============================================================================

/** @type {import('next').NextConfig} */
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
      {
        protocol: 'https',
        hostname: 'd1ehrfgrja6bld.cloudfront.net',
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
          { key: 'Strict-Transport-Security',   value: 'max-age=31536000; includeSubDomains' },
          { key: 'Referrer-Policy',             value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',          value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "img-src 'self' data: blob: https://d1ehrfgrja6bld.cloudfront.net https://*.supabase.co https://csapis.com",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
