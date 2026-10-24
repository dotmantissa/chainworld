import {describe,it,expect} from 'vitest'
import {createNewGameState,reduceGame,settle,ACTIONS} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {FURNITURE,entryTile,housePath,validBlueprint} from '../src/game/housing'
import {parseCommand} from '../server/commands'
const initial=()=>ensureHousehold(createNewGameState('player',0,[],0,{now:1000}))
const ctx=(now:number)=>({now,gas:{}})
describe('physical household interactions and Build/Buy',()=>{
 it('refuses remote generic actions and a missing or incompatible target',()=>{
  const s=initial();expect(reduceGame(s,{type:'startAction',kind:'eat'},ctx(1000)).action).toBeNull()
  expect(reduceGame(s,{type:'useObject',objectId:'missing',kind:'eat'},ctx(1000)).action).toBeNull()
  const bed=s.household!.blueprint.objects.find(o=>o.type==='bed')!;expect(reduceGame(s,{type:'useObject',objectId:bed.id,kind:'eat'},ctx(1000)).household?.pendingUse).toBeNull()
 })
 it('walks to an actual object before consuming resources and completes once',()=>{
  let s=initial();const kitchen=s.household!.blueprint.objects.find(o=>o.type==='kitchen')!
  s=reduceGame(s,{type:'useObject',objectId:kitchen.id,kind:'snack'},ctx(1000));const arrival=s.household!.pendingUse?.arrivesAt??1000
  if(arrival>1000)expect(s.gChog).toBe(100)
  s=settle(s,ctx(arrival));expect(s.action?.objectId).toBe(kitchen.id);expect(s.gChog).toBe(90)
  s=settle(s,ctx(arrival+ACTIONS.snack.duration));expect(s.action).toBeNull();expect(settle(s,ctx(arrival+ACTIONS.snack.duration)).gChog).toBe(90)
 })
 it('cancels approach without consuming food and preserves a legal standing tile',()=>{
  let s=initial();const desk=s.household!.blueprint.objects.find(o=>o.type==='desk')!;s=reduceGame(s,{type:'useObject',objectId:desk.id,kind:'work'},ctx(1000));s=reduceGame(s,{type:'cancel'},ctx(1001));expect(s.gChog).toBe(100);expect(s.household?.pendingUse).toBeNull();expect(s.household?.journey).toBeNull()
 })
 it('rejects overlapping furniture, stale layout versions and unaffordable edits atomically',()=>{
  const s=reduceGame(initial(),{type:'setBuildMode',enabled:true},ctx(1000)),b=s.household!.blueprint,bed=b.objects.find(o=>o.type==='bed')!
  const overlap=reduceGame(s,{type:'buyFurniture',furniture:'plant',x:bed.x,y:bed.y,rotation:0,version:b.version},ctx(1000));expect(overlap.gChog).toBe(100);expect(overlap.household?.blueprint).toEqual(b)
  const stale=reduceGame(s,{type:'expandRoom',axis:'x',version:0},ctx(1000));expect(stale.household?.blueprint).toEqual(b)
  const poor=reduceGame({...s,gChog:0},{type:'expandRoom',axis:'x',version:b.version},ctx(1000));expect(poor.gChog).toBe(0);expect(poor.household?.blueprint.width).toBe(b.width)
 })
 it('stores and places owned furniture without duplicating it or charging again',()=>{
  const s=reduceGame(initial(),{type:'setBuildMode',enabled:true},ctx(1000)),b=s.household!.blueprint,o=b.objects.find(o=>o.type==='sofa')!
  const stored=reduceGame(s,{type:'storeFurniture',id:o.id,version:b.version},ctx(1000));expect(stored.household!.blueprint.objects.find(i=>i.id===o.id)!.stored).toBe(true)
  const placed=reduceGame(stored,{type:'moveFurniture',id:o.id,x:o.x,y:o.y,rotation:o.rotation,version:b.version+1},ctx(1000));expect(placed.gChog).toBe(100);expect(placed.household?.blueprint.objects).toHaveLength(b.objects.length);expect(validBlueprint(placed.household!.blueprint)).toBe(true)
 })
 it('rejects a sealed floor and uses real wall edges in routing',()=>{
  const s=initial(),b={...s.household!.blueprint,objects:[],walls:Array.from({length:7},(_,y)=>({x:2,y,axis:'x' as const,door:false}))};expect(validBlueprint(b)).toBe(false);expect(housePath(b,entryTile(b),{x:0,y:0})).toBeNull();b.walls[3].door=true;expect(validBlueprint(b)).toBe(true)
 })
 it('validates new intents without accepting client prices or prototype catalogue keys',()=>{
  expect(()=>parseCommand({type:'buyFurniture',furniture:'constructor',x:0,y:0,rotation:0,version:1})).toThrow();expect(parseCommand({type:'buyFurniture',furniture:'plant',x:0,y:0,rotation:0,version:1,price:-999})).not.toHaveProperty('price');expect(FURNITURE.plant.price).toBe(12)
 })
})
