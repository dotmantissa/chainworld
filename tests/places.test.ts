import {describe,it,expect} from 'vitest'
import {createNewGameState,reduceGame,settle} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {venueBlueprint,cityNpc,placeKey} from '../src/game/places'
import {validBlueprint,houseWalkable,starterBlueprint,entryTile} from '../src/game/housing'
import {restoreSave} from '../src/game/persistence'
const ctx=(now:number)=>({now,gas:{}})
const start=()=>ensureHousehold(createNewGameState('x',0,[],0,{now:1000}))
describe('city venues, relationships and travel',()=>{
 it('provides twenty distinct valid enterable city spaces with reachable NPCs',()=>{
  const signatures=new Set<string>()
  for(const city of [0,1,2,3,4]as const)for(const venue of ['cafe','work','park','library']as const){const b=venueBlueprint(city,venue),npc=cityNpc(city,venue);expect(validBlueprint(b)).toBe(true);expect(b.npcTiles).toContainEqual({x:npc.x,y:npc.y});signatures.add(JSON.stringify(b));expect(b.objects.length).toBeGreaterThanOrEqual(20)}
  expect(signatures.size).toBe(20)
 })
 it('requires reaching the correct entrance before entering',()=>{
  let s=start();s=reduceGame(s,{type:'enterVenue',venue:'cafe'},ctx(1000));expect(s.location.venue).toBeUndefined();s={...s,location:{kind:'street',tile:{x:5,y:3},journey:null}};s=reduceGame(s,{type:'enterVenue',venue:'cafe'},ctx(1000));expect(s.location.venue).toBe(placeKey(0,'cafe'));expect(s.location.interior?.environment).toBe('cafe')
 })
 it('persists real friendship without minting chat money and rejects distant/repeated chats',()=>{
  let s=start();s.location={kind:'street',tile:{x:5,y:3},journey:null};s=reduceGame(s,{type:'enterVenue',venue:'cafe'},ctx(1000));const npc=cityNpc(0,'cafe'),b=s.location.interior!,tile=[{x:npc.x+1,y:npc.y},{x:npc.x-1,y:npc.y},{x:npc.x,y:npc.y+1}].find(t=>houseWalkable(b,t))!;
  const far=reduceGame({...s,household:{...s.household!,humanTile:{x:7,y:7}}},{type:'talkNpc',npcId:npc.id,topic:'introduce'},ctx(1000));expect(far.household?.relationships[npc.id]).toBeUndefined()
  s.household={...s.household!,humanTile:tile};s=reduceGame(s,{type:'talkNpc',npcId:npc.id,topic:'introduce'},ctx(1000));expect(s.gChog).toBe(100);expect(s.household?.relationships[npc.id].friendship).toBe(8);expect(reduceGame(s,{type:'talkNpc',npcId:npc.id,topic:'story'},ctx(1001)).household?.relationships[npc.id].friendship).toBe(8)
  const saved=restoreSave(JSON.stringify(s),start())!;expect(saved.location.venue).toBe(s.location.venue);expect(saved.household?.relationships[npc.id].friendship).toBe(8)
 })
 it('keeps a trip across reload, arrives once, and preserves NFT/home identity',()=>{
  let s=start();s.location={kind:'street',tile:{x:29,y:3},journey:null};const home=s.home;s=reduceGame(s,{type:'travel',zone:2},ctx(1000));expect(s.currentZone).toBe(0);expect(s.gChog).toBe(40);expect(s.location.trip?.zone).toBe(2)
  const repeated=reduceGame(s,{type:'travel',zone:2},ctx(1001));expect(repeated.gChog).toBe(40)
  s=restoreSave(JSON.stringify(s),start())!;expect(s.location.trip?.zone).toBe(2);s=settle(s,ctx(14000));expect(s.currentZone).toBe(2);expect(s.home).toEqual(home);expect(s.tokenId).toBe(0);expect(s.location.trip).toBeUndefined();expect(s.location.district).toBe(0)
 })
 it('rejects paid travel away from a station and refunds only before departure',()=>{
  const s=start();expect(reduceGame(s,{type:'travel',zone:2},ctx(1000)).location.trip).toBeUndefined();const at={...s,location:{kind:'street' as const,tile:{x:29,y:3},journey:null}},trip=reduceGame(at,{type:'travel',zone:2},ctx(1000));const cancelled=reduceGame(trip,{type:'cancel'},ctx(1500));expect(cancelled.gChog).toBe(100);expect(cancelled.location.trip).toBeUndefined();expect(reduceGame(trip,{type:'cancel'},ctx(4000)).gChog).toBe(40)
 })
})

describe('public layout upgrades',()=>{
 it('preserves active legacy use across reload, then refreshes only the venue after it completes',()=>{
  const s=start(),owned=structuredClone(s.household!.blueprint),old=starterBlueprint(2,2,true);old.environment='cafe';s.location={kind:'home',tile:{x:5,y:3},journey:null,venue:placeKey(0,'cafe'),interior:old};s.household!.humanTile=entryTile(old);s.sequence=1;s.action={id:1,kind:'rest',startedAt:1000,endsAt:5000};
  const restored=restoreSave(JSON.stringify(s),start())!;expect(restored.location.interior).toEqual(old);expect(settle(restored,ctx(2000)).location.interior?.version).toBe(1)
  const next=settle(settle(restored,ctx(5000)),ctx(5001));expect(next.location.interior?.version).toBe(2);expect(next.household!.blueprint).toEqual(owned);expect(validBlueprint(next.location.interior!)).toBe(true);expect(houseWalkable(next.location.interior!,next.household!.humanTile)).toBe(true)
 })
})
