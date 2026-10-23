import {describe,it,expect} from 'vitest'
import {detectRooms,partitionCutsFurniture} from '../src/game/rooms'
import {housePath,validBlueprint,type Blueprint} from '../src/game/housing'
import {createNewGameState,reduceGame} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
const empty=():Blueprint=>({width:7,height:7,version:1,objects:[],walls:[]})
describe('architectural rooms and door boundaries',()=>{
 it('detects connected rooms across doors without changing navigable circulation',()=>{
  const b=empty();b.walls=Array.from({length:7},(_,y)=>({x:3,y,axis:'x' as const,door:y===3}))
  expect(validBlueprint(b)).toBe(true);const rooms=detectRooms(b)
  expect(rooms.map(r=>r.area)).toEqual([28,21]);expect(rooms.map(r=>r.doors)).toEqual([1,1]);expect(rooms.flatMap(r=>r.cells)).toHaveLength(49)
  expect(housePath(b,{x:0,y:0},{x:6,y:6})).not.toBeNull()
  b.walls[3].door=false;expect(housePath(b,{x:0,y:0},{x:6,y:6})).toBeNull()
 })
 it('keeps partial partitions open and classifies rooms from real placed furniture',()=>{
  const b=empty();b.walls=[{x:3,y:0,axis:'x',door:false}];b.objects=[{id:'bed',type:'bed',x:0,y:0,rotation:0,stored:false}]
  expect(detectRooms(b)).toMatchObject([{area:49,freeArea:43,label:'Bedroom'}]);b.objects[0].stored=true;expect(detectRooms(b)[0].label).toBe('Empty room')
 })
 it('rejects newly cutting furniture while preserving older structural saves',()=>{
  let s=ensureHousehold(createNewGameState('local',0,[],0,{now:1000}));const bed=s.household!.blueprint.objects.find(o=>o.type==='bed')!,b=s.household!.blueprint,w={x:bed.x,y:bed.y,axis:'x' as const,door:false}
  expect(partitionCutsFurniture(b,w)).toBe(true)
  const rejected=reduceGame(s,{type:'editWall',...w,remove:false,version:b.version},{now:1000,gas:{}})
  expect(rejected.gChog).toBe(s.gChog);expect(rejected.household?.blueprint).toEqual(b);expect(rejected.lastMessage).toMatch('cuts through furniture')
 })
})
