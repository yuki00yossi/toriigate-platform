export interface FoodRecord {
  readonly id: string
  readonly name: string
  readonly aliases: readonly string[]
  /** Per 100g edible portion */
  readonly per100g: {
    readonly kcal: number
    readonly proteinG: number
    readonly fatG: number
    readonly carbsG: number
  }
  readonly source: string
  readonly retrievedAt: string
}

export const DISCLAIMER =
  'Reference values only, based on published sources. ' +
  'Not for medical, allergy, or other critical decisions. 参考値であり、医療・アレルギー等の重大な判断には使用できません。'

const SOURCE_MEXT = '日本食品標準成分表(八訂)増補2023年 サンプル抜粋'

// Sample seed data. The full dataset (Standard Tables of Food Composition in
// Japan + branded foods) is imported into D1 at deploy time, not committed here.
export const FOODS: readonly FoodRecord[] = [
  food('rice-cooked', 'ごはん(精白米・水稲めし)', ['白米', 'ライス', '米飯'], 156, 2.5, 0.3, 37.1),
  food('bread-white', '食パン', ['パン', 'トースト'], 248, 8.9, 4.1, 46.4),
  food('chicken-breast', '鶏むね肉(皮なし・生)', ['鶏胸肉', 'とりむね', 'チキンブレスト'], 105, 23.3, 1.9, 0.1),
  food('chicken-thigh', '鶏もも肉(皮つき・生)', ['とりもも', '鶏腿肉'], 190, 16.6, 14.2, 0),
  food('egg', '鶏卵(全卵・生)', ['卵', 'たまご', 'エッグ'], 142, 12.2, 10.2, 0.4),
  food('natto', '納豆(糸引き)', ['なっとう'], 190, 16.5, 10.0, 12.1),
  food('tofu-momen', '木綿豆腐', ['豆腐', 'とうふ'], 73, 7.0, 4.9, 1.5),
  food('milk', '普通牛乳', ['牛乳', 'ミルク'], 61, 3.3, 3.8, 4.8),
  food('banana', 'バナナ(生)', ['ばなな'], 93, 1.1, 0.2, 22.5),
  food('mackerel', 'まさば(生)', ['サバ', '鯖'], 211, 20.6, 16.8, 0.3),
  food('broccoli', 'ブロッコリー(生)', ['ぶろっこりー'], 37, 5.4, 0.6, 6.6),
  food('avocado', 'アボカド(生)', ['アボガド'], 176, 2.1, 17.5, 7.9),
]

function food(
  id: string,
  name: string,
  aliases: readonly string[],
  kcal: number,
  proteinG: number,
  fatG: number,
  carbsG: number,
): FoodRecord {
  return {
    id,
    name,
    aliases,
    per100g: { kcal, proteinG, fatG, carbsG },
    source: SOURCE_MEXT,
    retrievedAt: '2026-07-02',
  }
}

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[\s・()()]/g, '')
}

export function searchFoods(query: string, limit: number): readonly FoodRecord[] {
  const q = normalize(query)
  if (q.length === 0) return []
  return FOODS.filter(
    (f) => normalize(f.name).includes(q) || f.aliases.some((a) => normalize(a).includes(q)),
  ).slice(0, limit)
}

export function getFood(id: string): FoodRecord | undefined {
  return FOODS.find((f) => f.id === id)
}
