import {describe,it,expect} from 'vitest'
import {ACTIONS,createNewGameState,reduceGame,settle} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {restoreSave} from '../src/game/persistence'
import {HUMAN_NEEDS} from '../src/game/needs'
import {parseCommand} from '../server/commands'
const initial=()=>ensureHousehold(createNewGameState('local',0,[],0,{now:1000}))
const ctx=(now:number)=>({now,gas:{}})
describe('full human needs',()=>{
 it('settles all six meters consistently across ticks and keeps them bounded',()=>{
  const s=initial(),once=settle(s,ctx(3601000));let split=s
  for(let i=1;i<=60;i++)split=settle(split,ctx(1000+i*60000))
  for(const need of HUMAN_NEEDS){expect(split.meters[need]).toBeCloseTo(once.meters[need],8);expect(once.meters[need]).toBeLessThan(s.meters[need]);expect(settle(s,ctx(48*3600000),true).meters[need]).toBeGreaterThanOrEqual(0)}
 })
 it('uses an actual sink, charges nothing and restores hygiene exactly once',()=>{
  let s=initial();s.meters.hygiene=10
  const kitchen=s.household!.blueprint.objects.find(o=>o.type==='kitchen')!
  s=reduceGame(s,{type:'useObject',objectId:kitchen.id,kind:'wash'},ctx(1000))
  const arrival=s.household!.pendingUse?.arrivesAt??1000;s=settle(s,ctx(arrival))
  expect(s.action?.objectId).toBe(kitchen.id);expect(s.gChog).toBe(100)
  const done=settle(s,ctx(arrival+ACTIONS.wash.duration));expect(done.meters.hygiene).toBeGreaterThan(69)
  expect(settle(done,ctx(done.lastSaved)).meters.hygiene).toBe(done.meters.hygiene)
  expect(restoreSave(JSON.stringify(done),initial())?.meters.hygiene).toBe(done.meters.hygiene)
 })
 it('does not award care on cancellation and rejects using a sofa as a sink',()=>{
  let s=initial();s.meters.hygiene=10;const kitchen=s.household!.blueprint.objects.find(o=>o.type==='kitchen')!,sofa=s.household!.blueprint.objects.find(o=>o.type==='sofa')!
  expect(reduceGame(s,{type:'useObject',objectId:sofa.id,kind:'wash'},ctx(1000)).household?.pendingUse).toBeNull()
  s=reduceGame(s,{type:'useObject',objectId:kitchen.id,kind:'wash'},ctx(1000));s=reduceGame(s,{type:'cancel'},ctx(1001));expect(settle(s,ctx(20000)).meters.hygiene).toBeLessThan(10)
 })
 it('migrates older saves without changing their money, property or economic progress',()=>{
  const s=initial(),p=JSON.parse(JSON.stringify(s));delete p.meters.hygiene;delete p.meters.fun;delete p.meters.comfort
  const restored=restoreSave(JSON.stringify(p),s)!
  expect(restored.meters.hygiene).toBe(85);expect(restored.gChog).toBe(s.gChog);expect(restored.home).toEqual(s.home);expect(restored.completedWork).toBe(0)
  expect(restoreSave(JSON.stringify({...p,meters:{...p.meters,fun:10000}}),s)).toBeNull()
  expect(parseCommand({type:'useObject',objectId:'sink',kind:'wash'})).toEqual({type:'useObject',objectId:'sink',kind:'wash'})
 })
})
