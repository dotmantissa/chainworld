import type Phaser from 'phaser'
import type {GameState} from '../game/types'
import type {Command} from '../game/gameEngine'
import {type Furniture} from '../game/housing'
import {buildPreview,type BuildTool,type BuildPreview} from './buildTools'
import {houseIso,houseFromIso} from './anime'
import {furnitureView,partitionSegment} from './furnitureView'
export interface BuilderBridge {state():GameState;tool():BuildTool;setTool(t:BuildTool):void;gas():number|null|undefined;dispatch(c:Command):void;message(s:string):void;blocked():boolean}
/** Editing is transient until a valid drop; normal play never enters this input path. */
export class RoomBuilder {
 private grid:Phaser.GameObjects.Graphics;private outline:Phaser.GameObjects.Graphics;private ghost:Phaser.GameObjects.Image;private caption:Phaser.GameObjects.Text
 private preview:BuildPreview|null=null;private pointer={x:400,y:250};private drag:{id:string;tool:BuildTool;offsetX:number;offsetY:number;startX:number;startY:number;moved:boolean;version:number}|null=null;private cleanups:(()=>void)[]=[];private pointerClaims=new Set<number>();private multitouch=false;private lastVersion=0;private lastTool=''
 constructor(private scene:Phaser.Scene,private bridge:BuilderBridge){
  this.grid=scene.add.graphics().setDepth(-180);this.outline=scene.add.graphics().setDepth(900);this.ghost=scene.add.image(0,0,'__WHITE').setOrigin(.5,1).setAlpha(.65).setDepth(901).setVisible(false);this.caption=scene.add.text(0,0,'',{fontSize:'12px',backgroundColor:'#fffaf1',color:'#4d4842',padding:{x:7,y:5}}).setOrigin(.5,1).setDepth(902).setVisible(false)
  const canvas=scene.game.canvas,listen=(name:string,handler:EventListener)=>{canvas.addEventListener(name,handler);this.cleanups.push(()=>canvas.removeEventListener(name,handler))}
  listen('pointerdown',((e:PointerEvent)=>{if(!this.pointerClaims.size)this.multitouch=false;this.pointerClaims.add(e.pointerId);if(this.pointerClaims.size>1){this.multitouch=true;this.cancel()}}) as EventListener)
  listen('pointermove',((e:PointerEvent)=>{this.pointer=this.world(e.clientX,e.clientY);if(this.drag&&Math.hypot(e.clientX-this.drag.startX,e.clientY-this.drag.startY)>6)this.drag.moved=true}) as EventListener)
  listen('pointerup',((e:PointerEvent)=>{this.pointerClaims.delete(e.pointerId);if(!bridge.state().buildMode||bridge.blocked()||this.pointerClaims.size||this.multitouch)return;this.pointer=this.world(e.clientX,e.clientY);if(this.drag){if(this.drag.moved)this.commit();this.drag=null}else if(this.preview&&bridge.tool().kind!=='select'&&e.button===0)this.commit()}) as EventListener)
  listen('pointercancel',(()=>this.cancel()) as EventListener)
  listen('keydown',((e:KeyboardEvent)=>{if(!bridge.state().buildMode||bridge.blocked())return;const delta=({w:{x:0,y:-1},a:{x:-1,y:0},s:{x:0,y:1},d:{x:1,y:0}} as Record<string,{x:number;y:number}>)[e.key.toLowerCase()];if(delta){e.preventDefault();const tile=houseFromIso(this.pointer.x,this.pointer.y),b=bridge.state().household!.blueprint;this.pointer=houseIso({x:Math.max(0,Math.min(b.width-1,tile.x+delta.x)),y:Math.max(0,Math.min(b.height-1,tile.y+delta.y))});return}if(e.key==='Enter'){e.preventDefault();this.commit();return}if(e.key.toLowerCase()==='r'){e.preventDefault();const t=this.drag?.tool??bridge.tool();if(t.kind==='place'){const tool={...t,rotation:(t.rotation?0:1) as 0|1};if(this.drag)this.drag.tool=tool;else bridge.setTool(tool)}else if(t.kind==='select'&&t.id){const o=bridge.state().household!.blueprint.objects.find(o=>o.id===t.id);if(o)bridge.setTool({kind:'place',id:o.id,type:o.type,rotation:o.rotation?0:1})}}if(e.key==='Escape'){e.preventDefault();if(this.drag||bridge.tool().kind!=='select'||(bridge.tool() as {id?:string}).id)this.cancel();else bridge.dispatch({type:'setBuildMode',enabled:false})}}) as EventListener)
  scene.events.once('shutdown',()=>{for(const off of this.cleanups)off()})
 }
 private world(clientX:number,clientY:number){const rect=this.scene.game.canvas.getBoundingClientRect();return this.scene.cameras.main.getWorldPoint((clientX-rect.left)*800/rect.width,(clientY-rect.top)*500/rect.height)}
 private pick(x:number,y:number):Furniture|undefined{
  const s=this.bridge.state(),objects=s.household!.blueprint.objects.filter(o=>!o.stored).sort((a,b)=>furnitureView(b).depth-furnitureView(a).depth)
  return objects.find(o=>{const v=furnitureView(o),left=v.x-v.width/2,top=v.y+v.baseY-v.height;if(x<left||x>left+v.width||y<top||y>top+v.height)return false;const px=Math.floor((x-left)/v.width*v.asset.width),py=Math.floor((y-top)/v.height*v.asset.height);return (this.scene.textures.getPixelAlpha(v.flipX?v.asset.width-1-px:px,py,v.asset.key)??0)>70})
 }
 claim(clientX:number,clientY:number,button:number):boolean{
  const s=this.bridge.state();if(!s.buildMode||this.bridge.blocked()||button!==0)return false
  this.pointer=this.world(clientX,clientY);const tool=this.bridge.tool()
  if(tool.kind!=='select')return true
  const o=this.pick(this.pointer.x,this.pointer.y);if(!o){this.bridge.setTool({kind:'select'});return false}
  const p=houseIso(o);this.drag={id:o.id,tool:{kind:'place',id:o.id,type:o.type,rotation:o.rotation},offsetX:this.pointer.x-p.x,offsetY:this.pointer.y-p.y,startX:clientX,startY:clientY,moved:false,version:s.household!.blueprint.version};this.bridge.setTool({kind:'select',id:o.id});return true
 }
 cancel(){this.drag=null;this.preview=null;this.bridge.setTool({kind:'select'});this.ghost.setVisible(false);this.caption.setVisible(false);this.outline.clear()}
 private commit(){
  this.refreshPreview();const p=this.preview;if(!p)return
  if(this.drag&&this.drag.version!==this.bridge.state().household!.blueprint.version){this.bridge.message('Your home changed while dragging. Select the item again.');this.cancel();return}
  if(p.valid){this.bridge.dispatch(p.command);if(p.command.type!=='editWall')this.bridge.setTool({kind:'select',id:p.object?.id==='preview'?undefined:p.object?.id})}
  else this.bridge.message(p.message)
  this.preview=null
 }
 private refreshPreview(){const tool=this.drag?.tool??this.bridge.tool(),point=this.drag?{x:this.pointer.x-this.drag.offsetX,y:this.pointer.y-this.drag.offsetY}:this.pointer,tile=houseFromIso(point.x,point.y);this.preview=buildPreview(this.bridge.state(),tool,tile.x,tile.y,this.bridge.gas())}
 update(){
  const s=this.bridge.state(),canvas=this.scene.game.canvas,active=!!s.buildMode&&!this.bridge.blocked();canvas.dataset.buildMode=String(!!s.buildMode)
  canvas.dataset.buildTarget='';this.grid.setVisible(active);this.outline.clear();this.ghost.setVisible(false);this.caption.setVisible(false)
  if(!active){this.drag=null;this.preview=null;return}
  const b=s.household!.blueprint,tool=this.bridge.tool()
  if(this.lastVersion!==b.version||this.lastTool!==JSON.stringify(tool)){if(tool.kind==='place'&&tool.id&&!this.drag&&this.lastTool.includes('select')){const o=b.objects.find(o=>o.id===tool.id);if(o)this.pointer=houseIso(o)}this.lastVersion=b.version;this.lastTool=JSON.stringify(tool);this.grid.clear().lineStyle(1,0x7d8b8d,.3);for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++)this.grid.strokePoints([{x:x-.5,y:y-.5},{x:x+.5,y:y-.5},{x:x+.5,y:y+.5},{x:x-.5,y:y+.5}].map(houseIso),true)}
  if(tool.kind==='select'&&tool.id&&!this.drag){const o=b.objects.find(o=>o.id===tool.id&&!o.stored);if(o){const v=furnitureView(o);this.outline.lineStyle(2,0xd4a947).strokePoints([{x:o.x-.5,y:o.y-.5},{x:o.x+v.w-.5,y:o.y-.5},{x:o.x+v.w-.5,y:o.y+v.h-.5},{x:o.x-.5,y:o.y+v.h-.5}].map(houseIso),true)}}
  this.refreshPreview();const p=this.preview;if(!p)return
  const color=p.valid?0x589879:0xc2655e
  if(p.object){const o=p.object,v=furnitureView(o);this.ghost.setTexture(v.asset.key).setPosition(v.x,v.y+v.baseY).setDisplaySize(v.width,v.height).setFlipX(v.flipX).setTint(p.valid?0xcfffe4:0xffb0a7).setVisible(true);this.outline.lineStyle(2,color).strokePoints([{x:o.x-.5,y:o.y-.5},{x:o.x+v.w-.5,y:o.y-.5},{x:o.x+v.w-.5,y:o.y+v.h-.5},{x:o.x-.5,y:o.y+v.h-.5}].map(houseIso),true);canvas.dataset.buildTarget=JSON.stringify({x:o.x,y:o.y,valid:p.valid,type:o.type})}
  else if(p.command.type==='editWall'){const[a,z]=partitionSegment(p.command);this.outline.lineStyle(5,color,.8).lineBetween(a.x,a.y,z.x,z.y)}
  this.caption.setText(p.message).setPosition(this.pointer.x,this.pointer.y-35).setColor(p.valid?'#386a51':'#943d38').setVisible(true)
 }
}
