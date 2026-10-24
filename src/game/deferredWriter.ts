/** Coalesce browser persistence after input/paint. Lifecycle flushes keep reloads durable. */
export class DeferredWriter<T> {
 private value:T|null=null
 private timer:ReturnType<typeof setTimeout>|undefined
 private idle:number|undefined
 constructor(private write:(value:T)=>boolean,private onResult:(ok:boolean)=>void=()=>{}){}
 schedule(value:T){
  this.value=value
  if(this.timer!==undefined||this.idle!==undefined)return
  this.timer=setTimeout(()=>{this.timer=undefined;if(typeof globalThis.requestIdleCallback==='function')this.idle=globalThis.requestIdleCallback(()=>{this.idle=undefined;this.flush()},{timeout:400});else this.flush()},80)
 }
 flush():boolean{
  if(this.timer!==undefined)clearTimeout(this.timer)
  if(this.idle!==undefined)globalThis.cancelIdleCallback?.(this.idle)
  this.timer=undefined;this.idle=undefined
  if(this.value===null)return true
  const value=this.value;this.value=null
  let ok=false;try{ok=this.write(value)}catch{/* Report storage denial without interrupting play. */}
  this.onResult(ok);return ok
 }
}
