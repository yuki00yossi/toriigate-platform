import rawFoods from './foods.generated.json'

export interface FoodRecord {
  /** Official food number from the Standard Tables (e.g. "01088") */
  readonly id: string
  readonly group: string
  readonly name: string
  /** Per 100g edible portion. null = not measured in the source table */
  readonly kcal: number
  readonly proteinG: number | null
  readonly fatG: number | null
  readonly carbsG: number | null
}

export const SOURCE = '日本食品標準成分表(八訂)増補2023年(文部科学省)'
export const SOURCE_URL = 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html'
export const LICENSE = '政府標準利用規約準拠・出典明記'
export const RETRIEVED_AT = '2026-07-02'

export const DISCLAIMER =
  'Reference values only, based on published sources. ' +
  'Not for medical, allergy, or other critical decisions. 参考値であり、医療・アレルギー等の重大な判断には使用できません。'

/** Colloquial aliases for frequently-asked foods, keyed by official food number */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  '01088': ['ごはん', '白米', 'ライス', '米飯', '白飯', 'めし'],
  '01026': ['食パン', 'パン', 'トースト'],
  '01128': ['そば', '蕎麦'],
  '01039': ['うどん'],
  '11220': ['鶏むね肉', '鶏胸肉', 'とりむね', 'むね肉', 'チキンブレスト', 'サラダチキン'],
  '11221': ['鶏もも肉', 'とりもも', 'もも肉', '鶏腿肉'],
  '12004': ['卵', 'たまご', '玉子', '生卵', 'エッグ'],
  '04046': ['納豆', 'なっとう'],
  '04032': ['豆腐', 'とうふ'],
  '13003': ['牛乳', 'ミルク'],
  '07107': ['バナナ'],
  '10154': ['サバ', '鯖'],
  '10253': ['まぐろ', '鮪', 'まぐろ赤身', 'ツナ'],
  '06263': ['ブロッコリー'],
  '07006': ['アボカド', 'アボガド'],
  '11289': ['からあげ', '唐揚げ', 'から揚げ', 'とりのからあげ'],
}

export const FOODS: readonly FoodRecord[] = rawFoods as readonly FoodRecord[]

/** NFKC + lowercase + katakana→hiragana + strip spaces/brackets, for fuzzy Japanese matching */
function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s・()()\[\]【】<>＜＞「」,、。]/g, '')
}

interface IndexEntry {
  readonly record: FoodRecord
  readonly normName: string
  readonly normAliases: readonly string[]
}

const INDEX: readonly IndexEntry[] = FOODS.map((record) => ({
  record,
  normName: normalize(record.name),
  normAliases: (ALIASES[record.id] ?? []).map(normalize),
}))

function score(entry: IndexEntry, q: string, words: readonly string[]): number {
  if (entry.normAliases.some((a) => a === q)) return 100
  if (entry.normName === q) return 90
  if (entry.normAliases.some((a) => a.includes(q) || q.includes(a))) return 70
  if (entry.normName.startsWith(q)) return 60
  if (entry.normName.includes(q)) return 40
  if (words.length > 1 && words.every((w) => entry.normName.includes(w))) return 30
  return 0
}

export function searchFoods(query: string, limit: number): readonly FoodRecord[] {
  const q = normalize(query)
  if (q.length === 0) return []
  const words = query
    .split(/[\s　]+/)
    .map(normalize)
    .filter((w) => w.length > 0)
  return INDEX.map((entry) => ({ entry, s: score(entry, q, words) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.entry.normName.length - b.entry.normName.length)
    .slice(0, limit)
    .map((x) => x.entry.record)
}

export function getFood(id: string): FoodRecord | undefined {
  return FOODS.find((f) => f.id === id)
}
