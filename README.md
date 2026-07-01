# ⛩️ Torii Gate

**Japanese data tools for AI agents.**

Japan has a wealth of clean, public, factual data — food composition tables, corporate registries, laws, land prices. Almost none of it is usable by AI agents: no clean APIs, Japanese-only interfaces, Excel files behind web forms. Meanwhile, agents worldwide get asked to do Japanese tasks every day.

Torii Gate is the gateway: each dataset becomes a remote [MCP](https://modelcontextprotocol.io) server that any agent can discover, connect to, and call.

## Tools

| Tool | Description | Endpoint |
|------|-------------|----------|
| **Japan Food DB** | Resolve Japanese food names (fuzzy/colloquial forms included) to nutrition facts per 100g, based on the official Standard Tables of Food Composition in Japan. Covers foods USDA and Open Food Facts don't. | `/mcp/food-db` |

More tools are on the way — corporate registry lookup, invoice registration checks, subsidy search. The platform is manifest-driven: adding a tool is one directory and one registry line.

## Connect from an MCP client

Add the remote server to your client (Claude Code example):

```sh
claude mcp add --transport http japan-food-db https://toriigate.dev/mcp/food-db
```

Then ask things like *"「セブンのサラダチキン」的な鶏むね肉のカロリーは?"* — the agent calls `search_food` / `get_nutrition` and gets factual data with sources attached.

No API key is needed for the free tier (rate-limited).

## Run it yourself

```sh
npm install
npm run dev        # local dev server on :8787
npm run typecheck
```

Smoke test:

```sh
curl http://localhost:8787/llms.txt
curl -X POST http://localhost:8787/mcp/food-db \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_food","arguments":{"query":"ごはん"}}}'
```

## Architecture

- **Cloudflare Workers + Hono + MCP SDK** (Streamable HTTP, stateless)
- **Manifest-driven**: each tool lives in `src/tools/<name>/` and declares its MCP tools, pricing, and data sources in a manifest. `llms.txt` and MCP Registry `server.json` records are generated from manifests — never hand-written.
- **Funnel metering built in**: discovery → connect → call events are recorded for every tool.
- **Budget-guarded by design**: runs on the Workers free plan, whose hard request cap fails closed instead of billing.

## Data principles

1. Records hold facts only — names, numbers, source URL, retrieval date. No copyrighted text or images.
2. Public/government data forms the base layer; every record carries its source and license.
3. Every response includes a disclaimer: reference values only, never for medical, allergy, or other critical decisions.
4. Takedown requests are honored immediately.

Full datasets are imported at deploy time and are not part of this repository.

## The experiment

This platform is built and operated almost entirely by AI agents — planning, code, registry publishing, monitoring, and weekly funnel reports — with a human in the loop only for publish/kill approvals and a budget review. It is an open experiment in whether an AI-operated business unit can find real agent-to-agent demand. Funnel numbers and decisions will be published as we go.

## License

[MIT](LICENSE)
