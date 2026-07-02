import { Hono } from 'hono'
import { StreamableHTTPTransport } from '@hono/mcp'
import { buildMcpServer, getManifest } from './core/manifest'
import { renderLlmsTxt, renderServerJson } from './core/discovery'
import { peekJsonRpcMethod, recordEvent, type MeteringEnv } from './core/metering'
import { checkRateLimit } from './core/ratelimit'

const app = new Hono<{ Bindings: MeteringEnv }>()

app.get('/health', (c) => c.json({ ok: true }))

// Domain ownership proof for the official MCP Registry (dev.toriigate/* namespace)
app.get('/.well-known/mcp-registry-auth', (c) =>
  c.text('v=MCPv1; k=ed25519; p=elEa7SN1dMikTw4rJEEWuCtezNU44FXKaFL4vfcpVZM='),
)

// Public aggregated funnel stats — counts only, no client data (build in public)
app.get('/stats', async (c) => {
  if (!c.env.DB) return c.json({ error: 'stats unavailable' }, 503)
  const since = "strftime('%Y-%m-%dT%H:%M:%S', 'now', '-7 days')"
  const [week, total, uniq] = await Promise.all([
    c.env.DB.prepare(
      `SELECT tool, stage, COUNT(*) AS n FROM funnel_events WHERE ts >= ${since} GROUP BY tool, stage`,
    ).all<{ tool: string; stage: string; n: number }>(),
    c.env.DB.prepare(
      'SELECT tool, stage, COUNT(*) AS n FROM funnel_events GROUP BY tool, stage',
    ).all<{ tool: string; stage: string; n: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(DISTINCT client_hash) AS n FROM funnel_events WHERE ts >= ${since}`,
    ).first<{ n: number }>(),
  ])
  c.header('Cache-Control', 'public, max-age=300')
  return c.json({
    generatedAt: new Date().toISOString(),
    last7Days: week.results,
    allTime: total.results,
    uniqueClients7d: uniq?.n ?? 0,
  })
})

app.get('/llms.txt', (c) => {
  c.executionCtx.waitUntil(recordDiscovery(c.env, c.req.raw, 'platform'))
  return c.text(renderLlmsTxt(originOf(c.req.url)))
})

app.get('/', (c) => {
  c.executionCtx.waitUntil(recordDiscovery(c.env, c.req.raw, 'platform'))
  return c.text(renderLlmsTxt(originOf(c.req.url)))
})

app.get('/mcp/:tool/server.json', (c) => {
  const manifest = getManifest(c.req.param('tool'))
  if (!manifest) return c.json({ error: 'unknown tool' }, 404)
  c.executionCtx.waitUntil(recordDiscovery(c.env, c.req.raw, manifest.slug))
  return c.json(renderServerJson(originOf(c.req.url), manifest))
})

app.all('/mcp/:tool', async (c) => {
  const manifest = getManifest(c.req.param('tool'))
  if (!manifest) return c.json({ error: 'unknown tool' }, 404)

  const clientIp = c.req.header('cf-connecting-ip') ?? 'unknown'
  if (!checkRateLimit(`${manifest.slug}:${clientIp}`)) {
    return c.json({ error: 'rate limited (free tier: 30 req/min)' }, 429)
  }

  if (c.req.method === 'POST') {
    const method = await peekJsonRpcMethod(c.req.raw)
    const stage =
      method === 'initialize' ? 'connect'
      : method === 'tools/list' ? 'browse'
      : method === 'tools/call' ? 'call'
      : null
    if (stage) {
      c.executionCtx.waitUntil(
        recordEvent(c.env, {
          tool: manifest.slug,
          stage,
          clientIp,
          userAgent: c.req.header('user-agent') ?? '',
        }),
      )
    }
  }

  const server = buildMcpServer(manifest)
  const transport = new StreamableHTTPTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  return transport.handleRequest(c)
})

function originOf(url: string): string {
  return new URL(url).origin
}

function recordDiscovery(env: MeteringEnv, request: Request, tool: string): Promise<void> {
  return recordEvent(env, {
    tool,
    stage: 'discovery',
    clientIp: request.headers.get('cf-connecting-ip') ?? 'unknown',
    userAgent: request.headers.get('user-agent') ?? '',
  })
}

export default app
