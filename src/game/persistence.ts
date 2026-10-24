import {newChogEconomy,parseChogEconomy,productionGood} from './chogEconomy'
import type { GameState, ZoneId } from './types'
import {parseLife,newLife,RECIPES} from './life'
import {ADDED_NEEDS} from './needs'
import {parseRoutine,newRoutine} from './routine'
import {parseDaily,newDaily,DAY_MS} from './dailyGoals'
import { ACTIONS,LEGACY_CARE_DURATIONS } from './gameEngine'
import { parseEstate, DEFAULT_LOCATION, frontDoor, streetWalkable } from './neighborhood'
import { DEFAULT_PROFILE, parseProfile } from './residentProfile'
import {validBlueprint,houseWalkable,entryTile,wallBlocks,approaches,FURNITURE,ROOM_STEP,type Blueprint} from './housing'
import {venueOf,venueBlueprint,placeKey,npcById} from './places'

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
    if(Object.keys(ADDED_NEEDS).some(key=>p.meters[key]!==undefined&&!finite(p.meters[key],0,100)))return null
    const v2 = p.version === 2
    if (v2 && (!finite(p.meters.energy, 0, 100) || !finite(p.xp, 0, 1e9) || !finite(p.sequence, 0, Number.MAX_SAFE_INTEGER) || !finite(p.upkeepCarry, 0, 1) || !Array.isArray(p.quests) || !p.cooldowns)) return null
    const cooldowns: Record<string, number> = {}
    if (v2) for (const key of Object.keys(p.cooldowns).filter(k=>['socialize','ration','validator'].includes(k)||/^hangout:npc:[0-4]:(cafe|work|park|library)$/.test(k))) if (finite(p.cooldowns[key], 0, Number.MAX_SAFE_INTEGER)) cooldowns[key] = p.cooldowns[key]
    const life=p.life===undefined?newLife():parseLife(p.life);if(!life)return null
    const routine=p.routine===undefined?newRoutine():parseRoutine(p.routine,v2?p.sequence:0);if(!routine)return null
    const daily=p.daily===undefined?newDaily(p.lastSaved):parseDaily(p.daily);if(!daily||daily.day>Math.floor(p.lastSaved/DAY_MS))return null
    const chogEconomy=p.chogEconomy===undefined?newChogEconomy(p.lastSaved):parseChogEconomy(p.chogEconomy,p.lastSaved);if(!chogEconomy)return null
    const s: GameState = {
      ...identity, life, routine, daily, chogEconomy, household:undefined,home:parseEstate(p.home)??identity.home,location:{...DEFAULT_LOCATION,tile:frontDoor(parseEstate(p.home)??identity.home)}, profile:parseProfile(p.profile)??{...DEFAULT_PROFILE}, gChog: Math.floor(p.gChog), lastSaved: p.lastSaved, upkeepCarry: v2 ? p.upkeepCarry : 0,
      meters: { hygiene:p.meters.hygiene??ADDED_NEEDS.hygiene,fun:p.meters.fun??ADDED_NEEDS.fun,comfort:p.meters.comfort??ADDED_NEEDS.comfort, hunger: p.meters.hunger, social: p.meters.social, energy: v2 ? p.meters.energy : 100, reputation: p.meters.reputation, housingTier: Math.floor(p.meters.housingTier) },
      currentZone: [0,1,2,3,4,5].includes(p.currentZone) ? p.currentZone : 0,
      xp: v2 ? p.xp : 0, sequence: v2 ? p.sequence : 0, cooldowns,
      completedWork: v2 && finite(p.completedWork, 0, 1e9) ? Math.floor(p.completedWork) : 0,
      upgrades: v2 && finite(p.upgrades, 0, 5) ? Math.floor(p.upgrades) : 0,
      quests: v2 ? p.quests.filter((q: unknown) => typeof q === 'string' && ['first_shift','well_cared','home_upgrade','career'].includes(q)) : [],
      streak: v2 && finite(p.streak, 0, 1e9) ? p.streak : 0,
      unlockedZones: [...new Set<ZoneId>([...identity.unlockedZones, ...(Array.isArray(p.unlockedZones) ? p.unlockedZones.filter((z: unknown) => typeof z === 'number' && [0,1,2,3,4,5].includes(z)) : [])])],
    }
    const venue=venueOf(p.location?.venue)
    if(venue&&s.currentZone!==5)s.location={kind:'home',tile:p.location.tile??{x:5,y:3},journey:null,district:0,venue:placeKey(s.currentZone,venue),interior:p.location.interior&&validBlueprint(p.location.interior)&&p.location.interior.environment===venue&&(p.action||p.household?.journey||p.household?.pendingUse)?p.location.interior:venueBlueprint(s.currentZone,venue)}
    const h=p.household
    if(h?.schema===1&&Number.isInteger(h.seed)&&['legacy-rank-v1','source-tier-v1'].includes(h.grant)&&typeof h.sourceTier==='string'&&h.blueprint&&validBlueprint(h.blueprint)&&h.pet&&[h.pet.hunger,h.pet.energy,h.pet.affection,h.pet.bond].every((n:unknown)=>finite(n,0,100))&&typeof h.pet.following==='boolean'&&finite(h.pet.lastCare,0,Date.now()+300000)&&h.relationships&&typeof h.relationships==='object'){
      const b:Blueprint=s.location.interior??h.blueprint,relationships:typeof h.relationships={}
      for(const[id,r]of Object.entries(h.relationships) as [string,{friendship:number;meetings:number;lastMet:number;memory:string}][])if(npcById(id)&&finite(r.friendship,0,100)&&finite(r.meetings,0,1e9)&&finite(r.lastMet,0,Date.now()+300000)&&typeof r.memory==='string'&&r.memory.length<80)relationships[id]=r
      s.household={...h,relationships,humanTile:h.humanTile&&houseWalkable(b,h.humanTile)?h.humanTile:entryTile(b),journey:null,pendingUse:null}
      const restoredHouse=s.household!
      const journey=h.journey
      if(journey&&Array.isArray(journey.path)&&journey.path.length>0&&journey.path.length<=256&&journey.from&&houseWalkable(b,journey.from)&&finite(journey.startedAt,0,s.lastSaved)&&journey.endsAt===journey.startedAt+journey.path.length*ROOM_STEP){
        const route=[journey.from,...journey.path]
        if(route.every(t=>houseWalkable(b,t))&&route.every((t,i)=>!i||Math.abs(t.x-route[i-1].x)+Math.abs(t.y-route[i-1].y)===1&&!wallBlocks(b,route[i-1],t)))restoredHouse.journey={from:journey.from,path:journey.path.map((t:{x:number;y:number})=>({x:t.x,y:t.y})),startedAt:journey.startedAt,endsAt:journey.endsAt}
      }
      const pending=h.pendingUse,o=b.objects.find(o=>o.id===pending?.objectId&&!o.stored),target=restoredHouse.journey?.path.slice(-1)[0]??restoredHouse.humanTile
      if(pending&&o&&pending.layoutVersion===b.version&&finite(pending.arrivesAt,0,s.lastSaved+60000)&&(FURNITURE[o.type].actions as readonly string[]).includes(pending.kind)&&approaches(b,o).some(t=>t.x===target.x&&t.y===target.y)&&pending.arrivesAt===(restoredHouse.journey?.endsAt??s.lastSaved))restoredHouse.pendingUse={objectId:o.id,kind:pending.kind,layoutVersion:b.version,arrivesAt:pending.arrivesAt}

    }
    if(p.location?.kind==='street'&&Number.isInteger(p.location.tile?.x)&&Number.isInteger(p.location.tile?.y)){const tile=p.location.tile;if(streetWalkable(tile))s.location={kind:'street',tile,journey:null}}
    const trip=p.location?.trip
    if(trip&&[0,1,2,3,4,5].includes(trip.zone)&&finite(trip.startedAt,0,s.lastSaved)&&finite(trip.endsAt,trip.startedAt,trip.startedAt+60000)&&finite(trip.fare,0,1e9))s.location={kind:'street',tile:{x:29,y:3},district:p.location.district??0,journey:null,trip}
    if (v2 && p.action && (p.action.chogGood===undefined||productionGood(p.action.kind)===p.action.chogGood) && Object.prototype.hasOwnProperty.call(ACTIONS,p.action.kind) && finite(p.action.id, 1, s.sequence) && finite(p.action.startedAt, 0, s.lastSaved) && finite(p.action.endsAt, p.action.startedAt, p.action.startedAt + 60000) && (p.action.kind!=='npcHangout'||typeof p.action.npcId==='string'&&npcById(p.action.npcId)!==null) && (p.action.mealRecipe===undefined||p.action.kind==='eatLeftovers'&&Object.prototype.hasOwnProperty.call(RECIPES,p.action.mealRecipe)) && (p.action.endsAt-p.action.startedAt === ACTIONS[p.action.kind as keyof typeof ACTIONS].duration||p.action.endsAt-p.action.startedAt===LEGACY_CARE_DURATIONS[p.action.kind as keyof typeof ACTIONS])) s.action = p.action
    const j = p.job
    if (v2 && j && ['validator','grifter'].includes(j.kind) && finite(j.id, 1, s.sequence) && finite(j.startedAt, 0, s.lastSaved) && finite(j.endsAt, j.startedAt, j.startedAt + 20000) && finite(j.seed, 0, 2147483647) && finite(j.score, 0, 330) && Array.isArray(j.clicked) && j.clicked.every((i: unknown) => Number.isInteger(i) && Number(i) >= 0 && Number(i) < 33) && j.zone === s.currentZone) {
      if (j.kind === 'validator' || (typeof j.openingWei === 'string' && /^\d+$/.test(j.openingWei) && finite(j.openingAt, 0, j.startedAt) && ['up','down'].includes(j.prediction))) s.job = j
    }
    s.buildMode=p.buildMode===true&&s.location.kind==='home'&&!s.location.venue&&!s.location.host&&!s.action&&!s.job&&!s.household?.journey&&!s.household?.pendingUse
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
