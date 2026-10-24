import { describe, expect, it } from 'vitest'
import { ACTIONS, blockIsValid, createNewGameState, reduceGame, settle, unlockEarnedZones } from '../src/game/gameEngine'
import { getEventMultiplier, getTodaysEvent, EVENT_DURATION_MS } from '../src/game/events'
import { loadGameState, restoreSave, saveGameState, storageKey } from '../src/game/persistence'
import { calculateRarity } from '../src/game/rarity'
import { computeDailyCost, ZONES } from '../src/game/zones'
import { findPath, OBJECTS, walkable } from '../src/world/navigation'
import { parseCommand } from '../server/commands'
import type { GameState } from '../src/game/types'
const initial=(now=0)=>createNewGameState('0x123',0,[{trait_type:'Body',value:'Green'}],0,{now})
const ctx=(now:number)=>({now,gas:{}})
const reduce=(s:GameState,c:Parameters<typeof reduceGame>[1],now=s.lastSaved)=>reduceGame(s,c,ctx(now))
describe('serialized simulation',()=>{
  it('preserves token zero and derives starting wealth solely from verified rarity',()=>{
    const low=initial(),whale=createNewGameState('x',0,[],4,{now:0})
    expect(low.tokenId).toBe(0);expect(low.rarityVerified).toBe(false);expect(low.gChog).toBe(100)
    expect(whale.gChog).toBe(low.gChog)
    expect(createNewGameState('x',9,[],0,{rank:1,now:0}).gChog).toBe(3200)
  })
  it('does not forgive decay when saving or dispatching frequent commands',()=>{
    let s=initial()
    for(let i=1;i<=3600;i++)s=reduce(s,{type:'tick'},i*1000)
    const once=settle(initial(),ctx(3600000))
    expect(s.meters.hunger).toBeCloseTo(once.meters.hunger,8)
    expect(s.gChog).toBe(once.gChog)
    expect(s.upkeepCarry).toBeCloseTo(once.upkeepCarry,8)
    expect(s.meters.hunger).toBeLessThan(initial().meters.hunger)
  })
  it('charges once, completes once, and preserves later earnings during callbacks',()=>{
    let s=reduce(initial(),{type:'startAction',kind:'eat'})
    expect(s.gChog).toBe(80)
    s=reduce(s,{type:'startAction',kind:'eat'});expect(s.gChog).toBe(80)
    s=reduce(s,{type:'tick'},ACTIONS.eat.duration)
    s=reduce(s,{type:'tick'},ACTIONS.eat.duration)
    expect(s.action).toBeNull();expect(s.gChog).toBe(80)
  })
  it('cancellation grants no work reward and does not refund consumed food',()=>{
    let s=reduce(initial(),{type:'startAction',kind:'eat'})
    s=reduce(s,{type:'cancel'},1000);expect(s.gChog).toBe(80)
    s=reduce(s,{type:'startAction',kind:'work'},1000)
    s=reduce(s,{type:'cancel'},2000)
    s=reduce(s,{type:'tick'},40000)
    expect(s.completedWork).toBe(0);expect(s.xp).toBe(0)
  })
  it('applies income modifiers once and makes reputation and upgrades attainable',()=>{
    const start=initial();start.stats={...start.stats,incomeMultiplier:2}
    let s=reduce(start,{type:'startAction',kind:'work'})
    s=reduce(s,{type:'tick'},20000)
    expect(s.gChog).toBe(300);expect(s.xp).toBe(20);expect(s.meters.reputation).toBe(58)
    s=reduce(s,{type:'claimQuest',id:'first_shift'});expect(s.gChog).toBe(360)
    s=reduce(s,{type:'claimQuest',id:'first_shift'});expect(s.gChog).toBe(360)
    s=reduce(s,{type:'upgrade'});expect(s.meters.housingTier).toBe(1);expect(s.gChog).toBe(160)
  })
  it('hermit credits the ledger across persisted sessions and caps offline earnings',()=>{
    let s=reduce(initial(),{type:'startAction',kind:'hermit'})
    s=restoreSave(JSON.stringify(s),initial())!
    s=settle(s,ctx(120000),true)
    expect(s.completedWork).toBe(2);expect(s.gChog).toBeGreaterThan(100)
    const long=settle(reduce(initial(),{type:'startAction',kind:'hermit'}),ctx(2*3600000),true)
    expect(long.completedWork).toBeLessThanOrEqual(30)
    expect(long.action).toBeNull()
  })
  it('bounds offline costs and retains housing through insolvency',()=>{
    const s=initial();s.gChog=1000;s.currentZone=1;s.meters.housingTier=4
    const next=settle(s,{now:48*3600000,gas:{1:10000}},true)
    expect(next.gChog).toBeGreaterThanOrEqual(750);expect(next.lastSaved).toBe(48*3600000);expect(next.meters.housingTier).toBe(4)
  })
  it('offers a recoverable zero-funds loop with cooldown-limited food and free travel',()=>{
    let s=initial();s.gChog=0;s.meters.hunger=0
    s=reduce(s,{type:'ration'},1000);expect(s.meters.hunger).toBe(35)
    s.meters.hunger=0;s=reduce(s,{type:'ration'},1001);expect(s.meters.hunger).toBeLessThan(1)
    s=reduce(s,{type:'travel',zone:5},1001);expect(s.currentZone).toBe(5)
    s=reduce(s,{type:'travel',zone:0},1001);expect(s.currentZone).toBe(0)
  })
  it('unlocks zones through earned progression without changing NFT rarity',()=>{
    const s=unlockEarnedZones({...initial(),xp:400})
    expect(s.unlockedZones.sort()).toEqual([0,1,2,3,4,5]);expect(s.rarityTier).toBe('floor')
  })
  it('ignores backward clocks',()=>{const s=initial(2000);expect(settle(s,ctx(1000))).toBe(s)})
})
describe('jobs and oracle fairness',()=>{
  it('rejects duplicate, early, expired and wrong-session validator input',()=>{
    let s=reduce(initial(),{type:'startJob',kind:'validator'})
    const id=s.job!.id
    s=reduce(s,{type:'clickBlock',index:4,sessionId:id},0);expect(s.job!.clicked).toEqual([])
    s=reduce(s,{type:'clickBlock',index:0,sessionId:id},100)
    const score=s.job!.score;s=reduce(s,{type:'clickBlock',index:0,sessionId:id},200);expect(s.job!.score).toBe(score)
    s=reduce(s,{type:'clickBlock',index:1,sessionId:id+1},800);expect(s.job!.clicked).toEqual([0])
    s=reduce(s,{type:'clickBlock',index:1,sessionId:id},3000);expect(s.job!.clicked).toEqual([0])
    const done=reduce(s,{type:'tick'},20000);expect(done.job).toBeNull();expect(reduce(done,{type:'tick'},20000).gChog).toBe(done.gChog)
    expect(blockIsValid(123,1)).toBe(blockIsValid(123,1))
  })
  it('voids stale rounds and treats unchanged exact wei as a tie',()=>{
    const start=reduce(initial(1000),{type:'startJob',kind:'grifter',openingWei:'1',openingAt:1000,prediction:'up'},1000)
    const command={type:'resolveGrifter' as const,sessionId:start.job!.id,wei:'1',fetchedAt:11000,stale:false}
    const tied=reduce(start,command,11000);expect(tied.gChog).toBe(100);expect(tied.completedWork).toBe(0);expect(tied.job).toBeNull()
    const stale=reduce(start,{...command,wei:'2',stale:true},11000);expect(stale.completedWork).toBe(0)
    const fresh=reduce(start,{...command,wei:'2'},11000);expect(fresh.completedWork).toBe(1);expect(fresh.gChog).toBeGreaterThan(100)
  })
  it('normalizes different chain gas scales and bounds congestion',()=>{
    expect(computeDailyCost(ZONES[2],0.001,1969)).toBeGreaterThan(1)
    expect(computeDailyCost(ZONES[1],1e9,1969)).toBe(720)
    expect(computeDailyCost(ZONES[5],1e9,1969)).toBe(0)
  })
  it('scopes event effects and segments settlement at UTC boundaries',()=>{
    const event=getTodaysEvent(0)
    expect(getEventMultiplier(event,0,'income',0)).toBe(1)
    expect(getEventMultiplier(event,0,'cost',0)).toBe(2)
    expect(getEventMultiplier(event,0,'cost',event.endsAt)).toBe(1)
    const s=initial(EVENT_DURATION_MS-1000)
    const split=settle(settle(s,ctx(EVENT_DURATION_MS)),ctx(EVENT_DURATION_MS+1000))
    expect(settle(s,ctx(EVENT_DURATION_MS+1000)).gChog).toBe(split.gChog)
    expect(getTodaysEvent(EVENT_DURATION_MS).target).toBe('income')
  })
})
describe('save integrity and identity',()=>{
  it('does not change simulation time while saving and follows NFT across wallet changes locally',()=>{
    const store=new Map<string,string>(),storage={getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>{store.set(key,value)}}
    const s=initial(1234);saveGameState(s,storage)
    expect(JSON.parse(store.get(storageKey(s))!).lastSaved).toBe(1234)
    const identity={...initial(),walletAddress:'new-owner'}
    const loaded=loadGameState(identity,storage).state
    expect(loaded.walletAddress).toBe('new-owner');expect(loaded.lastSaved).toBe(1234)
  })
  it('rejects corrupt, cross-collection and future-schema saves and preserves recovery data',()=>{
    const s=initial()
    expect(restoreSave(JSON.stringify({...s,version:99}),s)).toBeNull()
    expect(restoreSave(JSON.stringify({...s,collection:'other'}),s)).toBeNull()
    expect(restoreSave(JSON.stringify({...s,gChog:-10}),s)).toBeNull()
    expect(restoreSave('{',s)).toBeNull()
    const store=new Map([[storageKey(s),'{']]),storage={getItem:(key:string)=>store.get(key)??null,setItem:(key:string,v:string)=>{store.set(key,v)}}
    expect(loadGameState(s,storage).warning).toBeTruthy();expect(store.get(`${storageKey(s)}_recovery`)).toBe('{')
  })
  it('migrates v1 fields while rejecting serialized appearance and registration authority',()=>{
    const s=initial();const restored=restoreSave(JSON.stringify({...s,version:undefined,registeredOnChain:true,stats:{incomeMultiplier:999},appearance:{bodyColor:'invented'}}),s)!
    expect(restored.registeredOnChain).toBe(false);expect(restored.stats.incomeMultiplier).toBe(s.stats.incomeMultiplier);expect(restored.meters.energy).toBe(100)
  })
})
describe('source rarity, navigation and server input',()=>{
  it('gives identical traits identical rank and scores absence explicitly',()=>{
    const metadata=(attributes:{trait_type:string;value:string}[])=>({name:'Chog',image:'ipfs://art',attributes})
    const tokens=[{tokenId:0,uri:'a',sha256:'a',metadata:metadata([{trait_type:'Hat',value:'Gold'}])},{tokenId:1,uri:'b',sha256:'b',metadata:metadata([{trait_type:'Hat',value:'Cap'}])},{tokenId:2,uri:'c',sha256:'c',metadata:metadata([{trait_type:'hat',value:'cap'}])}]
    const ranks=calculateRarity(tokens)
    expect(ranks.get(0)!.rank).toBe(1);expect(ranks.get(1)!.rank).toBe(ranks.get(2)!.rank)
    expect(calculateRarity([...tokens].reverse()).get(0)).toEqual(ranks.get(0))
  })
  it('routes to all approach tiles without entering furniture footprints',()=>{
    for(const object of OBJECTS){const path=findPath({x:3,y:3},object.approach)!;expect(path).not.toBeNull();expect(path.every(walkable)).toBe(true);expect(path[path.length-1]).toEqual(object.approach);expect(findPath({x:3,y:3},object.tile)).toBeNull()}
    expect(findPath({x:3,y:3},{x:30,y:30})).toBeNull()
  })
  it('rejects client reward authority and malformed commands',()=>{
    expect(()=>parseCommand({type:'registration',lot:0})).toThrow()
    expect(()=>parseCommand({type:'earn',amount:1e9})).toThrow()
    expect(()=>parseCommand({type:'travel',zone:1.5})).toThrow()
    expect(parseCommand({type:'startJob',kind:'grifter',prediction:'up',openingWei:'invented'})).toEqual({type:'startJob',kind:'grifter',prediction:'up'})
    expect(parseCommand({type:'resolveGrifter',wei:'999'})).toEqual({type:'tick'})
  })
})

