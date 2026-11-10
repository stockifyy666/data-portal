import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,       // 20% of transactions for performance monitoring
  replaysOnErrorSampleRate: 1, // 100% session replay on errors
  replaysSessionSampleRate: 0, // don't record normal sessions (saves quota)
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
})
