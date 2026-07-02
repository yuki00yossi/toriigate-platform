import { manifests, type ToolManifest } from './manifest'

const BRAND = 'Torii Gate'
const TAGLINE =
  'Japanese data tools for AI agents — clean, factual, per-call APIs over MCP. ' +
  '日本の公的・公開データへの入り口。'

/** Body of llms.txt (and /). Generated from manifests — never hand-written. */
export function renderLlmsTxt(origin: string): string {
  const lines: readonly string[] = [
    `# ${BRAND}`,
    '',
    `> ${TAGLINE}`,
    '',
    'All tools are exposed as remote MCP servers (Streamable HTTP).',
    'Connect your MCP client to the endpoints below. No API key needed for the free tier.',
    '',
    '## Tools',
    '',
    ...manifests.flatMap((m) => toolSection(origin, m)),
    '## Notes',
    '',
    '- Data is factual reference data with sources attached to every record.',
    '- Not for medical, allergy, or other critical decisions. See tool disclaimers.',
    `- Build-in-public blog (experiment log, funnel numbers): ${origin}/blog/`,
    `- Live funnel stats: ${origin}/stats`,
  ]
  return lines.join('\n')
}

function toolSection(origin: string, m: ToolManifest): readonly string[] {
  const price =
    m.pricing.model === 'free' ? 'free' : `metered, ¥${m.pricing.perCallJpy}/call`
  return [
    `### ${m.name} (v${m.version})`,
    '',
    m.description,
    '',
    `- MCP endpoint: ${origin}/mcp/${m.slug}`,
    `- Pricing: ${price}`,
    `- Registry record: ${origin}/mcp/${m.slug}/server.json`,
    ...m.dataSources.map((s) => `- Data source: ${s.name} (${s.license}) — ${s.url}`),
    '',
  ]
}

/** server.json record for MCP Registry submission */
export function renderServerJson(origin: string, m: ToolManifest): object {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json',
    name: `dev.toriigate/${m.slug}`,
    description: m.description,
    version: m.version,
    remotes: [{ type: 'streamable-http', url: `${origin}/mcp/${m.slug}` }],
  }
}
