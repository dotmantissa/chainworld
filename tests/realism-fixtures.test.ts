import {describe,expect,it} from 'vitest'
import {ACTIONS,createNewGameState,reduceGame,settle} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {FURNITURE,approachPath,validBlueprint,type Blueprint,type FurnitureType} from '../src/game/housing'
import {restoreSave} from '../src/game/persistence'
import {parseCommand} from '../server/commands'
import {partitionSegment} from '../src/world/furnitureView'
const initial=()=>ensureHousehold(createNewGameState('preview',0,[],0,{now:1000,chainId:0,collection:'preview'}))
const ctx=(now:number)=>({now,gas:{}})
function buy(s:ReturnType<typeof initial>,type:FurnitureType){
 s=reduceGame(s,{type:'setBuildMode',enabled:true},ctx(1000));const b=s.household!.blueprint
 for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){
  const next=reduceGame(s,{type:'buyFurniture',furniture:type,x,y,rotation:0,version:b.version},ctx(1000))
  if(next.household!.blueprint.objects.length>b.objects.length)return reduceGame(next,{type:'setBuildMode',enabled:false},ctx(1000))
 }
 throw new Error('No valid fixture position in the test home')
}
describe('realistic fixtures and care pacing',()=>{
 it('purchases actual basin/shower objects, preserves their footprints and restores them without duplicate grants',()=>{
  let s=buy(initial(),'basin');s=buy(s,'shower');expect(s.gChog).toBe(0);expect(validBlueprint(s.household!.blueprint)).toBe(true)
  const restored=restoreSave(JSON.stringify(s),initial())!;expect(restored.household!.blueprint).toEqual(s.household!.blueprint);expect(restored.gChog).toBe(0)
  expect(parseCommand({type:'useObject',objectId:'shower',kind:'shower'})).toEqual({type:'useObject',objectId:'shower',kind:'shower'})
 })
 it('approaches the real shower before restoring hygiene and comfort exactly once',()=>{
  let s=buy(initial(),'shower');s.meters.hygiene=10;s.meters.comfort=30
  const shower=s.household!.blueprint.objects.find(o=>o.type==='shower')!
  s=reduceGame(s,{type:'useObject',objectId:shower.id,kind:'shower'},ctx(1000));const arrives=s.household!.pendingUse!.arrivesAt
  s=settle(s,ctx(arrives));expect(s.action?.objectId).toBe(shower.id);expect(s.gChog).toBe(30)
  s=settle(s,ctx(arrives+ACTIONS.shower.duration));expect(s.meters.hygiene).toBeGreaterThan(89);expect(s.meters.comfort).toBeGreaterThan(39)
  expect(settle(s,ctx(s.lastSaved))).toEqual(s)
 })
 it('does not turn a washbasin into a kitchen and does not award cancelled care',()=>{
  let s=buy(initial(),'basin');const basin=s.household!.blueprint.objects.find(o=>o.type==='basin')!
  expect(reduceGame(s,{type:'useObject',objectId:basin.id,kind:'cookBreakfast'},ctx(1000)).household?.pendingUse).toBeNull()
  s.meters.hygiene=10;s=reduceGame(s,{type:'useObject',objectId:basin.id,kind:'wash'},ctx(1000));s=reduceGame(s,{type:'cancel'},ctx(1001));expect(settle(s,ctx(10000)).meters.hygiene).toBeLessThan(10)
 })
 it('uses the front of a counter even if the resident starts behind it, with a legal fallback when blocked',()=>{
  const counter={id:'counter',type:'kitchen' as const,x:2,y:2,rotation:0 as const,stored:false},b:Blueprint={width:7,height:7,version:1,walls:[],objects:[counter]}
  const path=approachPath(b,{x:2,y:1},counter,'wash')!;expect(path[path.length-1]).toEqual({x:2,y:3})
  b.objects.push({id:'obstacle',type:'shelf',x:2,y:3,rotation:0,stored:false});expect(approachPath(b,{x:2,y:1},counter,'wash')).not.toBeNull()
 })
 it('keeps old in-progress care timers intact while starting new basic care with shorter durations',()=>{
  const s=initial();s.sequence=1;s.action={id:1,kind:'rest',startedAt:1000,endsAt:11000};s.meters.energy=10
  const restored=restoreSave(JSON.stringify(s),initial())!;expect(restored.action?.endsAt).toBe(11000)
  expect(settle(restored,ctx(5000)).action?.kind).toBe('rest');expect(settle(restored,ctx(11000)).meters.energy).toBeGreaterThan(49)
  expect(ACTIONS.wash.duration).toBe(3000);expect(ACTIONS.rest.duration).toBe(4000);expect(ACTIONS.work.duration).toBe(20000)
 })
 it('draws partitions along the actual x/y collision boundaries',()=>{
  const [a,b]=partitionSegment({x:2,y:3,axis:'x',door:false});expect(b.x-a.x).toBe(-25);expect(b.y-a.y).toBe(13)
  const [c,d]=partitionSegment({x:2,y:3,axis:'y',door:true});expect(d.x-c.x).toBe(25);expect(d.y-c.y).toBe(13)
  expect(FURNITURE.shower.actions).toEqual(['shower'])
 })
})