describe('source proof mapping',()=>{
  it('verifies ordered original-to-copy proofs including an odd-sized tree',async()=>{
    const {buildFaucetManifest,verifySourceProof}=await import('../src/game/faucetManifest')
    const source={version:1 as const,chainId:143 as const,collection:'0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763',snapshotBlock:1,scoring:'trait-frequency-v1' as const,tokens:[1462,9,0].map(tokenId=>({tokenId,uri:`ipfs://source/${tokenId}.json`,sha256:'a'.repeat(64),metadata:{name:'Chog',image:'ipfs://art',attributes:[{trait_type:'Hat',value:'Cap'}]}}))}
    const manifest=buildFaucetManifest(source,true)
    for(const [index,claim] of manifest.claims.entries()){
      expect(verifySourceProof(manifest.root,index,claim.originalId,claim.uri,claim.proof)).toBe(true)
      expect(verifySourceProof(manifest.root,index,claim.originalId,'ipfs://wrong',claim.proof)).toBe(false)
    }
    expect(manifest.claims[0].originalId).toBe(1462)
  })
})

describe('object action choices',()=>{
  it('supports a cheaper snack, full sleep, focused work and quiet reading',()=>{
    let s=initial();s.meters.hunger=20;s.meters.energy=30
    s=reduce(s,{type:'startAction',kind:'snack'});expect(s.gChog).toBe(90)
    s=reduce(s,{type:'tick'},3000);expect(s.meters.hunger).toBeGreaterThan(34)
    s=reduce(s,{type:'startAction',kind:'sleep'},3000)
    const restedAt=3000+ACTIONS.sleep.duration,workedAt=restedAt+ACTIONS.focus.duration
    s=reduce(s,{type:'tick'},restedAt);expect(s.meters.energy).toBe(100)
    s=reduce(s,{type:'startAction',kind:'focus'},restedAt);expect(s.meters.energy).toBe(80)
    s=reduce(s,{type:'tick'},workedAt);expect(s.completedWork).toBe(1);expect(s.gChog).toBe(340)
    s=reduce(s,{type:'startAction',kind:'unwind'},workedAt)
    s=reduce(s,{type:'tick'},workedAt+ACTIONS.unwind.duration);expect(s.meters.energy).toBeGreaterThan(99)
  })
  it('maps every activity to reachable furniture and explains action availability',async()=>{
    const {furnitureFor,unavailableReason}=await import('../src/world/interactions')
    for(const kind of Object.keys(ACTIONS) as (keyof typeof ACTIONS)[]){
      const object=OBJECTS.find(o=>o.kind===furnitureFor(kind))!
      expect(findPath({x:3,y:3},object.approach)).not.toBeNull()
    }
    expect(unavailableReason({...initial(),gChog:0},'eat')).toMatch('Not enough')
    const tired=initial();tired.meters.energy=10
    expect(unavailableReason(tired,'focus')).toMatch('20 energy')
    expect(unavailableReason(tired,'sleep')).toBeNull()
  })
})

