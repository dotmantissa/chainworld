import {ensureChogEconomy,manageChogEconomy,partnerBonus,beginChogProduction,finishChogProduction,type ChogGood} from './chogEconomy'
import {VENUE_SERVICE_INDEX,refreshVenue} from './places'
import type { ActionKind, ChogTrait, GameMeters, GameState, JobKind, ZoneId } from './types'
import { rankToTier, tierToStartingFunds, tierToUnlockedZones, tierToHousingLevel, mapTraitsToCharacter } from './traitMapper'
import { getEventMultiplier, getTodaysEvent } from './events'
import { cityPrice, computeDailyCost, travelCost, ZONES } from './zones'
import { DEFAULT_ESTATE, DEFAULT_LOCATION, estateDefault, settleLocation, streetPath, STEP_MS, frontDoor, journeyTile, type HomeStyle, SERVICES, distance } from './neighborhood'
import type { Tile } from '../world/navigation'
import { DEFAULT_PROFILE, parseProfile, type ResidentProfile } from './residentProfile'
import {ensureHousehold} from './household'
import {activeBlueprint,queueIndoor,queueObject,editHousing,stopIndoor,type HousingEdit} from './indoor'
import {FURNITURE,entryTile,houseWalkable,validBlueprint} from './housing'
import {placeKey,venueBlueprint,venueOf,npcById,TOPICS,type Venue} from './places'
import {ADDED_NEEDS,ensureNeeds} from './needs'
import {newLife,ensureLife,settleMeals,lifeActionReason,consumeLifeAction,completeLifeAction,buyGroceries,projectCommand,GROCERIES,type Project} from './life'
import {newRoutine,ensureRoutine,enqueueIntent,intentValid,autonomyChoice} from './routine'
import {newDaily,ensureDaily,recordDaily,claimDaily,type DailyGoal} from './dailyGoals'
import {hangoutReason,completeHangout} from './social'

export const REAL_HOUR = 3_600_000
export const SIMULATION_SPEED = 10
export const ACTIONS: Record<ActionKind, { duration: number; cost: number; label: string }> = {
  eat: { duration: 4000, cost: 20, label: 'Eat a meal' },
  snack: { duration: 2000, cost: 10, label: 'Have a snack' },
  sleep: { duration: 20000, cost: 0, label: 'Sleep' },
  unwind: { duration: 8000, cost: 0, label: 'Unwind with a book' },
  focus: { duration: 60000, cost: 0, label: 'Focus on a project' },
  rest: { duration: 4000, cost: 0, label: 'Rest' },
  socialize: { duration: 4000, cost: 0, label: 'Call a friend' },
  work: { duration: 20000, cost: 0, label: 'Work a shift' },
  hermit: { duration: 60000, cost: 0, label: 'Provide liquidity' },
  wash: { duration: 3000, cost: 0, label: 'Wash at the sink' },
  shower: {duration:5000,cost:0,label:'Take a shower'},
  relax: { duration: 5000, cost: 0, label: 'Relax on the sofa' },
  cookBreakfast: {duration:15000,cost:0,label:'Cook fruit porridge'},
  cookStew: {duration:20000,cost:0,label:'Cook garden stew'},
  eatLeftovers: {duration:6000,cost:0,label:'Eat a prepared meal'},
  practiceCoding: {duration:15000,cost:0,label:'Practice coding'},
  paint: {duration:15000,cost:0,label:'Sketch in your notebook'},
  npcHangout:{duration:20000,cost:0,label:'Spend time with a friend'},
}
export const LEGACY_CARE_DURATIONS:Partial<Record<ActionKind,number>>={eat:6000,snack:3000,sleep:30000,unwind:15000,rest:10000,socialize:8000,wash:8000,relax:12000}
export type Command =
  | {type:'buyChogMaterials'|'upgradeChogWorkshop'}
  | {type:'setChogProduction';enabled:boolean}
  | {type:'deliverChogGoods';good:ChogGood}
  | {type:'setBuildMode';enabled:boolean}
  | {type:'claimDaily';id:DailyGoal}
  | {type:'enqueueAction';objectId:string;kind:ActionKind}
  | {type:'removeIntent';id:number}
  | {type:'reorderIntent';id:number;direction:'up'|'down'}
  | {type:'clearQueue'}
  | {type:'setAutonomy';enabled:boolean}
  | {type:'buyGroceries';pack:keyof typeof GROCERIES}
  | {type:'startProject'|'claimProject';id:Project}
  | {type:'enterVenue';venue:Venue}
  | {type:'talkNpc';npcId:string;topic:keyof typeof TOPICS}
  | HousingEdit
  | {type:'moveIndoor';target:Tile}
  | {type:'useObject';objectId:string;kind:ActionKind}
  | {type:'carePet';kind:'feed'|'pet'|'play'|'follow'}
  | { type: 'leaveHome' }
  | { type: 'walk'; target:Tile }
  | { type: 'enterHome'; host?:string }
  | { type: 'decorate'; style:HomeStyle; open:boolean }
  | { type: 'buyLand'; x:number; y:number }
  | { type: 'offerLand'; x:number; y:number; amount:number }
  | { type: 'respondOffer'; id:string; decision:'accept'|'reject'|'cancel' }
  | { type: 'gesture'; recipient:string; gesture:'wave'|'chat'|'high-five' }
  | { type: 'setProfile'; profile:ResidentProfile }
  | { type: 'tick' }
  | { type: 'startAction'; kind: ActionKind }
  | { type: 'cancel' }
  | { type: 'travel'; zone: ZoneId }
  | { type: 'upgrade' }
  | { type: 'ration' }
  | { type: 'claimQuest'; id: string }
  | { type: 'startJob'; kind: JobKind; openingWei?: string; openingAt?: number; prediction?: 'up' | 'down' }
  | { type: 'clickBlock'; index: number; sessionId: number }
  | { type: 'resolveGrifter'; sessionId: number; wei: string | null; fetchedAt: number; stale: boolean }
  | { type: 'registration'; lot: number | null }
