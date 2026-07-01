export type FunnelStage = 'discovery' | 'connect' | 'call'

export interface FunnelEvent {
  readonly tool: string
  readonly stage: FunnelStage
  readonly clientIp: string
  readonly userAgent: string
}

interface MeteringEnv {
  readonly METERING?: AnalyticsEngineDataset
}

/**
 * Funnel tracking: discovery → connect → call.
 * Falls back to structured console logs until an Analytics Engine dataset is bound.
 * A "paid" stage is added together with the billing layer.
 */
export function recordEvent(env: MeteringEnv, event: FunnelEvent): void {
  if (env.METERING) {
    env.METERING.writeDataPoint({
      blobs: [event.tool, event.stage, event.userAgent],
      indexes: [event.clientIp],
    })
    return
  }
  console.log(JSON.stringify({ type: 'funnel', ...event }))
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
