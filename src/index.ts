import { Hono } from 'hono'
import { StreamableHTTPTransport } from '@hono/mcp'
import { buildMcpServer, getManifest } from './core/manifest'
import { renderLlmsTxt, renderServerJson } from './core/discovery'
import { peekJsonRpcMethod, recordEvent, type MeteringEnv } from './core/metering'
import { checkRateLimit } from './core/ratelimit'

const app = new Hono<{ Bindings: MeteringEnv }>()

app.get('/health', (c) => c.json({ ok: true }))

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
    if (method === 'initialize' || method === 'tools/call') {
      c.executionCtx.waitUntil(
        recordEvent(c.env, {
          tool: manifest.slug,
          stage: method === 'initialize' ? 'connect' : 'call',
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
