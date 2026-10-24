import {ActivityEffects,activityGlyph} from './ActivityEffects'
import {furnitureView,partitionSegment} from './furnitureView'
import {MovementFeedback} from './MovementFeedback'
import {sampleJourney,WALK_KEYS} from './motion'
import {indoorTile} from '../game/household'
import {WorldCamera} from './WorldCamera'
import type {CameraCommand,CameraView} from './cameraControls'
import Phaser from 'phaser'
import {humanArtwork,npcArtwork,furnitureArtwork,materialArtwork,outdoorArtwork,architectureArtwork,loadArtwork,sizeHuman,type ArtAsset} from './artwork'
import {loadPetArtwork,setPetPose} from './petArtwork'
import {drawRoom,drawFurniture,drawPartition,houseIso,houseFromIso} from './anime'
import {type Command} from '../game/gameEngine'
import {activeBlueprint} from '../game/indoor'
import {FURNITURE,housePath,approachPath,entryTile,ROOM_STEP,houseWalkable,type Blueprint} from '../game/housing'
import {type FurnitureKind} from './interactions'
import type {ActionKind,GameState} from '../game/types'
import type {IndoorJourney} from '../game/household'
import type {Tile} from './navigation'
import {cityNpc,npcById,venueOf,type TOPICS} from '../game/places'
export type JobRequest=Extract<Command,{type:'startJob'}>
export interface RoomBridge {state():GameState;pending():boolean;dialogOpen():boolean;dispatch(c:Command):void;onObjectSelect(kind:FurnitureKind,id?:string):void;onNpcSelect(id:string):void;onMessage(text:string):void;onReady():void;onCameraChange(view:CameraView):void;avatarSvg:string}
export class RoomScene extends Phaser.Scene {
 private human!:Phaser.GameObjects.Image;private pet!:Phaser.GameObjects.Image;private bubble!:Phaser.GameObjects.Text
 private room:Phaser.GameObjects.GameObject[]=[];private signature='';private predicted:IndoorJourney|null=null
 private petTile:Tile={x:0,y:0};private petMoving=false;private pendingJob:JobRequest|null=null
 private pendingNpc:{id:string;topic:keyof typeof TOPICS}|null=null
 private cameraView?:WorldCamera
 cameraCommand(command:CameraCommand){this.cameraView?.command(command)}
 private route!:MovementFeedback;private hoverLabel!:Phaser.GameObjects.Text;private floorHint!:Phaser.GameObjects.Graphics;private humanShadow!:Phaser.GameObjects.Ellipse;private effects!:ActivityEffects;private activityRing!:Phaser.GameObjects.Graphics;private foregrounds=new Map<string,Phaser.GameObjects.Image>();private partitions:{view:Phaser.GameObjects.Graphics;mid:Tile}[]=[]
 private reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;private lastFrame=0;private lastKeyAt=0
 private poses:ArtAsset[]=[];private npcPoses:ArtAsset[]=[];private petKey=''
 constructor(private bridge:RoomBridge){super('home')}
 preload(){
  const s=this.bridge.state();this.poses=humanArtwork(s);loadArtwork(this,this.poses);loadArtwork(this,materialArtwork);loadArtwork(this,[architectureArtwork[0]]);if(s.location.interior?.environment==='park')loadArtwork(this,outdoorArtwork)
  for(const type of Object.keys(FURNITURE) as (keyof typeof FURNITURE)[])loadArtwork(this,[furnitureArtwork(type,0),furnitureArtwork(type,1)])
  this.petKey=loadPetArtwork(this,s,this.bridge.avatarSvg)
  const venue=venueOf(s.location.venue);if(venue&&s.currentZone!==5){this.npcPoses=npcArtwork(cityNpc(s.currentZone,venue));loadArtwork(this,[this.npcPoses[0]])}
 }

