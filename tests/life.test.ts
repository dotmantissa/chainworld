import {describe,it,expect} from 'vitest'
import {ACTIONS,createNewGameState,reduceGame,settle} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {restoreSave} from '../src/game/persistence'
import {parseCommand} from '../server/commands'
const initial=()=>ensureHousehold(createNewGameState('player',0,[],0,{now:1000}))
const cmd=(s:ReturnType<typeof initial>,c:Parameters<typeof reduceGame>[1])=>reduceGame(s,c,{now:s.lastSaved,gas:{}})
function activity(s:ReturnType<typeof initial>,kind:'cookBreakfast'|'cookStew'|'eatLeftovers'|'practiceCoding'|'paint'){
 const type=kind==='practiceCoding'?'desk':kind==='paint'?'sofa':'kitchen',o=s.household!.blueprint.objects.find(o=>o.type===type)!
 s=cmd(s,{type:'useObject',objectId:o.id,kind});const arrive=s.household?.pendingUse?.arrivesAt??s.lastSaved;s=settle(s,{now:arrive,gas:{}})
 return settle(s,{now:arrive+ACTIONS[kind].duration,gas:{}})
}
describe('pantry, meals and earned skills',()=>{
 it('charges a server-priced grocery order once and cooking consumes real stock',()=>{
  let s=cmd(initial(),{type:'buyGroceries',pack:'breakfast'});expect(s.gChog).toBe(82);expect(s.life?.pantry).toMatchObject({oats:2,fruit:2})
  s=activity(s,'cookBreakfast');expect(s.life?.pantry).toMatchObject({oats:1,fruit:1});expect(s.life?.meals).toHaveLength(1);expect(s.life?.skills.cooking).toBe(15)
  const replay=settle(s,{now:s.lastSaved,gas:{}});expect(replay.life).toEqual(s.life)
  const restored=restoreSave(JSON.stringify(s),initial())!;expect(restored.life).toEqual(s.life)
  s=activity(restored,'eatLeftovers');expect(s.life?.meals).toHaveLength(0);expect(s.life?.pantry.oats).toBe(1)
 })
 it('does not mint food or skills without supplies, or refund consumed ingredients on cancel',()=>{
  let s=activity(initial(),'cookBreakfast');expect(s.life?.meals).toHaveLength(0);expect(s.life?.skills.cooking).toBe(0)
  s=cmd(initial(),{type:'buyGroceries',pack:'breakfast'});const o=s.household!.blueprint.objects.find(o=>o.type==='kitchen')!
  s=cmd(s,{type:'useObject',objectId:o.id,kind:'cookBreakfast'});s=settle(s,{now:s.household!.pendingUse?.arrivesAt??s.lastSaved,gas:{}})
  expect(s.life?.pantry.oats).toBe(1);s=cmd(s,{type:'cancel'});s=settle(s,{now:s.lastSaved+60000,gas:{}});expect(s.life?.meals).toHaveLength(0);expect(s.life?.skills.cooking).toBe(0);expect(s.life?.pantry.oats).toBe(1)
 })
 it('earns recipe access, expires meals and refuses cooking in incompatible furniture',()=>{
  let s=cmd(initial(),{type:'buyGroceries',pack:'garden'});s=activity(s,'cookStew');expect(s.life?.meals).toHaveLength(0)
  s=cmd(s,{type:'buyGroceries',pack:'breakfast'});s=activity(activity(s,'cookBreakfast'),'cookBreakfast');expect(s.life?.skills.cooking).toBe(30)
  s=activity(s,'cookStew');expect(s.life?.meals).toHaveLength(3)
  expect(settle(s,{now:s.lastSaved+31*60000,gas:{}}).life?.meals).toEqual([])
 })
 it('records household project progress and rewards once without a rarity reroll',()=>{
  let s=cmd(initial(),{type:'startProject',id:'helloChain'});expect(cmd(s,{type:'claimProject',id:'helloChain'}).gChog).toBe(100)
  for(let i=0;i<3;i++)s=activity(s,'practiceCoding')
  expect(s.life?.progress.helloChain).toBe(3);expect(s.life?.skills.programming).toBe(45);expect(s.completedWork).toBe(0)
  const before=s.gChog;s=cmd(s,{type:'claimProject',id:'helloChain'});expect(s.gChog).toBe(before+80);expect(s.xp).toBe(25)
  expect(cmd(s,{type:'claimProject',id:'helloChain'}).gChog).toBe(s.gChog);expect(restoreSave(JSON.stringify(s),initial())?.life?.claimed).toEqual(['helloChain']);expect(s.rarityRank).toBe(initial().rarityRank)
 })
 it('bounds inventory and validates every new command and saved progress',()=>{
  const s=initial();s.life!.pantry.oats=40;expect(cmd(s,{type:'buyGroceries',pack:'breakfast'}).gChog).toBe(100)
  expect(parseCommand({type:'buyGroceries',pack:'garden',price:0})).toEqual({type:'buyGroceries',pack:'garden'})
  expect(()=>parseCommand({type:'claimProject',id:'give-million'})).toThrow()
  expect(restoreSave(JSON.stringify({...s,life:{...s.life,claimed:['helloChain']}}),initial())).toBeNull()
 })
})
