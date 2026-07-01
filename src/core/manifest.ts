import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { foodDb } from '../tools/food-db/manifest'

export interface DataSource {
  readonly name: string
  readonly url: string
  readonly license: string
}

export type Pricing =
  | { readonly model: 'free' }
  | { readonly model: 'metered'; readonly perCallJpy: number }

export interface ToolManifest {
  /** URL segment: /mcp/<slug> */
  readonly slug: string
  readonly name: string
  readonly version: string
  /** English-first — global agents are the primary audience */
  readonly description: string
  readonly descriptionJa: string
  readonly pricing: Pricing
  readonly dataSources: readonly DataSource[]
  readonly register: (server: McpServer) => void
}

/** Registry of all tools. Adding a tool is a one-line change here. */
export const manifests: readonly ToolManifest[] = [foodDb]

export function getManifest(slug: string): ToolManifest | undefined {
  return manifests.find((m) => m.slug === slug)
}

export function buildMcpServer(manifest: ToolManifest): McpServer {
  const server = new McpServer({
    name: `toriigate/${manifest.slug}`,
    version: manifest.version,
  })
  manifest.register(server)
  return server
}