describe('resident identity and five-city economy',()=>{
  it('keeps gender independent from NFT appearance, wealth and rarity and persists it',()=>{
    const original=initial()
    const profile={name:'Prickle',gender:'nonbinary' as const,genderLabel:'',pronouns:'they/them'}
    const changed=reduce(original,{type:'setProfile',profile})
    expect(changed.profile).toEqual(profile)
    expect(changed.stats).toEqual(original.stats);expect(changed.appearance).toEqual(original.appearance)
    expect(changed.gChog).toBe(original.gChog);expect(changed.rarityRank).toBe(original.rarityRank)
    expect(restoreSave(JSON.stringify(changed),original)?.profile).toEqual(profile)
    expect(parseCommand({type:'setProfile',profile})).toEqual({type:'setProfile',profile})
    expect(()=>parseCommand({type:'setProfile',profile:{...profile,gender:'administrator'}})).toThrow()
    expect(()=>parseCommand({type:'setProfile',profile:{...profile,name:'x'.repeat(41)}})).toThrow()
  })
  it('interprets original Skin and Body categories independently',async()=>{
    const {mapTraitsToCharacter}=await import('../src/game/traitMapper')
    const result=mapTraitsToCharacter([{trait_type:'Skin',value:'Pink'},{trait_type:'Body',value:'Yellow 143 Jersey'},{trait_type:'Head',value:'MCGA'},{trait_type:'Eyes',value:'BTC Glass'}],1)
    expect(result.appearance.bodyColor).toBe('#e783b8')
    expect(result.appearance.bodyTrait).toBe('Yellow 143 Jersey')
    expect(result.appearance.headTrait).toBe('MCGA')
    expect(result.appearance.eyeTrait).toBe('BTC Glass')
    const purple=mapTraitsToCharacter([{trait_type:'Skin',value:'Origin'}],2)
    expect(purple.appearance.bodyColor).not.toBe(result.appearance.bodyColor)
  })
  it('uses live EVM gas for all five cities and reprices purchases and travel',async()=>{
    const {CITIES,cityPrice,travelCost}=await import('../src/game/zones')
    expect(CITIES.map(c=>c.chain).sort()).toEqual(['Arbitrum One','Base','Ethereum','Monad','Polygon'])
    expect(CITIES.every(c=>c.rpc?.startsWith('https://'))).toBe(true)
    expect(cityPrice(20,0,50)).toBe(20);expect(cityPrice(20,0,100)).toBe(40)
    expect(cityPrice(20,4,30)).toBe(20);expect(cityPrice(20,4,0)).toBe(10)
    expect(cityPrice(20,1,1e9)).toBe(60)
    expect(travelCost(0,4,60)).toBe(240)
    expect(travelCost(4,0,1e9)).toBe(0)
    const s=reduceGame(initial(),{type:'startAction',kind:'eat'},{now:0,gas:{0:100}})
    expect(s.gChog).toBe(60)
  })
})

