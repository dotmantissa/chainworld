import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState, ZoneId } from '../game/types'
import { reduceGame, settle, unlockEarnedZones, type Command } from '../game/gameEngine'
import { saveGameState } from '../game/persistence'
import { getAllZoneGwei, getZoneGwei } from '../game/zones'
export interface ServerSnapshot { state: GameState; revision: number }
export async function api<T>(url:string,options:RequestInit={},timeout=25000):Promise<T> {
  let response:Response
  try{response=await fetch(url,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers},signal:options.signal??AbortSignal.timeout(timeout)})}
  catch(error){if(error instanceof DOMException&&error.name==='TimeoutError')throw new Error('The game took too long to respond. Try again; your stored progress is safe.');throw error}
  const json=await response.json()
  if(!response.ok)throw new Error(json.error??'The game service is unavailable')
  return json as T
}
export function useGameController(initial: GameState, serverRevision?:number) {
  const shared=serverRevision!==undefined
  const [state,setState]=useState(()=>shared?initial:unlockEarnedZones(settle(initial,{now:Date.now(),gas:{}},true)))
  const [saveError,setSaveError]=useState(false)
  const [serverError,setServerError]=useState('')
  const [pending,setPending]=useState(false)
  const current=useRef(state),revision=useRef(serverRevision??0)
  const gas=useRef<Partial<Record<ZoneId,number|null>>>({})
  const [gasPrices,setGasPrices]=useState<Partial<Record<ZoneId,number|null>>>({})
  const alive=useRef(true)
  const queue=useRef(Promise.resolve())
  const queuedCount=useRef(0)
  const resolving=useRef<number|null>(null)
  const update=useCallback((next:GameState,rev?:number)=>{
    if(!alive.current)return
    current.current=next;setState(next)
    if(rev!==undefined)revision.current=rev
    else setSaveError(!saveGameState(next))
  },[])
  const dispatch=useCallback((command:Command)=>{
    if(!shared){update(unlockEarnedZones(reduceGame(current.current,command,{now:Date.now(),gas:gas.current})));return}
    if(command.type==='tick'&&queuedCount.current>0)return
    queuedCount.current+=1
    const requestId=crypto.randomUUID()
    setPending(true)
    queue.current=queue.current.then(async()=>{
      if(!alive.current)return
      for(let attempt=0;attempt<2;attempt++){
        let response:Response
        try{response=await fetch('/api/game',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({tokenId:current.current.tokenId,command,revision:revision.current,requestId}),signal:AbortSignal.timeout(25000)})}
        catch(error){if(attempt===0)continue;throw error}
        const result=await response.json() as ServerSnapshot & {error?:string}
        if(response.status===409){update(result.state,result.revision);if(command.type!=='tick')setServerError('Progress changed in another tab. Your world has refreshed; choose the action again.');return}
        if(!response.ok)throw new Error(result.error??'Game command failed')
        update(result.state,result.revision);setServerError('');return
      }
      throw new Error('Another tab is active. Please retry your action.')
    }).catch(error=>{if(alive.current)setServerError(error instanceof Error?error.message:'Could not reach the game server')}).finally(()=>{queuedCount.current-=1;if(alive.current)setPending(queuedCount.current>0)})
  },[shared,update])
  useEffect(()=>{
    alive.current=true
    let initialized=true
    const refresh=async()=>{
      const observations=await getAllZoneGwei()
      if(!alive.current)return
      if(!shared){
        if(initialized)dispatch({type:'tick'})
        else{update(settle(current.current,{now:Date.now(),gas:Object.fromEntries(observations.map(o=>[o.zoneId,o.gwei]))},true));initialized=true}
      }
      gas.current=Object.fromEntries(observations.map(o=>[o.zoneId,o.gwei]));setGasPrices(gas.current)
    }
    void refresh()
    const clock=setInterval(()=>{if(initialized)dispatch({type:'tick'})},shared?5000:1000)
    const oracle=setInterval(()=>void refresh(),60000)
    const flush=()=>{if(initialized&&!shared)dispatch({type:'tick'})}
    window.addEventListener('pagehide',flush)
    return()=>{alive.current=false;clearInterval(clock);clearInterval(oracle);window.removeEventListener('pagehide',flush)}
  },[dispatch,shared,update])
  useEffect(()=>{
    const job=state.job
    if(shared||!job||job.kind!=='grifter'||state.lastSaved<job.endsAt||resolving.current===job.id)return
    resolving.current=job.id
    void getZoneGwei(job.zone,true).then(quote=>{
      if(alive.current)dispatch({type:'resolveGrifter',sessionId:job.id,wei:quote.wei,fetchedAt:quote.fetchedAt,stale:quote.stale})
    }).finally(()=>{if(resolving.current===job.id)resolving.current=null})
  },[shared,state.job,state.lastSaved,dispatch])
  return {state,dispatch,saveError,gas:gasPrices,serverError,pending,shared}
}
