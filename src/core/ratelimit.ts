const WINDOW_MS = 60_000
const FREE_LIMIT_PER_WINDOW = 30

interface Bucket {
  readonly windowStart: number
  readonly count: number
}

// Isolate-local soft rate limit. Resets whenever the isolate is recycled, so it
// is best-effort only — the authoritative limit belongs in Cloudflare WAF rules.
const buckets = new Map<string, Bucket>()

export function checkRateLimit(key: string, now: number = Date.now()): boolean {
  const bucket = buckets.get(key)
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 })
    return true
  }
  if (bucket.count >= FREE_LIMIT_PER_WINDOW) {
    return false
  }
  buckets.set(key, { windowStart: bucket.windowStart, count: bucket.count + 1 })
  return true
}