export interface EngineContext { now: number; gas: Partial<Record<ZoneId, number | null>> }
export const QUESTS = [
  { id: 'first_shift', name: 'An honest day', description: 'Complete your first job.', reward: 60, ready: (s: GameState) => s.completedWork >= 1 },
  { id: 'well_cared', name: 'Feeling like a Chog', description: 'Keep hunger, energy and social at 80 or above.', reward: 40, ready: (s: GameState) => s.meters.hunger >= 80 && s.meters.energy >= 80 && s.meters.social >= 80 },
  { id: 'home_upgrade', name: 'A place of your own', description: 'Buy a home improvement.', reward: 100, ready: (s: GameState) => s.upgrades >= 1 },
  { id: 'career', name: 'Finding your rhythm', description: 'Complete five jobs.', reward: 150, ready: (s: GameState) => s.completedWork >= 5 },
]
export function createNewGameState(walletAddress: string, tokenId: number, traits: ChogTrait[], chogBadgeTier = 0, identity: { chainId?: number; collection?: string; rank?: number; now?: number } = {}): GameState {
  const rank = identity.rank ?? 1969
  const tier = rankToTier(rank)
  const { stats, appearance, startingZone } = mapTraitsToCharacter(traits, tokenId)
  const unlockedZones = [...new Set<ZoneId>([...tierToUnlockedZones(tier), 5])]
  const fresh:GameState = {
    daily:newDaily(identity.now??Date.now()),
    routine:newRoutine(),
    life:newLife(),
    home:{...DEFAULT_ESTATE},location:{...DEFAULT_LOCATION},
    profile:{...DEFAULT_PROFILE},
    version: 2, chainId: identity.chainId ?? 10143, collection: (identity.collection ?? '0x32a325b0640594377d0708ca9081c93da95e1908').toLowerCase(), walletAddress, tokenId,
    registeredLot: null, registeredOnChain: false, currentZone: unlockedZones.includes(startingZone) ? startingZone : 0,
    meters: { ...ADDED_NEEDS, hunger: 100, energy: 100, social: 75, reputation: 50, housingTier: tierToHousingLevel(tier) },
    gChog: tierToStartingFunds(tier), upkeepCarry: 0, lastSaved: identity.now ?? Date.now(), stats, appearance,
    rarityTier: tier, rarityRank: rank, rarityVerified: identity.rank !== undefined, chogBadgeTier, unlockedZones,
    action: null, job: null, sequence: 0, cooldowns: {}, xp: 0, completedWork: 0, upgrades: 0, quests: [], streak: 0,
    lastMessage: identity.rank ? 'Welcome home.' : 'Collection rarity is awaiting a verified source manifest. Basic starting package assigned.',
  }
  fresh.home=estateDefault(fresh);fresh.location={...DEFAULT_LOCATION,tile:frontDoor(fresh.home)}
  return fresh
}
export function isDegenSpiral(meters: GameMeters): boolean { return meters.hunger < 20 && meters.social < 20 }
export function isChogLegend(meters: GameMeters): boolean { return meters.reputation >= 400 }
export function meterColor(value: number, max: number): string { return value / max > 0.6 ? '#4ade80' : value / max > 0.3 ? '#f59e0b' : '#f87171' }
export function upgradeCost(state: GameState,gas:EngineContext['gas']={}): number { return cityPrice(200 * (state.meters.housingTier + 1),state.currentZone,gas[state.currentZone]) }
export function actionCost(state:GameState,kind:ActionKind,gas:EngineContext['gas']={}):number { return cityPrice(ACTIONS[kind].cost,state.currentZone,gas[state.currentZone]) }
export function dailyCost(state: GameState, ctx: EngineContext, at = ctx.now): number {
  return computeDailyCost(ZONES[state.currentZone], ctx.gas[state.currentZone] ?? null, state.rarityRank, getEventMultiplier(getTodaysEvent(at), state.currentZone, 'cost', at))
}
function message(s: GameState, text: string): GameState { return { ...s, lastMessage: text } }
function income(s: GameState, base: number, now: number): GameState {
  const event = getEventMultiplier(getTodaysEvent(now), s.currentZone, 'income', now)
  const amount = Math.round(base * s.stats.incomeMultiplier * (1+partnerBonus(s)) * event * (isDegenSpiral(s.meters) ? 0.4 : 1))
  return { ...s, gChog: s.gChog + amount, xp: s.xp + 20, completedWork: s.completedWork + 1,
    meters: { ...s.meters, reputation: Math.min(500, s.meters.reputation + 8) }, lastMessage: `Job complete: +${amount} gCHOG, +20 XP, +8 reputation.` }
}
function completeAction(s: GameState, at: number): GameState {
  const action = s.action!
  let next: GameState = { ...s, action: null, meters: { ...s.meters }, lastMessage: `${ACTIONS[action.kind].label} complete.` }
  if (action.kind === 'eat' || action.kind === 'snack') next.meters.hunger = Math.min(100, next.meters.hunger + (action.kind==='eat'?35:15))
  if (action.kind === 'rest' || action.kind === 'sleep' || action.kind === 'unwind') next.meters.energy = Math.min(100, next.meters.energy + (action.kind==='sleep'?100:action.kind==='unwind'?20:40 + next.meters.housingTier*2))
  if(action.kind==='wash'||action.kind==='shower')next.meters.hygiene=Math.min(100,next.meters.hygiene+(action.kind==='shower'?80:60))
  if(action.kind==='shower')next.meters.comfort=Math.min(100,next.meters.comfort+10)
  if(action.kind==='unwind'){next.meters.fun=Math.min(100,next.meters.fun+35);next.meters.comfort=Math.min(100,next.meters.comfort+15)}
  if(action.kind==='relax'){next.meters.comfort=Math.min(100,next.meters.comfort+40);next.meters.fun=Math.min(100,next.meters.fun+15)}
  if(action.kind==='rest'||action.kind==='sleep')next.meters.comfort=Math.min(100,next.meters.comfort+(action.kind==='sleep'?40:20))
  if (action.kind === 'socialize') {
    next.meters.social = Math.min(100, next.meters.social + s.stats.socialGainRate * getEventMultiplier(getTodaysEvent(at), s.currentZone, 'social', at))
    next.cooldowns = { ...s.cooldowns, socialize: at + 15000 }
  }
  if (action.kind === 'work' || action.kind === 'focus' || action.kind === 'hermit') {
    next = income(next, action.kind === 'work' ? 100 : action.kind === 'focus' ? 250 : (s.currentZone + 1) * 5, at)
    if (action.kind === 'hermit' && next.meters.energy >= 10) {
      next.meters.energy -= 10
      next.action = { ...action, startedAt: at, endsAt: at + 60000 }
    }
  }
  next=completeLifeAction(next,action.kind,action.id,at,action.mealRecipe)
  if(action.kind==='cookBreakfast'||action.kind==='cookStew')next=recordDaily(next,'cook',at)
  if(action.kind==='practiceCoding'||action.kind==='paint'||action.kind==='unwind')next=recordDaily(next,'practice',at)
  if(action.kind==='npcHangout'&&action.npcId)next=completeHangout(next,action.npcId,at)
  return finishChogProduction(next,action.chogGood,action.kind,action.id)
}
function beginActivity(s:GameState,kind:ActionKind,ctx:EngineContext,objectId?:string):GameState{
 const cost=actionCost(s,kind,ctx.gas),energy=kind==='focus'?20:kind==='work'||kind==='hermit'?10:kind==='paint'||kind==='practiceCoding'?5:0
 if(s.gChog<cost)return message(s,'Not enough gCHOG for this activity.')
 if(s.meters.energy<energy)return message(s,'Rest before working. You need more energy.')
 if((s.cooldowns[kind]??0)>ctx.now)return message(s,'This action is cooling down.')
 const reason=lifeActionReason(s,kind,ctx.now);if(reason)return message(s,reason)
 const consumed=consumeLifeAction(s,kind,ctx.now);s=consumed.state;const production=beginChogProduction(s,kind);s=production.state
 return {...s,gChog:s.gChog-cost,sequence:s.sequence+1,meters:{...s.meters,energy:s.meters.energy-energy},action:{id:s.sequence+1,kind,objectId,...(production.good?{chogGood:production.good}:{}),mealRecipe:consumed.mealRecipe,startedAt:ctx.now,endsAt:ctx.now+ACTIONS[kind].duration},lastMessage:`${ACTIONS[kind].label}…`}
}
function arriveIndoor(s:GameState,ctx:EngineContext):GameState{
 const h=s.household;if(!h)return s
 if(h.journey&&h.journey.endsAt<=ctx.now){s={...s,household:{...h,humanTile:h.journey.path[h.journey.path.length-1]??h.humanTile,journey:null}}}
 const pending=s.household!.pendingUse
 if(pending&&pending.arrivesAt<=ctx.now){const b=activeBlueprint(s),o=b.objects.find(o=>o.id===pending.objectId&&!o.stored);s={...s,household:{...s.household!,pendingUse:null}};if(!o||b.version!==pending.layoutVersion||!(FURNITURE[o.type].actions as readonly string[]).includes(pending.kind))return message(s,'The selected object changed. Choose another activity.');return beginActivity(s,pending.kind,ctx,o.id)}
 return s
}
function advanceRoutine(s:GameState,ctx:EngineContext,autonomous:boolean):GameState{
 s=ensureRoutine(s)
 if(s.buildMode||s.action||s.job||s.household?.journey||s.household?.pendingUse||s.location.journey||s.location.trip)return s
 let queue=[...s.routine!.queue]
 while(queue.length){
  const q=queue.shift()!;s={...s,routine:{...s.routine!,queue}}
  if(!intentValid(s,q)){s=message(s,'A queued object moved or your location changed. That intention was removed.');continue}
  return arriveIndoor(queueObject(s,q.objectId,q.kind,ctx.now),ctx)
 }
 if(autonomous){
  const q=autonomyChoice(s,ctx.now)
  if(q){s={...s,routine:{...s.routine!,nextAutonomyAt:ctx.now+30000}};return arriveIndoor(queueObject(s,q.objectId,q.kind,ctx.now),ctx)}
 }
 return s
}
// One settlement clock, segmented at event and completion boundaries. Saving never changes it.
export function settle(state: GameState, ctx: EngineContext, offline = false): GameState {
  if(ctx.now<state.lastSaved)return state
  state=ensureChogEconomy(ensureRoutine(ensureLife(ensureNeeds(state))),ctx.now)
  state=refreshVenue(state.household?ensureHousehold(state):state)
  const trip=state.location.trip,previousZone=state.currentZone
  state=settleLocation(state,ctx.now)
  if(trip&&!state.location.trip&&state.currentZone!==previousZone)state=recordDaily(state,'travel',trip.endsAt)
  if (ctx.now <= state.lastSaved) return ctx.now===state.lastSaved?ensureDaily(advanceRoutine(arriveIndoor(state,ctx),ctx,!offline),ctx.now):state
  const end = ctx.now
  let cursor = offline ? Math.max(state.lastSaved, end - 8 * REAL_HOUR) : state.lastSaved
  let s: GameState = { ...state, meters: { ...state.meters } }
  s=advanceRoutine(s,{...ctx,now:cursor},!offline)
  const offlineBudget = state.gChog * 0.25
  let charged = 0
  const passiveCutoff = state.lastSaved + 30 * 60000
  // An interrupted foreground task may complete once; passive income is bounded to 30 minutes.
  if (offline && s.action?.kind === 'hermit' && s.action.endsAt < cursor) s.action = null
  while (cursor < end) {
    const eventEnd = getTodaysEvent(cursor).endsAt
    const actionEnd = s.action?.endsAt ?? Infinity
    const jobEnd = s.job?.kind === 'validator' ? s.job.endsAt : Infinity
    const arrival=s.household?.pendingUse?.arrivesAt??s.household?.journey?.endsAt??Infinity
    const boundary = Math.min(end, eventEnd, Math.max(cursor, actionEnd), Math.max(cursor, jobEnd),Math.max(cursor,arrival))
    const hours = Math.max(0, boundary - cursor) / REAL_HOUR * SIMULATION_SPEED
    const decay = s.stats.meterDecayMultiplier
    s.meters.hunger = Math.max(0, s.meters.hunger - hours * 4 * decay)
    s.meters.energy = Math.max(0, s.meters.energy - hours * 3 * decay)
    s.meters.social = Math.max(0, s.meters.social - hours * 2 * decay)
    s.meters.hygiene = Math.max(0,s.meters.hygiene-hours*2.5*decay)
    s.meters.fun = Math.max(0,s.meters.fun-hours*3*decay)
    s.meters.comfort = Math.max(0,s.meters.comfort-hours*2*decay)
    const raw = dailyCost(s, ctx, cursor) * hours / 24 + s.upkeepCarry
    const charge = Math.min(s.gChog, Math.floor(raw), offline ? Math.max(0, Math.floor(offlineBudget - charged)) : Infinity)
    s.gChog -= charge; charged += charge; s.upkeepCarry = raw % 1
    cursor = boundary
    if (s.action && s.action.endsAt <= cursor) {
      if (offline && s.action.kind === 'hermit' && cursor > passiveCutoff) s.action = null
      else s = completeAction(s, cursor)
    }
    if (s.job?.kind === 'validator' && s.job.endsAt <= cursor) {
      const job = s.job
      s = income({ ...s, job: null, cooldowns: { ...s.cooldowns, validator: cursor + 60000 } }, job.score * 2, cursor)
    }
    s=arriveIndoor(s,{...ctx,now:cursor})
    s=advanceRoutine(s,{...ctx,now:cursor},!offline)
  }
  if(s.household){const hours=Math.min(ctx.now-state.lastSaved,8*REAL_HOUR)/REAL_HOUR*SIMULATION_SPEED,p=s.household.pet;s={...s,household:{...s.household,pet:{...p,hunger:Math.max(20,p.hunger-hours*2),affection:Math.max(20,p.affection-hours),energy:Math.min(100,p.energy+hours)}}}}
  return { ...ensureDaily(settleMeals(s,end),end), lastSaved: end }
}
export function blockIsValid(seed: number, index: number): boolean {
  return ((Math.imul(seed ^ (index + 1), 1664525) + 1013904223) >>> 0) % 10 >= 4
}
export function reduceGame(state: GameState, command: Command, ctx: EngineContext): GameState {
  // Pause queued/autonomous care before settling the mode-entry command.
  if(command.type==='setBuildMode'&&command.enabled&&state.location.kind==='home'&&!state.location.venue&&!state.location.host&&!state.action&&!state.job&&!state.household?.journey&&!state.household?.pendingUse)state={...state,buildMode:true}
  let s = settle(state, ctx)
  const now = Math.max(ctx.now, s.lastSaved)
  if(s.location.trip&&command.type!=='tick'&&command.type!=='cancel')return message(s,'Enjoy the journey. Your tram is still in transit.')
  if(s.buildMode&&['moveIndoor','useObject','enqueueAction','carePet','startAction','startJob','walk','leaveHome','enterHome','enterVenue','travel','ration'].includes(command.type))return message(s,'Finish Build mode to resume playing.')
  switch (command.type) {
    case 'buyChogMaterials':case 'upgradeChogWorkshop':case 'setChogProduction':case 'deliverChogGoods':return manageChogEconomy(s,command,n=>cityPrice(n,s.currentZone,ctx.gas[s.currentZone]),now)
    case 'setBuildMode':{
      if(!command.enabled)return {...s,buildMode:false,lastMessage:'Back to life. Click objects for activities.'}
      if(s.location.kind!=='home'||s.location.venue||s.location.host||s.currentZone!==s.home.city||s.action||s.job||s.household?.journey||s.household?.pendingUse)return message({...s,buildMode:false},'Return home and finish walking or activities before building.')
      return {...s,buildMode:true,lastMessage:'Build mode: drag furniture inside your home. Finish building to play.'}
    }
    case 'claimDaily':return claimDaily(s,command.id,now)
    case 'enqueueAction':return advanceRoutine(enqueueIntent(s,command.objectId,command.kind),{...ctx,now},true)
    case 'setAutonomy':return {...s,routine:{...s.routine!,autonomy:command.enabled,nextAutonomyAt:now},lastMessage:command.enabled?'Autonomy on: free care at home; your queued choices go first.':'Autonomy off. You decide what happens next.'}
    case 'clearQueue':return {...s,routine:{...s.routine!,queue:[],nextAutonomyAt:now+30000},lastMessage:'Waiting intentions cleared. Your current activity continues.'}
    case 'removeIntent':return {...s,routine:{...s.routine!,queue:s.routine!.queue.filter(q=>q.id!==command.id)}}
    case 'reorderIntent':{const queue=[...s.routine!.queue],i=queue.findIndex(q=>q.id===command.id),next=i+(command.direction==='up'?-1:1);if(i>=0&&next>=0&&next<queue.length)[queue[i],queue[next]]=[queue[next],queue[i]];return {...s,routine:{...s.routine!,queue}}}
    case 'buyGroceries':return buyGroceries(s,command.pack,cityPrice(GROCERIES[command.pack].price,s.currentZone,ctx.gas[s.currentZone]))
    case 'startProject':case 'claimProject':return projectCommand(s,command.id,command.type==='claimProject')
    case 'enterVenue':{
      if(s.location.kind!=='street'||s.currentZone===5||s.location.journey||s.action||s.job)return message(s,'Finish your walk before entering a venue.')
      const index=VENUE_SERVICE_INDEX[command.venue]
      if(distance(s.location.tile,SERVICES[index].approach)>1)return message(s,'Walk to the venue entrance first.')
      s=ensureHousehold(s);const blueprint=venueBlueprint(s.currentZone as Exclude<ZoneId,5>,command.venue)
      return message({...s,household:{...s.household!,humanTile:entryTile(blueprint),journey:null,pendingUse:null},location:{...s.location,kind:'home',venue:placeKey(s.currentZone,command.venue),interior:blueprint,journey:null}},'Step inside. Select an object or meet someone nearby.')
    }
    case 'talkNpc':{
      const npc=npcById(command.npcId),h=s.household
      if(!npc||!h||s.currentZone!==npc.city||venueOf(s.location.venue)!==npc.venue||s.action||s.job||h.journey||distance(h.humanTile,npc)>2)return message(s,'Walk closer to this person inside their venue first.')
      const previous=h.relationships[npc.id],repeat=previous&&now-previous.lastMet<15000
      if(repeat)return message(s,`${npc.name} is enjoying the moment. Try another activity together first.`)
      if(command.topic==='hangout'){
        const reason=hangoutReason(s,npc.id,now);if(reason)return message(s,reason)
        return {...s,sequence:s.sequence+1,action:{id:s.sequence+1,kind:'npcHangout',npcId:npc.id,startedAt:now,endsAt:now+ACTIONS.npcHangout.duration},lastMessage:`Spending a little time with ${npc.name}…`}
      }
      if(command.topic==='gift'){
        const reason=lifeActionReason(s,'eatLeftovers',now);if(reason)return message(s,'Cook a fresh meal before sharing a gift.')
        s=consumeLifeAction(s,'eatLeftovers',now).state
        const friendship=Math.min(100,(previous?.friendship??0)+12)
        return recordDaily({...s,meters:{...s.meters,social:Math.min(100,s.meters.social+10)},household:{...h,relationships:{...h.relationships,[npc.id]:{friendship,meetings:(previous?.meetings??0)+1,lastMet:now,memory:'gift'}}},lastMessage:`${npc.name} loved your home-cooked gift. Friendship ${friendship}/100.`},'social',now)
      }
      const friendship=Math.min(100,(previous?.friendship??0)+(previous?.memory===command.topic?3:8)),memory=command.topic
      return message(recordDaily({...s,xp:s.xp+(previous?0:5),meters:{...s.meters,social:Math.min(100,s.meters.social+8)},household:{...h,relationships:{...h.relationships,[npc.id]:{friendship,meetings:(previous?.meetings??0)+1,lastMet:now,memory}}}},'social',now),`${npc.name}: ${command.topic==='hobby'?`I love ${npc.interest}.`:command.topic==='chogs'?'Your Chog is welcome here anytime.':command.topic==='story'?'We should meet here again.':'It’s lovely to meet you!'} Friendship ${friendship}/100.`)
    }
    case 'moveIndoor':if(s.location.kind==='street')return message(s,'Enter a building before walking inside.');return queueIndoor(s,command.target,now)
    case 'useObject':if(s.location.kind==='street')return message(s,'Enter the building before using its objects.');return arriveIndoor(queueObject(s,command.objectId,command.kind,now),{...ctx,now})
    case 'buyFurniture':case 'moveFurniture':case 'storeFurniture':case 'sellFurniture':case 'expandRoom':case 'editWall':return editHousing(s,command,n=>cityPrice(n,s.home.city,ctx.gas[s.home.city]))
    case 'carePet':{
      s=ensureHousehold(s);const h=s.household!,p=h.pet
      if(command.kind==='follow')return message({...s,household:{...h,pet:{...p,following:!p.following}}},p.following?'Your Chog is resting at home.':'Your Chog will follow you.')
      if(s.action||s.job||s.location.journey||h.journey)return message(s,'Finish your activity before caring for your Chog.')
      if(p.lastCare&&now-p.lastCare<12000)return message(s,'Give your Chog a moment before another activity.')
      if(command.kind==='feed'&&s.location.kind==='home'&&!s.location.venue&&!h.blueprint.objects.some(o=>o.type==='bowl'&&!o.stored))return message(s,'Place a Chog bowl at home, or use the communal pet care in a city park.')
      if(s.location.kind==='visit')return message(s,'Care for your Chog at home or in the park.')
      if(s.location.venue&&venueOf(s.location.venue)!=='park')return message(s,'Take your Chog home or to the park for pet care.')
      if(s.location.kind==='street'&&distance(s.location.tile,SERVICES[2].approach)>1)return message(s,'Walk to the park to care for your Chog outside.')
      const cost=command.kind==='feed'?cityPrice(8,s.currentZone,ctx.gas[s.currentZone]):0
      if(s.gChog<cost)return message(s,'Not enough household gCHOG for pet food.')
      return message(recordDaily({...s,meters:{...s.meters,fun:command.kind==='play'?Math.min(100,s.meters.fun+15):s.meters.fun},gChog:s.gChog-cost,household:{...h,pet:{...p,hunger:command.kind==='feed'?Math.min(100,p.hunger+35):p.hunger,affection:Math.min(100,p.affection+(command.kind==='play'?25:15)),energy:command.kind==='play'?Math.max(20,p.energy-5):p.energy,bond:Math.min(100,p.bond+3),lastCare:now,lastActivity:command.kind}}},'pet',now),command.kind==='feed'?'Your Chog enjoyed a fresh bowl of food.':command.kind==='play'?'A little playtime. Your Chog’s bond grew.':'Your Chog leans into your hand. Bond +3.')
    }
    case 'setProfile': {
      const profile=parseProfile(command.profile)
      return profile?message({...s,profile},'Resident profile saved.'):message(s,'Check the profile fields and try again.')
    }
    case 'tick': return s
    case 'leaveHome': {
      if(s.action||s.job||s.household?.journey)return message(s,'Finish or cancel your activity before going outside.')
      if(s.location?.kind==='street')return s
      return message({...s,location:{kind:'street',tile:s.location?.kind==='visit'||s.location.venue?s.location.tile:frontDoor(s.home),district:s.location.venue||s.location.kind==='visit'?s.location.district??0:s.home.district,journey:null}},'Fresh air. Tap the pavement to walk, or select a building.')
    }
    case 'walk': {
      if(s.location?.kind!=='street'||s.action||s.job||s.location.trip)return message(s,'Finish your current activity or walk first.')
      const origin=journeyTile(s.location,now)
      const path=streetPath(origin,command.target)
      if(!path)return message(s,'That place is blocked. Choose a sidewalk or a front door.')
      if(!path.length)return {...s,location:{...s.location,tile:origin,journey:null}}
      return {...s,location:{...s.location,tile:origin,journey:{from:origin,path,startedAt:now,endsAt:now+path.length*STEP_MS}},lastMessage:'Walking through the neighborhood…'}
    }
    case 'enterHome': {
      if(s.location?.kind!=='street'||s.location.journey||s.action||s.job)return message(s,'Finish walking before entering a home.')
      if(command.host)return message(s,'Shared visits require the neighborhood service.')
      if(s.currentZone!==s.home.city||distance(s.location.tile,frontDoor(s.home))>1)return message(s,'Walk to your front door first.')
      return message({...s,household:s.household?{...s.household,humanTile:entryTile(s.household.blueprint),journey:null,pendingUse:null}:undefined,location:{kind:'home',tile:frontDoor(s.home),journey:null}},'Welcome home.')
    }
    case 'decorate': {
      if(s.location?.kind==='visit')return message(s,'You can customize your own home only.')
      return message({...s,home:{...s.home,style:command.style,open:command.open}},'Home style and visitor settings saved.')
    }
    case 'buyLand':case 'offerLand':case 'respondOffer':case 'gesture':return message(s,'Connect your NFT to use the shared property and social service.')
    case 'registration': return { ...s, registeredLot: command.lot, registeredOnChain: command.lot !== null }
    case 'cancel':{
      if(s.location.trip){if(now-s.location.trip.startedAt>2000)return message(s,'The tram has departed. You will arrive shortly.');return message({...s,gChog:s.gChog+s.location.trip.fare,location:{...s.location,trip:undefined}},'Journey cancelled before boarding. Your fare was returned.')}
      return message({ ...stopIndoor(s,now),routine:{...s.routine!,queue:[],nextAutonomyAt:now+30000}, action: null, job: null, location:s.location?.journey?{...s.location,tile:journeyTile(s.location,now),journey:null}:s.location }, 'Action canceled. Consumed food and energy are not refunded.')
    }
    case 'startAction': {
      if(s.household&&s.location.kind!=='street')return message(s,'Select an actual object in this room to start an activity.')
      if (s.action || s.job) return message(s, 'Finish or cancel your current activity first.')
      if(s.location?.journey)return message(s,'Finish walking before starting an activity.')
      if(s.location?.kind==='street'&&!SERVICES.some(service=>service.actions.includes(command.kind)&&distance(s.location.tile,service.approach)<=1))return message(s,'Walk to the appropriate city service first.')
      const cost=actionCost(s,command.kind,ctx.gas)
      if ((s.cooldowns[command.kind] ?? 0) > now) return message(s, 'This action is cooling down.')
      if ((command.kind === 'work' || command.kind === 'focus' || command.kind === 'hermit') && s.meters.energy < (command.kind==='focus'?20:10)) return message(s, `Rest before working. You need ${command.kind==='focus'?20:10} energy.`)
      if (s.gChog < cost) return message(s, 'Not enough gCHOG. Emergency rations are available below 20 hunger.')
      return beginActivity(s,command.kind,{...ctx,now})
    }
    case 'travel': {
      if(s.household){
        if(s.action||s.job||s.location.journey||s.household.journey)return message(s,'Finish your current activity before traveling.')
        if(command.zone===s.currentZone)return message(s,'You are already in this city.')
        if(command.zone!==s.home.city&&command.zone!==5&&(s.location.kind!=='street'||distance(s.location.tile,SERVICES[3].approach)>1))return message(s,'Walk to the tram station before traveling to another city.')
        const fare=command.zone===s.home.city||command.zone===5?0:travelCost(s.currentZone,command.zone,ctx.gas[command.zone])
        if(s.gChog<fare)return message(s,`This trip costs ${fare} gCHOG. Returning home is free.`)
        return message({...s,gChog:s.gChog-fare,location:{kind:'street',district:s.location.district??s.home.district,tile:{x:29,y:3},journey:null,trip:{zone:command.zone,startedAt:now,endsAt:now+10000+Math.abs(command.zone-s.currentZone)*1000,fare}}},`Boarding for ${ZONES[command.zone].name}. Your Chog’s household travels with you.`)
      }
      if (s.action || s.job || s.location?.journey) return message(s, 'Finish or cancel your activity before traveling.')
      if (!s.unlockedZones.includes(command.zone)) return message(s, 'Earn XP to unlock this district.')
      const cost = command.zone===s.home.city?0:travelCost(s.currentZone, command.zone,ctx.gas[command.zone])
      if (s.gChog < cost) return message(s, `Travel costs ${cost} gCHOG. Returning home is free.`)
      return message({ ...s, currentZone: command.zone, gChog: s.gChog - cost,location:{kind:command.zone===5?'home':'street',tile:{x:29,y:3},journey:null} }, `Welcome to ${ZONES[command.zone].name}.`)
    }
    case 'ration': {
      if (s.gChog >= 20 || s.meters.hunger >= 20) return message(s, 'Rations are reserved for residents below 20 hunger and 20 gCHOG.')
      if ((s.cooldowns.ration ?? 0) > now) return message(s, 'A ration is available every five minutes.')
      return message({ ...s, meters: { ...s.meters, hunger: Math.min(100, s.meters.hunger + 35) }, cooldowns: { ...s.cooldowns, ration: now + 300000 } }, 'Community ration received. Rest and social care are always free.')
    }
    case 'upgrade': {
      if(s.household){
        if(s.location.kind!=='home'||s.location.venue||s.action||s.job||s.household.journey)return message(s,'Return home and finish your activity before improving the house.')
        const b=s.household.blueprint,next={...b,width:b.width+1,version:b.version+1}
        if(!validBlueprint(next)||next.width*next.height>64*s.home.plots.length)return message(s,'Buy adjacent land or customize your existing rooms in Build & Buy.')
        if(s.meters.housingTier>=5||s.gChog<upgradeCost(s,ctx.gas))return message(s,'Save more household gCHOG for this improvement.')
        return message({...s,gChog:s.gChog-upgradeCost(s,ctx.gas),household:{...s.household,blueprint:next},meters:{...s.meters,housingTier:s.meters.housingTier+1},upgrades:s.upgrades+1,xp:s.xp+50},'Home improved! A new strip of usable floor is ready.')
      }
      if (s.meters.housingTier >= 5) return message(s, 'Your home is fully upgraded.')
      if (s.gChog < upgradeCost(s,ctx.gas)) return message(s, `Your next home improvement costs ${upgradeCost(s,ctx.gas)} gCHOG.`)
      return message({ ...s, gChog: s.gChog - upgradeCost(s,ctx.gas), meters: { ...s.meters, housingTier: s.meters.housingTier + 1 }, upgrades: s.upgrades + 1, xp: s.xp + 50 }, 'Home improved! Your bed now restores more energy.')
    }
    case 'claimQuest': {
      const quest = QUESTS.find(q => q.id === command.id)
      if (!quest || s.quests.includes(quest.id) || !quest.ready(s)) return s
      return message({ ...s, quests: [...s.quests, quest.id], gChog: s.gChog + quest.reward }, `Quest complete: +${quest.reward} gCHOG.`)
    }
    case 'startJob': {
      if(s.household&&s.location.kind!=='street'){
        const b=activeBlueprint(s),desk=b.objects.find(o=>o.type==='desk'&&!o.stored)
        if(!desk||!houseWalkable(b,s.household.humanTile)||Math.abs(s.household.humanTile.x-desk.x)+Math.abs(s.household.humanTile.y-desk.y)>3)return message(s,'Walk to your study desk before starting this job.')
      }
      if (s.action || s.job || s.location?.journey) return message(s, 'Finish or cancel your current activity.')
      if(s.location?.kind==='street'&&distance(s.location.tile,SERVICES[1].approach)>1)return message(s,'Walk to the coworking club first.')
      if ((s.cooldowns[command.kind] ?? 0) > now) return message(s, 'Job cooldown active.')
      if (s.meters.energy < 10) return message(s, 'Rest first. Jobs need 10 energy.')
      if (command.kind === 'grifter' && (!command.openingWei || !/^\d+$/.test(command.openingWei) || !command.openingAt || now - command.openingAt > 5000 || command.openingAt > now || !command.prediction)) return message(s, 'A fresh live gas quote is required.')
      return { ...s, sequence: s.sequence + 1, meters: { ...s.meters, energy: s.meters.energy - 10 },
        job: { id: s.sequence + 1, kind: command.kind, startedAt: now, endsAt: now + (command.kind === 'validator' ? 20000 : 10000), zone: s.currentZone, seed: Math.floor(now % 2147483647), score: 0, clicked: [], openingWei: command.openingWei, openingAt: command.openingAt, prediction: command.prediction }, lastMessage: 'Job started.' }
    }
    case 'clickBlock': {
      const job = s.job
      if (!job || job.id !== command.sessionId || job.kind !== 'validator') return s
      const spawnAt = job.startedAt + command.index * 600
      if (!Number.isInteger(command.index) || command.index < 0 || command.index >= 33 || now < spawnAt || now >= spawnAt + 1500 || job.clicked.includes(command.index)) return s
      return { ...s, job: { ...job, clicked: [...job.clicked, command.index], score: Math.max(0, job.score + (blockIsValid(job.seed, command.index) ? 10 : -5)) } }
    }
    case 'resolveGrifter': {
      const job = s.job
      if (!job || job.kind !== 'grifter' || job.id !== command.sessionId || now < job.endsAt) return s
      if (command.stale || command.wei === null || !/^\d+$/.test(command.wei) || command.fetchedAt < job.endsAt || command.fetchedAt > now || now - command.fetchedAt > 5000) return message({ ...s, job: null }, 'No fresh gas observation. Round void; no loss.')
      const close = BigInt(command.wei), open = BigInt(job.openingWei!)
      s = { ...s, job: null }
      if (close === open) return message(s, 'Gas unchanged. Round tied; streak preserved, no payout.')
      const correct = job.prediction === (close > open ? 'up' : 'down')
      if (!correct) return message({ ...s, streak: 0 }, 'Prediction missed. No gCHOG lost.')
      s = { ...s, streak: s.streak + 1 }
      return income(s, 60 * (1 + Math.min(s.streak, 3) * 0.5), now)
    }
  }
}
export function unlockEarnedZones(s: GameState): GameState {
  const unlockedZones = [...s.unlockedZones]
  for (const [zone, xp] of [[2, 100], [3, 200], [4, 300], [1, 400]] as const) if (s.xp >= xp && !unlockedZones.includes(zone)) unlockedZones.push(zone)
  return unlockedZones.length === s.unlockedZones.length ? s : { ...s, unlockedZones }
}
export const HOUSING_LABELS = ['Sheltered Nook', 'Shared Dorm', 'Compact Flat', 'High-Rise Apartment', 'Smart Contract Villa', 'Tower Penthouse']
export const TIER_LABELS: Record<string, string> = { genesis: 'Genesis', legendary: 'Legendary', rare: 'Rare', uncommon: 'Uncommon', common: 'Common', floor: 'Floor' }
