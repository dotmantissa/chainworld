import {describe,it,expect} from 'vitest'
import {createNewGameState,reduceGame,settle} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {buildPreview} from '../src/world/buildTools'
import {parseCommand} from '../server/commands'
const ctx={now:1000,gas:{}}
const initial=()=>ensureHousehold(createNewGameState('preview',0,[],0,{now:1000,collection:'preview',chainId:0}))
describe('Build mode authority and atomic previews',()=>{
 it('rejects all layout changes in normal play and allows owned moves only after entering Build mode',()=>{
  const s=initial(),b=s.household!.blueprint,o=b.objects[0],command={type:'storeFurniture' as const,id:o.id,version:b.version}
  const rejected=reduceGame(s,command,ctx);expect(rejected.household!.blueprint).toEqual(b);expect(rejected.lastMessage).toMatch('Build mode')
  const building=reduceGame(s,{type:'setBuildMode',enabled:true},ctx),stored=reduceGame(building,command,ctx);expect(stored.household!.blueprint.objects[0].stored).toBe(true)
  const done=reduceGame(stored,{type:'setBuildMode',enabled:false},ctx);expect(reduceGame(done,{type:'moveFurniture',id:o.id,x:o.x,y:o.y,rotation:o.rotation,version:b.version+1},ctx).household!.blueprint).toEqual(stored.household!.blueprint)
 })
 it('suspends autonomy/queued activities and walking while editing, and refuses guests and active residents',()=>{
  const s=initial();s.routine!.autonomy=true;s.meters.energy=1;const building=reduceGame(s,{type:'setBuildMode',enabled:true},ctx)
  expect(settle(building,{...ctx,now:6000}).action).toBeNull();expect(reduceGame(building,{type:'moveIndoor',target:{x:4,y:6}},ctx).household!.journey).toBeNull()
  expect(reduceGame({...s,location:{...s.location,venue:'city:0:0:cafe'}},{type:'setBuildMode',enabled:true},ctx).buildMode).toBe(false)
  expect(reduceGame({...s,action:{id:1,kind:'rest',startedAt:1000,endsAt:5000}},{type:'setBuildMode',enabled:true},ctx).buildMode).toBe(false)
 })
 it('checks collision, budget and versions without charging or mutating the preview state',()=>{
  const s=reduceGame(initial(),{type:'setBuildMode',enabled:true},ctx),original=structuredClone(s),b=s.household!.blueprint,o=b.objects[0]
  expect(buildPreview(s,{kind:'place',type:'plant',rotation:0},o.x,o.y)!.valid).toBe(false);expect(s).toEqual(original)
  let p=null;for(let y=0;y<b.height&&!p;y++)for(let x=0;x<b.width&&!p;x++){const candidate=buildPreview(s,{kind:'place',type:'plant',rotation:0},x,y);if(candidate?.valid)p=candidate}
  expect(p).not.toBeNull();const placed=reduceGame(s,p!.command,ctx);expect(placed.gChog).toBe(s.gChog-p!.cost);expect(reduceGame(placed,p!.command,ctx).gChog).toBe(placed.gChog)
  expect(buildPreview({...s,gChog:0},{kind:'place',type:'plant',rotation:0},(p!.command as {x:number}).x,(p!.command as {y:number}).y)!.valid).toBe(false)
  expect(parseCommand({type:'setBuildMode',enabled:true})).toEqual({type:'setBuildMode',enabled:true});expect(()=>parseCommand({type:'setBuildMode',enabled:'yes'})).toThrow()
 })
})
