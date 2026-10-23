import type { ChogMetadata, ChogTrait } from './types'
export interface SourceToken { tokenId: number; uri: string; metadata: ChogMetadata; sha256: string }
export interface SourceManifest {
  version: 1; chainId: 143; collection: string; snapshotBlock: number; scoring: 'trait-frequency-v1'; tokens: SourceToken[]
}
export function canonicalTraits(traits: ChogTrait[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const trait of traits) {
    const type = trait.trait_type.trim().toLowerCase()
    if (map.has(type)) throw new Error(`Duplicate trait category: ${type}`)
    map.set(type, trait.value.trim().toLowerCase())
  }
  return map
}
export function calculateRarity(tokens: SourceToken[]): Map<number, { score: number; rank: number }> {
  if (!tokens.length || new Set(tokens.map(t => t.tokenId)).size !== tokens.length) throw new Error('Collection must contain unique tokens')
  const traits = tokens.map(t => canonicalTraits(t.metadata.attributes))
  const categories = [...new Set(traits.flatMap(t => [...t.keys()]))].sort()
  if (!categories.length) throw new Error('Collection has no trait categories')
  const counts = new Map<string, Map<string | null, number>>()
  for (const category of categories) {
    const frequencies = new Map<string | null, number>()
    for (const record of traits) { const value = record.get(category) ?? null; frequencies.set(value, (frequencies.get(value) ?? 0) + 1) }
    counts.set(category, frequencies)
  }
  const scores = traits.map(record => categories.reduce((sum, category) => sum - Math.log2(counts.get(category)!.get(record.get(category) ?? null)! / tokens.length), 0))
  return new Map(tokens.map((t, i) => [t.tokenId, { score: scores[i], rank: 1 + scores.filter(score => score > scores[i] + 1e-10).length }]))
}
export function validMetadata(value: unknown): value is ChogMetadata {
  if (!value || typeof value !== 'object') return false
  const m = value as ChogMetadata
  return typeof m.name === 'string' && typeof m.image === 'string' && Array.isArray(m.attributes) && m.attributes.length > 0 && m.attributes.every(a => typeof a.trait_type === 'string' && a.trait_type.trim() && typeof a.value === 'string')
}
