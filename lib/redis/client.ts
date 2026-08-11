// =============================================================================
// FILE: lib/redis/client.ts
// PURPOSE: Creates and exports the Upstash Redis client.
//          Redis is our cache layer — it stores Capital Stake API responses
//          so we do not repeat the same API call multiple times within the
//          cache window. This protects us from hitting the 20 req/hour limit.
//          Upstash Redis works over HTTP (REST), so it works in both Node.js
//          and Edge runtime environments (Vercel Edge Functions).
// =============================================================================

import { Redis } from '@upstash/redis'

// Redis client — reads credentials from environment variables automatically
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be in .env.local
export const redis = Redis.fromEnv()
