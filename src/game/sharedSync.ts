import {reduceGame,settle,unlockEarnedZones,type Command} from './gameEngine'
import type {GameState,ZoneId} from './types'

export interface GameSnapshot {state:GameState;revision:number}
export interface PendingCommand {requestId:string;command:Command;at:number;conflicts:number;sent?:boolean}
export interface SyncRequest {tokenId:number;command:Command;revision:number;requestId:string}
export interface SyncResponse {status:number;snapshot?:GameSnapshot;error?:string}
export interface SyncView {state:GameState;saving:boolean;offline:boolean;queued:number;error:string}
interface Options {
 initial:GameSnapshot
 transport(request:SyncRequest):Promise<SyncResponse>
 onChange(view:SyncView):void
 gas():Partial<Record<ZoneId,number|null>>
 now?():number
 journal?(commands:PendingCommand[]):void
 restored?:PendingCommand[]
}
const movement=(c:Command)=>c.type==='walk'||c.type==='moveIndoor'
const MAX_COMMANDS=64

/** Only commands cross the wire. The server never trusts the projected balance or clock. */
export class SharedGameSync {
 private confirmed:GameSnapshot
 private commands:PendingCommand[]
 private inFlight:PendingCommand|null=null
 private retryTimer:ReturnType<typeof setTimeout>|undefined
 private attempts=0
 private stopped=false
 private error=''
 private offline=false
 private clock:()=>number
 constructor(private options:Options){this.confirmed=options.initial;this.commands=[...(options.restored??[])];this.clock=options.now??Date.now}
 start(){this.publish();void this.pump()}
 getSnapshot(){return this.confirmed}
 getPending(){return this.commands.map(q=>({...q}))}
 view(now=this.clock()):SyncView{
  let state=this.confirmed.state
  for(const q of this.commands){try{state=reduceGame(state,q.command,{now:Math.max(state.lastSaved,q.at),gas:this.options.gas()})}catch{/* A damaged local outbox must not crash play; the authority rejects invalid intents. */}}
  state=unlockEarnedZones(settle(state,{now:Math.max(now,state.lastSaved),gas:this.options.gas()}))
  return {state,saving:this.commands.length>0,offline:this.offline,queued:this.commands.length,error:this.error}
 }
 advance(){if(!this.stopped)this.publish()}
 enqueue(command:Command){
  if(this.stopped)return
  if(command.type==='tick'&&this.commands.length)return
  // Idle retries must never sit in front of a new user choice.
  if(command.type!=='tick')this.commands=this.commands.filter(q=>q===this.inFlight||q.command.type!=='tick')
  const last=this.commands[this.commands.length-1]
  if(movement(command)&&last&&last!==this.inFlight&&!last.sent&&last.command.type===command.type){last.command=command;last.at=this.clock();this.changed();return}
  if(this.commands.length>=MAX_COMMANDS){this.error='Your connection is catching up. Retry saving before adding more choices.';this.publish();return}
  this.commands.push({requestId:crypto.randomUUID(),command,at:this.clock(),conflicts:0})
  if(command.type!=='tick'&&!this.offline)this.error=''
  this.changed()
 }
 retry(){if(this.stopped)return;if(this.retryTimer!==undefined)clearTimeout(this.retryTimer);this.retryTimer=undefined;this.attempts=0;void this.pump()}
 dispose(){this.stopped=true;if(this.retryTimer!==undefined)clearTimeout(this.retryTimer);this.options.journal?.(this.getPending())}
 private publish(){this.options.onChange(this.view())}
 private changed(){this.options.journal?.(this.getPending());this.publish();void this.pump()}
 private async pump(){
  if(this.stopped||this.inFlight||this.retryTimer!==undefined||!this.commands.length)return
  const q=this.commands[0];q.sent=true;this.inFlight=q
  try{
   const response=await this.options.transport({tokenId:this.confirmed.state.tokenId,command:q.command,revision:this.confirmed.revision,requestId:q.requestId})
   if(this.stopped)return
   if(response.snapshot)this.confirmed=response.snapshot
   if(response.status===409&&response.snapshot&&q.conflicts<2){q.conflicts++;q.at=this.clock()}
   else if(response.status>=200&&response.status<300&&response.snapshot){this.commands.shift();this.offline=false;this.attempts=0;if(q.command.type!=='tick')this.error=''}
   else if(response.status===401||response.status===403){this.commands=[];this.offline=false;this.error=response.error??'Verify the current NFT owner before continuing.'}
   else if(response.status===429||response.status>=500)throw new Error(response.error??'The game service is temporarily unavailable.')
   else{this.commands.shift();this.offline=false;this.error=response.error??'That choice could not be saved. Your household has refreshed.'}
  }catch{
   if(this.stopped)return
   if(q.command.type==='tick'){this.commands.shift()}
   else{
    this.offline=true;this.attempts++;this.error='Connection interrupted. Your choices are queued and will retry in the background.'
    const delay=Math.min(15000,1000*2**Math.min(this.attempts-1,4))
    this.retryTimer=setTimeout(()=>{this.retryTimer=undefined;void this.pump()},delay)
   }
  }finally{
   this.inFlight=null
   if(!this.stopped){this.options.journal?.(this.getPending());this.publish();void this.pump()}
  }
 }
}

/** Outbox contains intents only; ownership, revisions and every command are checked by the server. */
export function restoreOutbox(raw:string|null):PendingCommand[]{
 try{
  const parsed=JSON.parse(raw??'[]');if(!Array.isArray(parsed)||parsed.length>MAX_COMMANDS)return []
  return parsed.filter((q:PendingCommand)=>q&&typeof q.requestId==='string'&&/^[a-f0-9-]{36}$/i.test(q.requestId)&&q.command&&typeof q.command.type==='string'&&Number.isSafeInteger(q.at)&&q.at>=0).map(q=>({...q,conflicts:0}))
 }catch{return []}
}
