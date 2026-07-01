import { z } from 'zod'
import type { ToolManifest } from '../../core/manifest'
import { DISCLAIMER, LICENSE, RETRIEVED_AT, SOURCE, getFood, searchFoods } from './data'

export const foodDb: ToolManifest = {
  slug: 'food-db',
  name: 'Japan Food DB',
  version: '0.2.0',
  description:
    'Resolve Japanese food names (including fuzzy/colloquial forms like ごはん or サラダチキン) ' +
    'to nutrition facts per 100g. All 2,538 foods from the official Standard Tables of ' +
    'Food Composition in Japan. Covers foods that USDA and Open Food Facts do not.',
  descriptionJa:
    '日本語の食品名(曖昧・口語含む)を栄養成分(100gあたり)に解決する。文科省の食品標準成分表ベース。',
  pricing: { model: 'free' },
  dataSources: [
    {
      name: '日本食品標準成分表(八訂)増補2023年',
      url: 'https://fooddb.mext.go.jp/',
      license: '政府標準利用規約準拠・出典明記',
    },
  ],
  register: (server) => {
    server.registerTool(
      'search_food',
      {
        title: 'Search Japanese foods',
        description:
          'Search Japanese foods by name (Japanese or romaji-free text). ' +
          'Returns candidates with nutrition per 100g, source, and disclaimer.',
        inputSchema: {
          query: z.string().min(1).describe('Food name in Japanese, e.g. "鶏むね肉" or "ごはん"'),
          limit: z.number().int().min(1).max(20).optional().describe('Max results (default 5)'),
        },
      },
      async ({ query, limit }) => {
        const results = searchFoods(query, limit ?? 5)
        return jsonResult({ results, ...provenance() })
      },
    )

    server.registerTool(
      'get_nutrition',
      {
        title: 'Get nutrition facts by food ID',
        description: 'Get nutrition facts per 100g for a food ID returned by search_food.',
        inputSchema: {
          id: z.string().min(1).describe('Food ID from search_food, e.g. "chicken-breast"'),
        },
      },
      async ({ id }) => {
        const record = getFood(id)
        if (!record) {
          return jsonResult({ error: `unknown food id: ${id}` }, true)
        }
        return jsonResult({ food: record, ...provenance() })
      },
    )
  },
}

function provenance() {
  return {
    source: SOURCE,
    license: LICENSE,
    retrievedAt: RETRIEVED_AT,
    disclaimer: DISCLAIMER,
  }
}

function jsonResult(payload: object, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    isError,
  }
}
