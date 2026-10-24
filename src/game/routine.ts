import type {ActionKind,GameState} from './types'
import {ACTIONS} from './gameEngine'
import {activeBlueprint} from './indoor'
import {FURNITURE,approachPath} from './housing'
import {identityOf} from './neighborhood'

export interface Intent {id:number;objectId:string;kind:ActionKind;place:string}
export interface RoutineState {schema:1;queue:Intent[];autonomy:boolean;nextAutonomyAt:number}
export const MAX_INTENTIONS=6
export function newRoutine():RoutineState{return {schema:1,queue:[],autonomy:false,nextAutonomyAt:0}}
export function ensureRoutine(s:GameState):GameState{return s.routine?.schema===1?s:{...s,routine:newRoutine()}}
export const routinePlace=(s:GameState)=>s.location.host??s.location.venue??identityOf(s)
export function intentValid(s:GameState,q:Intent):boolean{
 if(s.location.kind==='street'||s.location.trip||q.place!==routinePlace(s)||!s.household)return false
 const b=activeBlueprint(s),o=b.objects.find(o=>o.id===q.objectId&&!o.stored)
 return !!o&&(FURNITURE[o.type].actions as readonly string[]).includes(q.kind)&&approachPath(b,s.household.humanTile,o)!==null
}
export function enqueueIntent(s:GameState,objectId:string,kind:ActionKind):GameState{
 s=ensureRoutine(s);const r=s.routine!,q={id:s.sequence+1,objectId,kind,place:routinePlace(s)}
 if(r.queue.length>=MAX_INTENTIONS)return {...s,lastMessage:'Your six-action queue is full. Remove a waiting action first.'}
 if(!intentValid(s,q))return {...s,lastMessage:'Choose a reachable object in the building you are inside.'}
 return {...s,sequence:s.sequence+1,routine:{...r,queue:[...r.queue,q]},lastMessage:`Queued: ${ACTIONS[kind].label}.`}
}
/** Autonomous choices are free care, never work, cooking, purchases or trades. */
export function autonomyChoice(s:GameState,now:number):Intent|null{
 if(!s.routine?.autonomy||s.routine.nextAutonomyAt>now||s.location.kind!=='home'||s.location.venue||s.location.trip||!s.household)return null
 const options:[number,ActionKind][]=[[s.meters.energy,'sleep'],[s.meters.hygiene,activeBlueprint(s).objects.some(o=>(FURNITURE[o.type].actions as readonly string[]).includes('shower')&&!o.stored)?'shower':'wash'],[s.meters.fun,'unwind'],[s.meters.comfort,'relax'],[s.meters.social,'socialize']]
 for(const[value,kind]of options.sort((a,b)=>a[0]-b[0])){
  if(value>=30||(s.cooldowns[kind]??0)>now)continue
  const b=activeBlueprint(s),object=b.objects.find(o=>!o.stored&&(FURNITURE[o.type].actions as readonly string[]).includes(kind)&&approachPath(b,s.household!.humanTile,o)!==null)
  if(object)return {id:s.sequence+1,kind,objectId:object.id,place:routinePlace(s)}
 }
 return null
}
export function parseRoutine(value:unknown,sequence:number):RoutineState|null {
 if(!value||typeof value!=='object')return null
 const r=value as RoutineState
 if(r.schema!==1||typeof r.autonomy!=='boolean'||!Number.isSafeInteger(r.nextAutonomyAt)||r.nextAutonomyAt<0||!Array.isArray(r.queue)||r.queue.length>MAX_INTENTIONS)return null
 const ids=new Set<number>()
 for(const q of r.queue){if(!q||!Number.isSafeInteger(q.id)||q.id<1||q.id>sequence||ids.has(q.id)||typeof q.objectId!=='string'||q.objectId.length<1||q.objectId.length>80||typeof q.place!=='string'||q.place.length>160||!Object.prototype.hasOwnProperty.call(ACTIONS,q.kind))return null;ids.add(q.id)}
 return {schema:1,autonomy:r.autonomy,nextAutonomyAt:r.nextAutonomyAt,queue:r.queue.map(q=>({id:q.id,objectId:q.objectId,kind:q.kind,place:q.place}))}
}
