export interface CameraView {zoom:number;panMode:boolean}
export type CameraCommand='zoomIn'|'zoomOut'|'reset'|'left'|'right'|'up'|'down'|'panMode'
export interface CameraDriver {
 zoomBy(factor:number,x:number,y:number):void
 panBy(dx:number,dy:number):void
 reset():void
 setPanMode(value:boolean):void
 cancelClaim?():void
 claimPointer?(x:number,y:number,button:number):boolean
 view():CameraView
}

/** Native pointer gestures are shared by Phaser scenes and the DOM world directory. */
export class CameraGestures {
 private claimed=new Set<number>()
 private pointers=new Map<number,{x:number;y:number}>()
 private start:{x:number;y:number;button:number}|null=null
 private moved=false
 private suppressUntil=0
 private cleanup:(()=>void)[]=[]
 constructor(private element:HTMLElement,private driver:CameraDriver){
  const listen=<K extends keyof HTMLElementEventMap>(event:K,handler:(e:HTMLElementEventMap[K])=>void,options?:AddEventListenerOptions)=>{
   element.addEventListener(event,handler,options);this.cleanup.push(()=>element.removeEventListener(event,handler,options))
  }
  listen('pointerdown',e=>{
   if(e.pointerType==='mouse')element.focus({preventScroll:true})
   if(!this.pointers.size&&!this.driver.view().panMode&&this.driver.claimPointer?.(e.clientX,e.clientY,e.button)){this.claimed.add(e.pointerId);this.moved=false;this.suppressUntil=0}
   if(!this.pointers.size){this.suppressUntil=0;this.start={x:e.clientX,y:e.clientY,button:e.button};this.moved=this.driver.view().panMode||e.button!==0}
   this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})
   if(this.pointers.size>1){this.moved=true;this.claimed.clear();this.driver.cancelClaim?.()}
   const target=e.target instanceof HTMLElement?e.target:element
   target.setPointerCapture(e.pointerId)
  },{capture:true})
  listen('pointermove',e=>{
   const previous=this.pointers.get(e.pointerId);if(!previous)return
   if(this.claimed.has(e.pointerId)){this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});return}
   const before=[...this.pointers.values()];this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const after=[...this.pointers.values()]
   if(this.pointers.size>1){
    this.moved=true
    const distance=(p:{x:number;y:number}[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)
    const oldDistance=distance(before),newDistance=distance(after),rect=element.getBoundingClientRect()
    if(oldDistance>4)this.driver.zoomBy(newDistance/oldDistance,(after[0].x+after[1].x)/2-rect.left,(after[0].y+after[1].y)/2-rect.top)
    this.driver.panBy((before[0].x+before[1].x-after[0].x-after[1].x)/2,(before[0].y+before[1].y-after[0].y-after[1].y)/2)
   }else{
    if(this.start&&Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)>6)this.moved=true
    if(this.moved)this.driver.panBy(previous.x-e.clientX,previous.y-e.clientY)
   }
  },{capture:true})
  const end=(e:PointerEvent)=>{
   if(!this.pointers.has(e.pointerId))return
   if(this.moved||this.pointers.size>1)this.suppressUntil=Date.now()+350
   this.pointers.delete(e.pointerId);this.claimed.delete(e.pointerId)
   if(!this.pointers.size)this.start=null
   const target=e.target instanceof HTMLElement?e.target:element
   if(target.hasPointerCapture(e.pointerId))target.releasePointerCapture(e.pointerId)
  }
  listen('pointerup',end,{capture:true});listen('pointercancel',e=>{this.moved=true;end(e)},{capture:true})
  listen('wheel',e=>{e.preventDefault();const rect=element.getBoundingClientRect();this.driver.zoomBy(Math.exp(-Math.max(-300,Math.min(300,e.deltaY))*.002),e.clientX-rect.left,e.clientY-rect.top)},{passive:false})
  listen('contextmenu',e=>e.preventDefault())
  listen('keydown',e=>{
   const command:CameraCommand|undefined=({ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down','+':'zoomIn','=':'zoomIn','-':'zoomOut','0':'reset',Home:'reset',p:'panMode',P:'panMode'} as Record<string,CameraCommand>)[e.key]
   if(command){e.preventDefault();this.command(command)}
  })
 }
 canSelect():boolean{return !this.driver.view().panMode&&!this.moved&&Date.now()>this.suppressUntil}
 command(command:CameraCommand){
  const rect=this.element.getBoundingClientRect()
  if(command==='zoomIn'||command==='zoomOut')this.driver.zoomBy(command==='zoomIn'?1.2:1/1.2,rect.width/2,rect.height/2)
  else if(command==='reset')this.driver.reset()
  else if(command==='panMode')this.driver.setPanMode(!this.driver.view().panMode)
  else this.driver.panBy(command==='left'?-80:command==='right'?80:0,command==='up'?-80:command==='down'?80:0)
 }
 destroy(){for(const remove of this.cleanup)remove();this.pointers.clear()}
}
