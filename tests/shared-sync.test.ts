import {afterEach,describe,expect,it,vi} from 'vitest'
import {SharedGameSync,restoreOutbox,type SyncRequest,type SyncResponse,type SyncView} from '../src/game/sharedSync'
import {DeferredWriter} from '../src/game/deferredWriter'
import {createNewGameState,reduceGame} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
const initial=()=>ensureHousehold(createNewGameState('preview',0,[],0,{now:1000,chainId:0,collection:'preview'}))
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()}
function harness(){
 let now=1000,view:SyncView|undefined
 const requests:{request:SyncRequest;resolve(value:SyncResponse):void;reject(error:Error):void}[]=[]
 const sync=new SharedGameSync({initial:{state:initial(),revision:0},now:()=>now,gas:()=>({}),onChange:v=>{view=v},transport:request=>new Promise((resolve,reject)=>{requests.push({request,resolve,reject})})})
 sync.start();return {sync,requests,get view(){return view!},time:(value:number)=>{now=value}}
}
afterEach(()=>vi.useRealTimers())
describe('background shared synchronization',()=>{
 it('projects movement and a queued action immediately during a slow save, and coalesces unsent floor destinations',async()=>{
  const h=harness();h.sync.enqueue({type:'moveIndoor',target:{x:4,y:6}})
  expect(h.view.state.household?.journey?.path).toEqual([{x:4,y:6}]);expect(h.view.saving).toBe(true)
  h.sync.enqueue({type:'moveIndoor',target:{x:6,y:6}});h.sync.enqueue({type:'moveIndoor',target:{x:5,y:6}})
  expect(h.requests).toHaveLength(1);expect(h.sync.getPending()).toHaveLength(2)
  h.sync.enqueue({type:'enqueueAction',objectId:'starter-1-kitchen',kind:'wash'});expect(h.view.state.routine?.queue).toHaveLength(1)
  const first=reduceGame(initial(),h.requests[0].request.command,{now:1000,gas:{}})
  h.requests[0].resolve({status:200,snapshot:{state:first,revision:1}});await flush()
  expect(h.requests).toHaveLength(2);expect(h.requests[1].request.command).toEqual({type:'moveIndoor',target:{x:5,y:6}})
  expect(h.requests[1].request.revision).toBe(1);expect(h.requests[1].request).not.toHaveProperty('state');expect(h.view.state.routine?.queue).toHaveLength(1);h.sync.dispose()
 })
 it('projects a Build-only owned edit while saving and commits the mode change before the edit',async()=>{
  const h=harness(),object=initial().household!.blueprint.objects[0],version=initial().household!.blueprint.version
  h.sync.enqueue({type:'setBuildMode',enabled:true});h.sync.enqueue({type:'storeFurniture',id:object.id,version})
  expect(h.requests).toHaveLength(1);expect(h.view.state.buildMode).toBe(true);expect(h.view.state.household!.blueprint.objects[0].stored).toBe(true)
  const entered=reduceGame(initial(),h.requests[0].request.command,{now:1000,gas:{}});h.requests[0].resolve({status:200,snapshot:{state:entered,revision:1}});await flush()
  expect(h.requests[1].request.command.type).toBe('storeFurniture');expect(h.requests[1].request.revision).toBe(1)
  const committed=reduceGame(entered,h.requests[1].request.command,{now:1000,gas:{}});h.requests[1].resolve({status:200,snapshot:{state:committed,revision:2}});await flush()
  expect(h.view.state.household!.blueprint.objects).toEqual(committed.household!.blueprint.objects);expect(h.view.state.gChog).toBe(initial().gChog);expect(h.view.saving).toBe(false);h.sync.dispose()
 })
 it('accepts user input while a routine clock save is in flight and does not build a tick backlog',async()=>{
  const h=harness();h.sync.enqueue({type:'tick'});h.sync.enqueue({type:'tick'});h.sync.enqueue({type:'moveIndoor',target:{x:4,y:6}})
  expect(h.view.state.household?.journey).not.toBeNull();expect(h.sync.getPending()).toHaveLength(2)
  h.requests[0].resolve({status:200,snapshot:{state:initial(),revision:1}});await flush();expect(h.requests[1].request.command.type).toBe('moveIndoor');h.sync.dispose()
 })
 it('retries a dropped response with the same idempotency key and never compounds a projected debit',async()=>{
  vi.useFakeTimers();const h=harness();h.sync.enqueue({type:'buyGroceries',pack:'breakfast'})
  const id=h.requests[0].request.requestId,projected=h.view.state.gChog
  h.requests[0].reject(new Error('Response lost after commit'));await flush();expect(h.view.offline).toBe(true);expect(h.view.state.gChog).toBe(projected)
  await vi.advanceTimersByTimeAsync(1000);expect(h.requests[1].request.requestId).toBe(id)
  const committed=reduceGame(initial(),h.requests[0].request.command,{now:1000,gas:{}})
  h.requests[1].resolve({status:200,snapshot:{state:committed,revision:1}});await flush()
  expect(h.view.state.gChog).toBe(committed.gChog);expect(h.view.queued).toBe(0);expect(h.view.offline).toBe(false);h.sync.dispose()
 })
 it('never changes the contents of an already-sent idempotent movement request during an outage',async()=>{
  vi.useFakeTimers();const h=harness();h.sync.enqueue({type:'moveIndoor',target:{x:4,y:6}})
  const firstId=h.requests[0].request.requestId;h.requests[0].reject(new Error('Unknown commit outcome'));await flush()
  h.sync.enqueue({type:'moveIndoor',target:{x:6,y:6}})
  expect(h.sync.getPending()).toHaveLength(2);expect(h.sync.getPending()[0].command).toEqual({type:'moveIndoor',target:{x:4,y:6}})
  await vi.advanceTimersByTimeAsync(1000);expect(h.requests[1].request.requestId).toBe(firstId);expect(h.requests[1].request.command).toEqual(h.requests[0].request.command)
  h.sync.dispose()
 })
 it('rebases a revision conflict automatically and rolls back rejected economic choices',async()=>{
  const h=harness();h.sync.enqueue({type:'buyGroceries',pack:'breakfast'})
  const newer={...initial(),gChog:5};h.requests[0].resolve({status:409,snapshot:{state:newer,revision:7}});await flush()
  expect(h.requests[1].request.revision).toBe(7);expect(h.requests[1].request.requestId).toBe(h.requests[0].request.requestId)
  h.requests[1].resolve({status:400,error:'Not enough gCHOG'});await flush()
  expect(h.view.state.gChog).toBe(5);expect(h.view.error).toBe('Not enough gCHOG');expect(h.view.saving).toBe(false);h.sync.dispose()
 })
 it('drops queued choices after ownership rejection and preserves a recoverable pending outbox during interruption',async()=>{
  const h=harness();h.sync.enqueue({type:'moveIndoor',target:{x:4,y:6}});h.sync.enqueue({type:'buyGroceries',pack:'breakfast'})
  expect(restoreOutbox(JSON.stringify(h.sync.getPending()))).toHaveLength(2)
  h.requests[0].resolve({status:403,error:'NFT ownership changed'});await flush()
  expect(h.view.queued).toBe(0);expect(h.view.state.gChog).toBe(initial().gChog);expect(h.view.error).toContain('ownership');h.sync.dispose()
 })
 it('uses the authority offline caps when a suspended tab or outage leaves the snapshot old',()=>{
  const state={...initial(),gChog:1000,currentZone:1 as const}
  const sync=new SharedGameSync({initial:{state,revision:0},now:()=>48*3600000+1000,gas:()=>({}),onChange:()=>{},transport:async()=>({status:200})})
  expect(sync.view().state.gChog).toBeGreaterThanOrEqual(750);sync.dispose()
 })
 it('does not crash on malformed outbox JSON or a damaged command',()=>{
  expect(restoreOutbox('{bad')).toEqual([])
  const s=new SharedGameSync({initial:{state:initial(),revision:0},restored:[{requestId:crypto.randomUUID(),command:{type:'buyFurniture'} as never,at:1000,conflicts:0}],gas:()=>({}),now:()=>1000,onChange:()=>{},transport:async()=>({status:400})})
  expect(()=>s.view()).not.toThrow();s.dispose()
 })
})
describe('deferred local persistence',()=>{
 it('does no synchronous storage work during input, coalesces snapshots and flushes the latest on lifecycle exit',async()=>{
  vi.useFakeTimers();const write=vi.fn(()=>true),writer=new DeferredWriter<number>(write)
  writer.schedule(1);writer.schedule(2);writer.schedule(3);expect(write).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(80);expect(write).toHaveBeenCalledExactlyOnceWith(3)
  writer.schedule(4);writer.flush();expect(write).toHaveBeenLastCalledWith(4);await vi.runAllTimersAsync();expect(write).toHaveBeenCalledTimes(2)
 })
 it('reports storage failure without throwing into gameplay',()=>{const result=vi.fn(),writer=new DeferredWriter(()=>{throw new Error('Storage denied')},result);writer.schedule(1);expect(()=>writer.flush()).not.toThrow();expect(result).toHaveBeenCalledWith(false)})
})

