import {describe,it,expect} from 'vitest'
import {createNewGameState,reduceGame,settle} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {restoreSave} from '../src/game/persistence'
import {parseCommand} from '../server/commands'
const initial=()=>ensureHousehold(createNewGameState('local',0,[],0,{now:1000}))
const ctx=(now:number)=>({now,gas:{}})
const cmd=(s:ReturnType<typeof initial>,c:Parameters<typeof reduceGame>[1])=>reduceGame(s,c,ctx(s.lastSaved))
describe('durable resident intentions',()=>{
 it('saves the approach and queued object actions and resumes each completion once',()=>{
  let s=initial();const kitchen=s.household!.blueprint.objects.find(o=>o.type==='kitchen')!,bed=s.household!.blueprint.objects.find(o=>o.type==='bed')!
  s=cmd(s,{type:'enqueueAction',objectId:kitchen.id,kind:'wash'});s=cmd(s,{type:'enqueueAction',objectId:bed.id,kind:'sleep'})
  expect(s.routine?.queue).toHaveLength(1)
  const restored=restoreSave(JSON.stringify(s),initial())!;expect(restored.routine).toEqual(s.routine);expect(restored.household?.pendingUse).toEqual(s.household?.pendingUse)
  s=settle(restored,ctx(100000));expect(s.action).toBeNull();expect(s.household?.journey).toBeNull();expect(s.routine?.queue).toHaveLength(0);expect(s.completedWork).toBe(0);expect(s.gChog).toBe(100)
 })
 it('caps waiting actions at six and supports reorder, remove and independent clearing',()=>{
  let s=initial();const desk=s.household!.blueprint.objects.find(o=>o.type==='desk')!,kitchen=s.household!.blueprint.objects.find(o=>o.type==='kitchen')!
  s=cmd(s,{type:'enqueueAction',objectId:desk.id,kind:'focus'})
  for(let i=0;i<8;i++)s=cmd(s,{type:'enqueueAction',objectId:kitchen.id,kind:i%2?'wash':'snack'})
  expect(s.routine?.queue).toHaveLength(6);const id=s.routine!.queue[1].id
  s=cmd(s,{type:'reorderIntent',id,direction:'up'});expect(s.routine!.queue[0].id).toBe(id)
  s=cmd(s,{type:'removeIntent',id});expect(s.routine?.queue).toHaveLength(5)
  const action=s.action,pending=s.household?.pendingUse;s=cmd(s,{type:'clearQueue'});expect(s.routine?.queue).toHaveLength(0);expect(s.action).toEqual(action);expect(s.household?.pendingUse).toEqual(pending)
 })
 it('drops moved or foreign-place targets without phantom work rewards',()=>{
  let s=initial();const kitchen=s.household!.blueprint.objects.find(o=>o.type==='kitchen')!,desk=s.household!.blueprint.objects.find(o=>o.type==='desk')!
  s=cmd(s,{type:'enqueueAction',objectId:kitchen.id,kind:'wash'});s=cmd(s,{type:'enqueueAction',objectId:desk.id,kind:'work'})
  s={...s,household:{...s.household!,blueprint:{...s.household!.blueprint,objects:s.household!.blueprint.objects.filter(o=>o.id!==desk.id)}}}
  s=settle(s,ctx(100000));expect(s.completedWork).toBe(0);expect(s.routine?.queue).toHaveLength(0)
  expect(()=>parseCommand({type:'setAutonomy',enabled:'yes'})).toThrow()
 })
 it('keeps autonomy opted out and never spends, works or runs background care offline',()=>{
  let s=initial();s.meters.energy=5;s.meters.hygiene=5
  expect(settle(s,ctx(2000)).action).toBeNull()
  s=cmd(s,{type:'setAutonomy',enabled:true});const awake=settle(s,ctx(60000));expect(awake.gChog).toBe(100);expect(awake.completedWork).toBe(0);expect(awake.life?.pantry).toEqual(s.life?.pantry)
  const offline=settle(s,ctx(60000),true);expect(offline.action).toBeNull();expect(offline.meters.energy).toBeLessThan(5)
  const stopped=cmd(awake,{type:'cancel'});expect(stopped.routine?.queue).toEqual([]);expect(stopped.action).toBeNull()
 })
})
