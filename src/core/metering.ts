export type FunnelStage = 'discovery' | 'connect' | 'call'

export interface FunnelEvent {
  readonly tool: string
  readonly stage: FunnelStage
  readonly clientIp: string
  readonly userAgent: string
}

export interface MeteringEnv {
  readonly DB?: D1Database
}

/**
 * Funnel tracking: discovery → connect → call, persisted to D1.
 * A "paid" stage is added together with the billing layer.
 * Callers should pass the returned promise to executionCtx.waitUntil().
 */
export async function recordEvent(env: MeteringEnv, event: FunnelEvent): Promise<void> {
  if (!env.DB) {
    console.log(JSON.stringify({ type: 'funnel', ...event }))
    return
  }
  try {
    const clientHash = await hashClient(event.clientIp)
    await env.DB.prepare(
      'INSERT INTO funnel_events (ts, tool, stage, client_hash, user_agent) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(
        new Date().toISOString(),
        event.tool,
        event.stage,
        clientHash,
        event.userAgent.slice(0, 200),
      )
      .run()
  } catch (error) {
    // Metering must never break the request path — log and continue.
    console.error('metering failed:', error instanceof Error ? error.message : String(error))
  }
}

/** IPs are stored only as truncated salted hashes — enough for unique-caller counts. */
async function hashClient(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`toriigate:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Peek at the JSON-RPC body to extract the MCP method name (for metering). */
export async function peekJsonRpcMethod(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.clone().json()
    const first = Array.isArray(body) ? body[0] : body
    if (first && typeof first === 'object' && 'method' in first) {
      const method = (first as { method: unknown }).method
      return typeof method === 'string' ? method : null
    }
    return null
  } catch {
    return null
  }
}
