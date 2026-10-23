import type { GameState, ZoneId } from './types'
import { ACTIONS } from './gameEngine'
import { parseEstate, DEFAULT_LOCATION, frontDoor, streetWalkable } from './neighborhood'
import { DEFAULT_PROFILE, parseProfile } from './residentProfile'
import {validBlueprint,houseWalkable} from './housing'

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function storageKey(s: Pick<GameState, 'chainId' | 'collection' | 'tokenId'>): string {
  return `chainworld_v2_${s.chainId}_${s.collection.toLowerCase()}_${s.tokenId}`
}
function finite(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}
// Whitelist fields instead of trusting serialized identity, stats, appearance or registration.
export function restoreSave(raw: string, identity: GameState): GameState | null {
  try {
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object' || ![undefined, 1, 2].includes(p.version) || p.tokenId !== identity.tokenId || !p.meters || !finite(p.gChog, 0, Number.MAX_SAFE_INTEGER) || !finite(p.lastSaved, 0, Number.MAX_SAFE_INTEGER) || p.lastSaved > Date.now() + 300000) return null
    if (p.version === 2 && (p.chainId !== identity.chainId || p.collection?.toLowerCase() !== identity.collection)) return null
    if (![p.meters.hunger, p.meters.social].every(n => finite(n, 0, 100)) || !finite(p.meters.reputation, 0, 500) || !finite(p.meters.housingTier, 0, 5)) return null
    const v2 = p.version === 2
    if (v2 && (!finite(p.meters.energy, 0, 100) || !finite(p.xp, 0, 1e9) || !finite(p.sequence, 0, Number.MAX_SAFE_INTEGER) || !finite(p.upkeepCarry, 0, 1) || !Array.isArray(p.quests) || !p.cooldowns)) return null
    const cooldowns: Record<string, number> = {}
    if (v2) for (const key of ['socialize', 'ration', 'validator']) if (finite(p.cooldowns[key], 0, Number.MAX_SAFE_INTEGER)) cooldowns[key] = p.cooldowns[key]
    const s: GameState = {
      ...identity, household:undefined,home:parseEstate(p.home)??identity.home,location:{...DEFAULT_LOCATION,tile:frontDoor(parseEstate(p.home)??identity.home)}, profile:parseProfile(p.profile)??{...DEFAULT_PROFILE}, gChog: Math.floor(p.gChog), lastSaved: p.lastSaved, upkeepCarry: v2 ? p.upkeepCarry : 0,
      meters: { hunger: p.meters.hunger, social: p.meters.social, energy: v2 ? p.meters.energy : 100, reputation: p.meters.reputation, housingTier: Math.floor(p.meters.housingTier) },
      currentZone: [0,1,2,3,4,5].includes(p.currentZone) ? p.currentZone : 0,
      xp: v2 ? p.xp : 0, sequence: v2 ? p.sequence : 0, cooldowns,
      completedWork: v2 && finite(p.completedWork, 0, 1e9) ? Math.floor(p.completedWork) : 0,
      upgrades: v2 && finite(p.upgrades, 0, 5) ? Math.floor(p.upgrades) : 0,
      quests: v2 ? p.quests.filter((q: unknown) => typeof q === 'string' && ['first_shift','well_cared','home_upgrade','career'].includes(q)) : [],
      streak: v2 && finite(p.streak, 0, 1e9) ? p.streak : 0,
      unlockedZones: [...new Set<ZoneId>([...identity.unlockedZones, ...(Array.isArray(p.unlockedZones) ? p.unlockedZones.filter((z: unknown) => typeof z === 'number' && [0,1,2,3,4,5].includes(z)) : [])])],
    }
    const h=p.household
    if(h?.schema===1&&Number.isInteger(h.seed)&&['legacy-rank-v1','source-tier-v1'].includes(h.grant)&&typeof h.sourceTier==='string'&&h.blueprint&&validBlueprint(h.blueprint)&&houseWalkable(h.blueprint,h.humanTile)&&h.pet&&[h.pet.hunger,h.pet.energy,h.pet.affection,h.pet.bond].every((n:unknown)=>finite(n,0,100))&&typeof h.pet.following==='boolean'&&finite(h.pet.lastCare,0,Date.now()+300000)&&h.relationships&&typeof h.relationships==='object')s.household={...h,journey:null,pendingUse:null}
    if(p.location?.kind==='street'&&Number.isInteger(p.location.tile?.x)&&Number.isInteger(p.location.tile?.y)){const tile=p.location.tile;if(streetWalkable(tile))s.location={kind:'street',tile,journey:null}}
    if (v2 && p.action && ['eat','snack','rest','sleep','socialize','unwind','work','focus','hermit'].includes(p.action.kind) && finite(p.action.id, 1, s.sequence) && finite(p.action.startedAt, 0, s.lastSaved) && finite(p.action.endsAt, p.action.startedAt, p.action.startedAt + 60000) && p.action.endsAt-p.action.startedAt === ACTIONS[p.action.kind as keyof typeof ACTIONS].duration) s.action = p.action
    const j = p.job
    if (v2 && j && ['validator','grifter'].includes(j.kind) && finite(j.id, 1, s.sequence) && finite(j.startedAt, 0, s.lastSaved) && finite(j.endsAt, j.startedAt, j.startedAt + 20000) && finite(j.seed, 0, 2147483647) && finite(j.score, 0, 330) && Array.isArray(j.clicked) && j.clicked.every((i: unknown) => Number.isInteger(i) && Number(i) >= 0 && Number(i) < 33) && j.zone === s.currentZone) {
      if (j.kind === 'validator' || (typeof j.openingWei === 'string' && /^\d+$/.test(j.openingWei) && finite(j.openingAt, 0, j.startedAt) && ['up','down'].includes(j.prediction))) s.job = j
    }
    return s
  } catch { return null }
}
export function loadGameState(identity: GameState, storage?: StorageLike): { state: GameState; warning: string | null } {
  try {
    const target=storage??globalThis.localStorage
    const key = storageKey(identity)
    const raw = target.getItem(key) ?? target.getItem(`chainworld_v1_${identity.walletAddress.toLowerCase()}_${identity.tokenId}`)
    if (!raw) return { state: identity, warning: null }
    const state = restoreSave(raw, identity)
    if (state) return { state, warning: null }
    target.setItem(`${key}_recovery`, raw)
    return { state: identity, warning: 'Your previous save was invalid and was preserved as a recovery copy. A fresh local game is ready.' }
  } catch { return { state: identity, warning: 'Browser storage is unavailable. Progress may not survive a reload.' } }
}
export function saveGameState(state: GameState, storage?: StorageLike): boolean {
  try { const target=storage??globalThis.localStorage; target.setItem(storageKey(state), JSON.stringify(state)); return true } catch { return false }
}