 create(){
  this.route=new MovementFeedback(this,houseIso);this.floorHint=this.add.graphics().setDepth(-185);this.effects=new ActivityEffects(this);this.activityRing=this.add.graphics().setDepth(2001);this.humanShadow=this.add.ellipse(0,0,25,10,0x3b3029,.18);this.hoverLabel=this.add.text(0,0,'',{fontSize:'11px',color:'#594b6b',backgroundColor:'#fffaf0',padding:{x:9,y:6}}).setOrigin(.5,1).setDepth(3000).setVisible(false)
  this.cameras.main.setBackgroundColor(activeBlueprint(this.bridge.state()).environment==='park'?'#dce5d2':'#e5dfd3');this.human=this.add.image(400,250,this.poses[0].key);sizeHuman(this.human,this.poses,0);this.pet=this.add.image(400,250,this.petKey);setPetPose(this.pet,this.petKey)
  this.bubble=this.add.text(0,0,'',{fontSize:'13px',color:'#736054',backgroundColor:'#fffaf0',padding:{x:7,y:3}}).setOrigin(.5,1).setDepth(2000);this.petTile=entryTile(activeBlueprint(this.bridge.state()))
  this.pet.setInteractive({useHandCursor:true}).on('pointerup',(_p:unknown,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.dialogOpen()||!this.cameraView?.canSelect())return;event.stopPropagation();this.bridge.onObjectSelect('pet')})
  this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(this.bridge.dialogOpen()||!this.cameraView?.canSelect()||pointer.event.target!==this.game.canvas||this.bridge.pending())return;this.walk(houseFromIso(pointer.worldX,pointer.worldY))});this.events.once('shutdown',()=>this.tweens.killAll())
  const onKey=(event:KeyboardEvent)=>{
   if(this.bridge.dialogOpen()||this.bridge.pending()||event.ctrlKey||event.metaKey||event.altKey)return
   const key=event.key.toLowerCase(),delta=WALK_KEYS[key]
   if(!delta&&key!=='e')return
   event.preventDefault();if(event.timeStamp-this.lastKeyAt<150)return;this.lastKeyAt=event.timeStamp
   const state=this.bridge.state();if(event.repeat&&state.household?.journey&&Date.now()<state.household.journey.endsAt)return
   const b=activeBlueprint(state),tile=indoorTile(state.household!,Date.now())
   if(delta)this.walk({x:tile.x+delta.x,y:tile.y+delta.y})
   else{const objects=b.objects.filter(o=>!o.stored).map(o=>({o,path:approachPath(b,tile,o)})).filter(o=>o.path!==null).sort((a,z)=>a.path!.length-z.path!.length);const object=objects[0]?.o;if(object)this.bridge.onObjectSelect(FURNITURE[object.type].family as FurnitureKind,object.id)}
  }
  this.game.canvas.addEventListener('keydown',onKey);this.game.canvas.setAttribute('aria-label','Walk with WASD. E opens the nearest object. Drag to pan, scroll to zoom.')
  this.events.once('shutdown',()=>this.game.canvas.removeEventListener('keydown',onKey))
  const s=this.bridge.state(),venue=venueOf(s.location.venue);if(venue&&s.currentZone!==5){const npc=cityNpc(s.currentZone,venue),p=houseIso(npc);this.add.image(p.x,p.y,this.npcPoses[0].key).setOrigin(.5,.985).setDisplaySize(97*this.npcPoses[0].width/this.npcPoses[0].height,97).setDepth(p.y+3).setInteractive({useHandCursor:true}).on('pointerup',(_p:unknown,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.dialogOpen()||!this.cameraView?.canSelect())return;event.stopPropagation();this.bridge.onNpcSelect(npc.id)});this.add.text(p.x,p.y-105,npc.name,{fontSize:'11px',color:'#6a557d',backgroundColor:'#fffbef',padding:{x:5,y:3}}).setOrigin(.5,1).setDepth(p.y+4)}
  this.cameraView=new WorldCamera(this,()=>this.fitRoom(),view=>this.bridge.onCameraChange(view),.45,3.5)
  this.bridge.onReady()
 }
 private walk(target:Tile){const s=this.bridge.state(),h=s.household!;if(s.action||s.job||h.pendingUse){this.bridge.onMessage('Choose another object to queue an action, or cancel your current activity to walk.');return}const origin=indoorTile(h,Date.now()),path=housePath(activeBlueprint(s),origin,target);if(!path){this.bridge.onMessage('A wall or furnishing blocks that route.');return}this.pendingJob=null;this.pendingNpc=null;this.predicted={from:origin,path,startedAt:Date.now(),endsAt:Date.now()+path.length*ROOM_STEP};this.bridge.dispatch({type:'moveIndoor',target})}
 request(kind:ActionKind,id?:string){const s=this.bridge.state(),object=activeBlueprint(s).objects.find(o=>!o.stored&&(id?o.id===id:(FURNITURE[o.type].actions as readonly string[]).includes(kind)));if(!object){this.bridge.onMessage('Buy the required furniture, or visit a city service.');return}this.bridge.dispatch({type:'enqueueAction',objectId:object.id,kind})}
 requestJob(command:JobRequest){const s=this.bridge.state(),b=activeBlueprint(s),desk=b.objects.find(o=>o.type==='desk'&&!o.stored);if(!desk){this.bridge.onMessage('Place a desk or visit a city workplace first.');return}const path=approachPath(b,s.household!.humanTile,desk);if(!path)return;if(s.action||s.job||s.household?.pendingUse){this.bridge.onMessage('Finish or cancel your activity before starting a challenge.');return}if(path.length)this.walk(path[path.length-1]);this.pendingJob=command}
 requestNpc(id:string,topic:keyof typeof TOPICS){const s=this.bridge.state(),npc=npcById(id);if(!npc)return;const b=activeBlueprint(s),paths=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>housePath(b,s.household!.humanTile,{x:npc.x+dx,y:npc.y+dy})).filter((p):p is Tile[]=>p!==null).sort((a,z)=>a.length-z.length);if(!paths.length){this.bridge.onMessage('There is no clear route to this person.');return}if(s.action||s.job||s.household?.pendingUse){this.bridge.onMessage('Finish or cancel your activity before a conversation.');return}if(paths[0].length)this.walk(paths[0][paths[0].length-1]);this.pendingNpc={id,topic}}
 cancel(){this.pendingJob=null;this.pendingNpc=null;this.predicted=null;this.bridge.dispatch({type:'cancel'})}
 private fitRoom(){const b=activeBlueprint(this.bridge.state());this.cameras.main.setZoom(Math.min(1.5,660/((b.width+b.height)*25),420/((b.width+b.height)*13+135))).centerOn(400+(b.width-b.height)*12.5,115+(b.width+b.height-2)*6.5-60)}
 private rebuild(b:Blueprint){
  for(const o of this.room)o.destroy();this.room=[];this.foregrounds.clear();this.partitions=[];this.hoverLabel.setVisible(false);this.floorHint.clear();this.room.push(drawRoom(this,b,this.bridge.state().home.style))
  for(const o of b.objects.filter(o=>!o.stored)){const sprite=drawFurniture(this,o,b.environment),family=FURNITURE[o.type].family as FurnitureKind;sprite.on('pointerup',(pointer:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.dialogOpen()||!this.cameraView?.canSelect()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.onObjectSelect(family,o.id)});sprite.on('pointerover',()=>{if(this.bridge.dialogOpen()||!this.cameraView?.canSelect())return;const d=FURNITURE[o.type],w=o.rotation?d.h:d.w,h=o.rotation?d.w:d.h,p=houseIso({x:o.x+(w-1)/2,y:o.y+(h-1)/2});(sprite.list[1] as Phaser.GameObjects.Image).setTint(0xf0e1ff);this.hoverLabel.setText(`${d.label} · choose an action`).setPosition(p.x,p.y-90).setVisible(true);const corners=[{x:o.x-.5,y:o.y-.5},{x:o.x+w-.5,y:o.y-.5},{x:o.x+w-.5,y:o.y+h-.5},{x:o.x-.5,y:o.y+h-.5}].map(houseIso);this.floorHint.clear().lineStyle(2,0xab7ec4,.9).strokePoints(corners,true)})
   sprite.on('pointerout',()=>{(sprite.list[1] as Phaser.GameObjects.Image).clearTint();this.hoverLabel.setVisible(false);this.floorHint.clear()});this.room.push(sprite)
   if(o.type==='bed'||o.type==='shower'){const v=furnitureView(o,b.environment),cut=o.type==='bed'?.48:.63,layer=this.add.image(v.x,v.y+v.baseY,v.asset.key).setDisplaySize(v.width,v.height).setOrigin(.5,1).setFlipX(v.flipX).setCrop(0,Math.round(v.asset.height*cut),v.asset.width,v.asset.height-Math.round(v.asset.height*cut)).setDepth(v.depth+5).setVisible(false);if(o.type==='shower')layer.setAlpha(.45);this.foregrounds.set(o.id,layer);this.room.push(layer)}
  }
  for(const w of b.walls){const view=drawPartition(this,w),[a,z]=partitionSegment(w);this.room.push(view);this.partitions.push({view,mid:{x:(a.x+z.x)/2,y:(a.y+z.y)/2}})}
 }
 update(time:number){
  if(!this.human)return;const s=this.bridge.state(),h=s.household;if(!h)return;const b=activeBlueprint(s),now=Date.now(),signature=JSON.stringify([b,s.home.style]);this.input.enabled=!this.bridge.dialogOpen()
  if(signature!==this.signature){this.signature=signature;this.rebuild(b);if(!houseWalkable(b,this.petTile))this.petTile=entryTile(b)}
  if(!this.bridge.pending())this.predicted=null
  const journey=this.predicted??h.journey,motion=sampleJourney(journey,h.humanTile,now,ROOM_STEP),t=motion.tile,p=houseIso(t);if(motion.moving)this.lastFrame=motion.frame;let frame=this.lastFrame
  this.route.render(journey,motion.index,time,this.reducedMotion)
  const gait=this.reducedMotion?0:motion.moving?Math.sin(time/65):Math.sin(time/650)*.18
  this.human.setPosition(p.x,p.y-Math.abs(gait)*(motion.moving?2.3:.7)).setDepth(p.y+3)
  this.humanShadow.setPosition(p.x,p.y+1).setDepth(p.y+1).setScale(motion.moving?1-Math.abs(gait)*.12:1)
  this.game.canvas.dataset.humanFrame=String(frame);this.game.canvas.dataset.walking=String(motion.moving)
  this.game.canvas.dataset.destination=journey?.path.length?JSON.stringify(journey.path[journey.path.length-1]):''
  let resting=false
  if(s.action?.objectId){const o=b.objects.find(o=>o.id===s.action!.objectId);if(o){
   const settleIn=this.reducedMotion?1:Math.min(1,Math.max(0,(now-s.action.startedAt)/220)),d=FURNITURE[o.type],w=o.rotation?d.h:d.w,height=o.rotation?d.w:d.h,seat=houseIso({x:o.x+(w-1)/2,y:o.y+(height-1)/2})
   if(o.type==='bed'||o.type==='desk'||o.type==='sofa'){
    frame=o.type==='bed'?5:4;sizeHuman(this.human,this.poses,frame)
    this.human.setPosition(Phaser.Math.Linear(p.x,seat.x+(frame===5?(o.rotation?15:-15):0),settleIn),Phaser.Math.Linear(p.y,seat.y+(frame===5?-30:13),settleIn)).setDepth(houseIso({x:o.x+w-1,y:o.y+height-1}).y+4)
    if(frame===5){this.human.setAngle(o.rotation?27:-27).setFlipX(!o.rotation);resting=true}
   }else if(o.type==='shower'){this.human.setPosition(Phaser.Math.Linear(p.x,seat.x,settleIn),Phaser.Math.Linear(p.y,seat.y+8,settleIn)).setDepth(furnitureView(o).depth+3);frame=2}else{frame=seat.y<p.y?2:0}
  }}

  if(!resting){sizeHuman(this.human,this.poses,frame);if(!this.reducedMotion){this.human.setScale(this.human.scaleX*(1+gait*.012),this.human.scaleY*(1-gait*.012));this.human.setAngle(motion.moving?gait*1.5:s.action?Math.sin(time/220)*.6:0)}}
  this.humanShadow.setVisible(!s.action||!['bed','desk','sofa'].includes(b.objects.find(o=>o.id===s.action?.objectId)?.type??''))
  const activeObject=b.objects.find(o=>o.id===s.action?.objectId)
  this.effects.render(s.action?.kind,activeObject,this.human,time,this.reducedMotion)
  for(const[id,layer]of this.foregrounds)layer.setVisible(s.action?.objectId===id)
  for(const wall of this.partitions)wall.view.setAlpha(this.human.y<wall.mid.y+8&&Math.abs(this.human.x-wall.mid.x)<40?.32:1)
  this.bubble.setText(s.action?activityGlyph(s.action.kind):'').setPosition(this.human.x,this.human.y-(resting?35:105)).setVisible(!!s.action)
  this.activityRing.clear();if(s.action){const fraction=Math.max(0,Math.min(1,(now-s.action.startedAt)/(s.action.endsAt-s.action.startedAt))),x=this.human.x+20,y=this.human.y-(resting?45:115);this.activityRing.lineStyle(2,0xd5c9b8,.8).strokeCircle(x,y,7).lineStyle(2,0x7fa18d).beginPath().arc(x,y,7,-Math.PI/2,-Math.PI/2+Math.PI*2*fraction,false).strokePath()}
  this.game.canvas.dataset.activity=s.action?.kind??(motion.moving?'walking':'idle')
  const petHere=s.location.kind==='home'||h.pet.following;this.pet.setVisible(petHere)
  if(!this.petMoving&&petHere){const target=h.pet.following?{x:Math.round(t.x),y:Math.round(t.y)}:entryTile(b),path=housePath(b,this.petTile,target);if(path&&path.length>1){const next=path[0],z=houseIso(next);this.petMoving=true;setPetPose(this.pet,this.petKey,next.x>this.petTile.x?1:next.y<this.petTile.y?2:next.x<this.petTile.x?3:0);this.tweens.add({targets:this.pet,x:z.x-9,y:z.y,duration:ROOM_STEP,onUpdate:()=>this.pet.setDepth(this.pet.y+4),onComplete:()=>{this.petTile=next;this.petMoving=false}})}else{const z=houseIso(this.petTile);this.pet.setPosition(z.x-9,z.y+(this.reducedMotion?0:Math.sin(time/250)*.5)).setDepth(z.y+4)}}
  if(!s.action&&!s.job&&!h.journey&&!h.pendingUse&&!this.bridge.pending()){if(this.pendingJob){const command=this.pendingJob;this.pendingJob=null;this.bridge.dispatch(command)}else if(this.pendingNpc){const npc=this.pendingNpc;this.pendingNpc=null;this.bridge.dispatch({type:'talkNpc',npcId:npc.id,topic:npc.topic})}}
 }
}
