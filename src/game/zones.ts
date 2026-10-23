import type { Zone, ZoneId, GweiData } from './types'
export const ZONES: Zone[] = [
  { id: 0, name: 'Monhattan', chain: 'Monad', rpc: 'https://rpc.monad.xyz', vibe: 'Parallel trams. Serial coffee drinkers.', baseDailyCost: 10, multiplier: 1, color: '#a78bfa', bgClass: 'from-purple-900/30 to-indigo-900/20', locked: false },
  { id: 1, name: 'Gwei York', chain: 'Ethereum', rpc: 'https://ethereum-rpc.publicnode.com', vibe: 'If you can afford rent here, you can afford brunch.', baseDailyCost: 80, multiplier: 3, color: '#818cf8', bgClass: 'from-indigo-900/30 to-blue-900/20', locked: true },
  { id: 2, name: 'Basedford', chain: 'Base', rpc: 'https://mainnet.base.org', vibe: 'Builders by day. Extremely based by night.', baseDailyCost: 25, multiplier: 1.5, color: '#60a5fa', bgClass: 'from-blue-900/30 to-cyan-900/20', locked: true },
  { id: 3, name: 'Arbiquerque', chain: 'Arbitrum One', rpc: 'https://arb1.arbitrum.io/rpc', vibe: 'Optimistic locals. Suspiciously fast accountants.', baseDailyCost: 20, multiplier: 1.3, color: '#22d3ee', bgClass: 'from-cyan-900/30 to-teal-900/20', locked: true },
  { id: 4, name: 'Polygone-on-Sea', chain: 'Polygon', rpc: 'https://polygon.drpc.org', vibe: 'Many sides. One very opinionated seaside council.', baseDailyCost: 15, multiplier: 1.2, color: '#fb923c', bgClass: 'from-orange-900/30 to-red-900/20', locked: true },
  { id: 5, name: 'Sanctuary rest stop', chain: 'Recovery space', rpc: null, vibe: 'Free rest and recovery', baseDailyCost: 0, multiplier: 0, color: '#94a3b8', bgClass: 'from-slate-900/30 to-gray-900/20', locked: false },
]
export const GAS_BASELINES = [50, 10, 0.01, 0.01, 30, 1]
export const CITIES = ZONES.filter(zone=>zone.id!==5)
// Each baseline is the native-chain gas observation that maps to the nominal gCHOG price.
// This is an explicit game exchange index, not a claim about an ERC20's market price.
export function gasPressure(zone:ZoneId,gwei:number|null|undefined):number {
  return gwei==null||!Number.isFinite(gwei)||gwei<0?1:Math.max(.5,Math.min(3,gwei/GAS_BASELINES[zone]))
}
export function cityPrice(base:number,zone:ZoneId,gwei:number|null|undefined,eventMultiplier=1):number {
  return base===0?0:Math.max(1,Math.ceil(base*gasPressure(zone,gwei)*eventMultiplier))
}
const cache = new Map<ZoneId, GweiData>()
const pending = new Map<ZoneId, Promise<GweiData>>()
export async function getZoneGwei(zoneId: ZoneId, fresh = false, fetcher: typeof fetch = fetch): Promise<GweiData> {
  const cached = cache.get(zoneId)
  if (!fresh && cached && Date.now() - cached.fetchedAt < 60_000 && !cached.stale) return cached
  const running = pending.get(zoneId)
  if (running) return running
  const request = (async () => {
    const zone = ZONES[zoneId]
    if (!zone.rpc) return { zoneId, gwei: null, wei: null, fetchedAt: Date.now(), stale: false }
    try {
      const response = await fetcher(zone.rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }), signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error('RPC unavailable')
      const json = await response.json() as { result?: string }
      if (!json.result || !/^0x[0-9a-f]+$/i.test(json.result)) throw new Error('Invalid gas price')
      const wei = BigInt(json.result)
      const gwei = Number(wei) / 1e9
      if (!Number.isFinite(gwei)) throw new Error('Gas price out of range')
      return { zoneId, gwei, wei: wei.toString(), fetchedAt: Date.now(), stale: false }
    } catch {
      return { zoneId, gwei: cached?.gwei ?? null, wei: cached?.wei ?? null, fetchedAt: cached?.fetchedAt ?? 0, stale: true }
    }
  })()
  pending.set(zoneId, request)
  try { const result = await request; cache.set(zoneId, result); return result } finally { pending.delete(zoneId) }
}
export function getAllZoneGwei(fetcher: typeof fetch = fetch): Promise<GweiData[]> { return Promise.all(ZONES.map(z => getZoneGwei(z.id, false, fetcher))) }
export function computeDailyCost(zone: Zone, gwei: number | null, rarityRank: number, eventMultiplier = 1): number {
  if (zone.id === 5) return 0
  const pressure = gasPressure(zone.id,gwei)
  const discount = 0.5 + 0.5 * Math.max(1, Math.min(1969, rarityRank)) / 1969
  return Math.max(1, Math.round(zone.baseDailyCost * zone.multiplier * pressure * discount * eventMultiplier))
}
export function travelCost(from: ZoneId, to: ZoneId,gwei?:number|null): number { return from === to || to === 0 || to === 5 ? 0 : cityPrice(Math.abs(to - from) * 30,to,gwei) }
