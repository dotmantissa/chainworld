import {describe,it,expect} from 'vitest'
import {createNewGameState,reduceGame,settle} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {restoreSave} from '../src/game/persistence'
import {cityNpc} from '../src/game/places'
import {houseWalkable} from '../src/game/housing'
import {DAILY_GOALS,todaysGoals,recordDaily,DAY_MS} from '../src/game/dailyGoals'
import {npcRoutine} from '../src/game/social'
import type {GameState} from '../src/game/types'
import {parseCommand} from '../server/commands'
const ctx=(now:number)=>({now,gas:{}})
const initial=()=>ensureHousehold(createNewGameState('local',0,[],0,{now:1000}))
function withNpc():GameState{let s=initial();s.location={kind:'street',tile:{x:5,y:3},journey:null};s=reduceGame(s,{type:'enterVenue',venue:'cafe'},ctx(1000));const npc=cityNpc(0,'cafe'),b=s.location.interior!,tile=[{x:npc.x+1,y:npc.y},{x:npc.x-1,y:npc.y},{x:npc.x,y:npc.y+1},{x:npc.x,y:npc.y-1}].find(t=>houseWalkable(b,t))!;return {...s,household:{...s.household!,humanTile:tile,relationships:{[npc.id]:{friendship:24,meetings:3,lastMet:0,memory:'story'}}}}}
describe('NPC shared activities and memories',()=>{
 it('spends real time together, restores needs and remembers it once after reload',()=>{
  let s=withNpc();const id=cityNpc(0,'cafe').id
  s=reduceGame(s,{type:'talkNpc',npcId:id,topic:'hangout'},ctx(20000));expect(s.action?.npcId).toBe(id);expect(s.household?.relationships[id].friendship).toBe(24)
  s=restoreSave(JSON.stringify(s),initial())!;s=settle(s,ctx(40000));expect(s.household?.relationships[id].friendship).toBe(36);expect(s.household?.relationships[id].memory).toBe('hangout-cafe');expect(s.gChog).toBe(100)
  expect(settle(s,ctx(40000)).xp).toBe(s.xp);expect(reduceGame(s,{type:'talkNpc',npcId:id,topic:'hangout'},ctx(60000)).action).toBeNull()
 })
 it('consumes a real gift, rejects distant activities and grants no cancelled hangout benefit',()=>{
  let s=withNpc();const id=cityNpc(0,'cafe').id
  expect(reduceGame(s,{type:'talkNpc',npcId:id,topic:'gift'},ctx(20000)).life?.meals).toHaveLength(0)
  s.life={...s.life!,meals:[{id:'meal-9',recipe:'cookBreakfast',expiresAt:100000}]}
  s=reduceGame(s,{type:'talkNpc',npcId:id,topic:'gift'},ctx(20000));expect(s.life?.meals).toEqual([]);expect(s.household?.relationships[id].friendship).toBe(36)
  s=reduceGame(s,{type:'talkNpc',npcId:id,topic:'hangout'},ctx(40000));s=reduceGame(s,{type:'cancel'},ctx(40001));expect(settle(s,ctx(80000)).household?.relationships[id].friendship).toBe(36)
  const distant={...withNpc(),household:{...withNpc().household!,humanTile:{x:7,y:7}}};expect(reduceGame(distant,{type:'talkNpc',npcId:id,topic:'hangout'},ctx(20000)).action).toBeNull()
 })
 it('uses deterministic city routines without removing conversation access',()=>{
  const npc=cityNpc(0,'cafe');expect(npcRoutine(npc,8*360000)).toMatch('breakfast');expect(npcRoutine(npc,19*360000)).toMatch('dinner')
  expect(parseCommand({type:'talkNpc',npcId:npc.id,topic:'gift'})).toMatchObject({topic:'gift'})
 })
})
describe('bounded daily household goals',()=>{
 it('selects three stable goals, credits actual play and preserves single claims across reload',()=>{
  let s=initial();const selected=todaysGoals(s);expect(selected).toHaveLength(3);expect(todaysGoals({...s,walletAddress:'new-controller'})).toEqual(selected)
  const id=selected[0];for(let i=0;i<DAILY_GOALS[id].target;i++)s=recordDaily(s,id,1000)
  const before=s.gChog;s=reduceGame(s,{type:'claimDaily',id},ctx(1000));expect(s.gChog).toBe(before+DAILY_GOALS[id].reward)
  s=restoreSave(JSON.stringify(s),initial())!;expect(reduceGame(s,{type:'claimDaily',id},ctx(1000)).gChog).toBe(s.gChog)
  const tomorrow=settle(s,ctx(DAY_MS+1000),true);expect(tomorrow.daily?.claimed).toEqual([]);expect(tomorrow.daily?.earned).toBe(DAILY_GOALS[id].reward);expect(tomorrow.daily?.counts[id]).toBe(0)
  expect(reduceGame(tomorrow,{type:'claimDaily',id},ctx(DAY_MS+1000)).gChog).toBe(tomorrow.gChog)
 })
 it('counts completed care and transit, does not count a cancelled action, and rejects fake rewards',()=>{
  let s=initial();s=reduceGame(s,{type:'carePet',kind:'pet'},ctx(1000));expect(s.daily?.counts.pet).toBe(1)
  expect(reduceGame(s,{type:'carePet',kind:'pet'},ctx(1001)).daily?.counts.pet).toBe(1)
  expect(parseCommand({type:'claimDaily',id:'pet',reward:1000000})).toEqual({type:'claimDaily',id:'pet'})
  expect(()=>parseCommand({type:'claimDaily',id:'mint'})).toThrow()
  s={...s,location:{kind:'street',tile:{x:29,y:3},journey:null}};s=reduceGame(s,{type:'travel',zone:2},ctx(14000));expect(s.daily?.counts.travel).toBe(0);s=settle(s,ctx(30000));expect(s.daily?.counts.travel).toBe(1)
 })
})