describe('confirmed doorway transitions',()=>{
 it('never bounces outside and back when a delayed indoor walk is acknowledged',async()=>{
  vi.useFakeTimers();let now=1000;const origin=initial(),requests:{request:SyncRequest;resolve(v:SyncResponse):void}[]=[],history:string[]=[]
  const sync=new SharedGameSync({initial:{state:origin,revision:0},now:()=>now,gas:()=>({}),onChange:v=>{const place=v.state.location.venue??v.state.location.kind;if(history[history.length-1]!==place)history.push(place)},transport:request=>new Promise(resolve=>requests.push({request,resolve}))})
  sync.start();sync.enqueue({type:'moveIndoor',target:{x:4,y:6}});now=1300;sync.advance();sync.enqueue({type:'leaveHome'});expect(sync.view().transitioning).toBe(true);expect(history).toEqual(['home'])
  now=4000;const moved=reduceGame(origin,requests[0].request.command,{now,gas:{}});requests[0].resolve({status:200,snapshot:{state:moved,revision:1}});await flush();expect(requests).toHaveLength(1);expect(history).toEqual(['home'])
  now=4200;await vi.advanceTimersByTimeAsync(200);expect(requests).toHaveLength(2);const outside=reduceGame(moved,requests[1].request.command,{now,gas:{}});requests[1].resolve({status:200,snapshot:{state:outside,revision:2}});await flush();expect(history).toEqual(['home','street']);expect(sync.view().transitioning).toBe(false);sync.dispose()
 })
 it('keeps the street until venue entry succeeds and leaves it intact on rejection',async()=>{
  const origin=initial();origin.location={kind:'street',tile:{x:5,y:3},journey:null};let reply!:(r:SyncResponse)=>void
  const sync=new SharedGameSync({initial:{state:origin,revision:0},now:()=>1000,gas:()=>({}),onChange:()=>{},transport:()=>new Promise(resolve=>{reply=resolve})});sync.start();sync.enqueue({type:'enterVenue',venue:'cafe'});expect(sync.view().state.location.kind).toBe('street');reply({status:400,error:'Entrance closed'});await flush();expect(sync.view().state.location.kind).toBe('street');expect(sync.view().transitioning).toBe(false);expect(sync.view().error).toContain('Entrance closed');sync.dispose()
 })
})