describe('physical neighborhoods and home settings',()=>{
  it('finds collision-free routes and requires arrival before a service action',async()=>{
    const {streetPath,streetWalkable,frontDoor,STEP_MS,SERVICES}=await import('../src/game/neighborhood')
    const home=initial(),door=frontDoor(home.home)
    let s=reduce(home,{type:'leaveHome'})
    expect(s.location.kind).toBe('street');expect(s.location.tile).toEqual(door)
    const rejected=reduce(s,{type:'startAction',kind:'eat'})
    expect(rejected.action).toBeNull();expect(rejected.gChog).toBe(100)
    const path=streetPath(door,SERVICES[0].approach)!
    expect(path.length).toBeGreaterThan(0);expect(path.every(streetWalkable)).toBe(true)
    for(let i=1;i<path.length;i++)expect(Math.abs(path[i].x-path[i-1].x)+Math.abs(path[i].y-path[i-1].y)).toBe(1)
    s=reduce(s,{type:'walk',target:SERVICES[0].approach})
    expect(s.location.tile).toEqual(door)
    expect(reduce(s,{type:'startAction',kind:'eat'}).action).toBeNull()
    s=reduce(s,{type:'tick'},path.length*STEP_MS)
    expect(s.location.journey).toBeNull();expect(s.location.tile).toEqual(SERVICES[0].approach)
    expect(reduce(s,{type:'startAction',kind:'eat'}).action?.kind).toBe('eat')
    expect(streetPath(door,{x:2,y:5})).toBeNull()
  })
  it('cannot enter a home remotely and keeps decorations on the resident estate',()=>{
    let s=reduce(initial(),{type:'leaveHome'})
    s={...s,location:{...s.location,tile:{x:29,y:3}}}
    expect(reduce(s,{type:'enterHome'}).location.kind).toBe('street')
    const decorated=reduce(s,{type:'decorate',style:'sage',open:false})
    expect(decorated.home.style).toBe('sage');expect(decorated.home.open).toBe(false)
    expect(restoreSave(JSON.stringify(decorated),initial())?.home).toEqual(decorated.home)
    expect(()=>parseCommand({type:'walk',target:{x:2.5,y:3}})).toThrow()
    expect(()=>parseCommand({type:'buyLand',x:-1,y:0})).toThrow()
    expect(()=>parseCommand({type:'offerLand',x:1,y:0,amount:0})).toThrow()
  })
})
