import {describe,it,expect} from 'vitest'
import {sampleJourney} from '../src/world/motion'
import {createNewGameState,reduceGame} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {housePath,houseWalkable,ROOM_STEP} from '../src/game/housing'
import {streetPath,journeyTile,STEP_MS} from '../src/game/neighborhood'
import {indoorTile} from '../src/game/household'
const initial=()=>ensureHousehold(createNewGameState('player',0,[],0,{now:1000}))
const ctx=(now:number)=>({now,gas:{}})
describe('movement feel and authoritative redirection',()=>{
 it('interpolates a route and faces each segment rather than its final destination',()=>{
  const j={from:{x:0,y:1},path:[{x:1,y:1},{x:1,y:0}],startedAt:1000,endsAt:1400}
  expect(sampleJourney(j,j.from,1100,200)).toMatchObject({tile:{x:.5,y:1},moving:true,frame:1})
  expect(sampleJourney(j,j.from,1300,200)).toMatchObject({tile:{x:1,y:.5},moving:true,frame:2})
  expect(sampleJourney(j,j.from,1800,200)).toMatchObject({tile:{x:1,y:0},moving:false})
 })
 it('redirects a free indoor walk from its current legal tile without changing money or queued care',()=>{
  let s=initial();const b=s.household!.blueprint,h=s.household!
  const target=Array.from({length:b.width*b.height},(_,i)=>({x:i%b.width,y:Math.floor(i/b.width)})).find(t=>(housePath(b,h.humanTile,t)?.length??0)>3)!
  s=reduceGame(s,{type:'moveIndoor',target},ctx(1000));const now=1000+ROOM_STEP*1.5,origin=indoorTile(s.household!,now),back=h.humanTile
  const next=reduceGame(s,{type:'moveIndoor',target:back},ctx(now))
  expect(next.household!.journey?.from).toEqual(origin);expect(next.household!.journey?.path[next.household!.journey!.path.length-1]).toEqual(back)
  expect(houseWalkable(b,next.household!.humanTile)).toBe(true);expect(next.gChog).toBe(s.gChog)
  expect(next.routine).toEqual(s.routine)
 })
 it('does not interrupt an object approach or active use with an accidental floor command',()=>{
  let s=initial();const kitchen=s.household!.blueprint.objects.find(o=>o.type==='kitchen')!
  s=reduceGame(s,{type:'useObject',objectId:kitchen.id,kind:'snack'},ctx(1000))
  const next=reduceGame(s,{type:'moveIndoor',target:s.household!.humanTile},ctx(1001))
  expect(next.household!.pendingUse).toEqual(s.household!.pendingUse);expect(next.household!.journey).toEqual(s.household!.journey);expect(next.gChog).toBe(s.gChog)
 })
 it('redirects street walking without teleporting, and refuses walking while on a tram',()=>{
  let s=reduceGame(initial(),{type:'leaveHome'},ctx(1000));const start=s.location.tile,target={x:29,y:3}
  expect(streetPath(start,target)).not.toBeNull();s=reduceGame(s,{type:'walk',target},ctx(1000))
  const now=1000+STEP_MS*1.5,origin=journeyTile(s.location,now),next=reduceGame(s,{type:'walk',target:start},ctx(now))
  expect(next.location.journey?.from).toEqual(origin);expect(next.location.journey?.path[next.location.journey!.path.length-1]).toEqual(start)
  s={...next,location:{...next.location,journey:null,trip:{zone:2,startedAt:now,endsAt:now+10000,fare:20}}}
  expect(reduceGame(s,{type:'walk',target},ctx(now+1)).location).toEqual(s.location)
 })
})
