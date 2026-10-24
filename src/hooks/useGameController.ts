import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState, ZoneId } from '../game/types'
import { type Command } from '../game/gameEngine'
import { storageKey } from '../game/persistence'
import { getAllZoneGwei } from '../game/zones'
import {DeferredWriter} from '../game/deferredWriter'
import {SharedGameSync,restoreOutbox,type GameSnapshot,type PendingCommand,type SyncRequest} from '../game/sharedSync'
export type ServerSnapshot=GameSnapshot
export async function api<T>(url:string,options:RequestInit={},timeout=25000):Promise<T> {
 let response:Response
 try{response=await fetch(url,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers},signal:options.signal??AbortSignal.timeout(timeout)})}
 catch(error){if(error instanceof DOMException&&error.name==='TimeoutError')throw new Error('The game took too long to respond. Try again; your stored progress is safe.');throw error}
 const json=await response.json()
 if(!response.ok)throw new Error(json.error??'The game service is unavailable')
 return json as T
}
export function useGameController(initial:GameState,serverRevision:number){
 const [state,setState]=useState(initial)
 const [serverError,setServerError]=useState('')
 const [syncStatus,setSyncStatus]=useState({saving:false,offline:false,queued:0,transitioning:false,authorizationLost:false})
 const gas=useRef<Partial<Record<ZoneId,number|null>>>({})
 const [gasPrices,setGasPrices]=useState<Partial<Record<ZoneId,number|null>>>({})
 const alive=useRef(true),sync=useRef<SharedGameSync>()
 const dispatch=useCallback((command:Command)=>sync.current?.enqueue(command),[])
 useEffect(()=>{
  alive.current=true
  const outboxKey=`cw_outbox_${storageKey(initial)}_${initial.walletAddress.toLowerCase()}`
  const journal=new DeferredWriter<PendingCommand[]>(commands=>{try{sessionStorage.setItem(outboxKey,JSON.stringify(commands));return true}catch{return false}})
   let restored:PendingCommand[]=[];try{restored=restoreOutbox(sessionStorage.getItem(outboxKey))}catch{/* In-memory retries remain available. */}
   sync.current=new SharedGameSync({initial:{state:initial,revision:serverRevision},restored,gas:()=>gas.current,journal:commands=>journal.schedule(commands),
    transport:async(request:SyncRequest)=>{const response=await fetch('/api/game',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(15000)});const result=await response.json();return {status:response.status,snapshot:result.state&&Number.isInteger(result.revision)?result:undefined,error:result.error}},
    onChange:view=>{if(!alive.current)return;setState(view.state);setSyncStatus({saving:view.saving,offline:view.offline,queued:view.queued,transitioning:view.transitioning,authorizationLost:view.authorizationLost});setServerError(view.error)},
   });sync.current.start()
  const refresh=async()=>{const observations=await getAllZoneGwei();if(!alive.current)return;gas.current=Object.fromEntries(observations.map(o=>[o.zoneId,o.gwei]));setGasPrices(gas.current)}
  void refresh()
  const clock=setInterval(()=>sync.current?.advance(),1000)
  const synchronize=setInterval(()=>sync.current?.enqueue({type:'tick'}),5000)
  const oracle=setInterval(()=>void refresh(),60000)
  const flush=()=>journal.flush()
  const onVisibility=()=>{if(document.visibilityState==='hidden')flush()}
  const onOnline=()=>sync.current?.retry()
  window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',onVisibility);window.addEventListener('online',onOnline)
  return()=>{alive.current=false;clearInterval(clock);clearInterval(synchronize);clearInterval(oracle);sync.current?.dispose();journal.flush();sync.current=undefined;window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('online',onOnline)}
 // Identity is fixed by the keyed GameHUD. Reconciliation must not restart the transport on each projection.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[dispatch])

 return {state,dispatch,saveError:false,gas:gasPrices,serverError,pending:syncStatus.transitioning,shared:true,...syncStatus,retrySave:()=>sync.current?.retry()}
}
