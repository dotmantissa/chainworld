import Phaser from 'phaser'
import {svgDataUri} from './svg'
import {humanFor} from './human'
import {drawRoom,drawFurniture,houseIso,houseFromIso} from './anime'
import {ACTIONS,type Command} from '../game/gameEngine'
import {activeBlueprint} from '../game/indoor'
import {FURNITURE,housePath,approachPath,entryTile,ROOM_STEP,houseWalkable,type Blueprint} from '../game/housing'
import {furnitureFor,type FurnitureKind} from './interactions'
import type {ActionKind,GameState} from '../game/types'
import type {IndoorJourney} from '../game/household'
import type {Tile} from './navigation'
export type JobRequest=Extract<Command,{type:'startJob'}>
export interface RoomBridge {state():GameState;pending():boolean;dialogOpen():boolean;dispatch(c:Command):void;onObjectSelect(kind:FurnitureKind,id?:string):void;onQueue(labels:string[]):void;onMessage(text:string):void;avatarSvg:string}
export class RoomScene extends Phaser.Scene {
 private human!:Phaser.GameObjects.Image;private pet!:Phaser.GameObjects.Image;private bubble!:Phaser.GameObjects.Text
 private room:Phaser.GameObjects.GameObject[]=[];private signature='';private predicted:IndoorJourney|null=null
 private petTile:Tile={x:0,y:0};private petMoving=false;private queue:{kind:ActionKind;id?:string}[]=[];private pendingJob:JobRequest|null=null;private lastFrame=-1
 constructor(private bridge:RoomBridge){super('home')}
 preload(){for(let i=0;i<6;i++)this.load.svg(`human-${i}`,svgDataUri(humanFor(this.bridge.state(),i)),{width:192,height:320});this.load.svg('chog-pet',svgDataUri(this.bridge.avatarSvg),{width:144,height:168})}
 create(){
  this.cameras.main.setBackgroundColor('#ede8df');this.human=this.add.image(400,250,'human-0').setOrigin(.5,.94).setDisplaySize(44,74);this.pet=this.add.image(400,250,'chog-pet').setOrigin(.5,.9).setDisplaySize(31,36)
  this.bubble=this.add.text(0,0,'',{fontSize:'11px',color:'#594b6b',backgroundColor:'#fffaf0',padding:{x:8,y:5}}).setOrigin(.5,1).setDepth(2000);this.petTile=entryTile(activeBlueprint(this.bridge.state()))
  this.pet.setInteractive({useHandCursor:true}).on('pointerdown',(_p:unknown,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.dialogOpen())return;event.stopPropagation();this.bridge.onObjectSelect('pet')})
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(this.bridge.dialogOpen()||pointer.event.target!==this.game.canvas||this.bridge.pending())return;this.walk(houseFromIso(pointer.worldX,pointer.worldY))});this.events.once('shutdown',()=>this.tweens.killAll())
 }
 private walk(target:Tile){const s=this.bridge.state(),h=s.household!;if(s.action||s.job||h.journey||h.pendingUse)return;const path=housePath(activeBlueprint(s),h.humanTile,target);if(!path){this.bridge.onMessage('A wall or furnishing blocks that route.');return}this.predicted={from:h.humanTile,path,startedAt:Date.now(),endsAt:Date.now()+path.length*ROOM_STEP};this.bridge.dispatch({type:'moveIndoor',target})}
 request(kind:ActionKind,id?:string){if(this.queue.length>=3){this.bridge.onMessage('Your action queue is full.');return}this.queue.push({kind,id});this.bridge.onQueue(this.queue.map(q=>ACTIONS[q.kind].label))}
 requestJob(command:JobRequest){const s=this.bridge.state(),b=activeBlueprint(s),desk=b.objects.find(o=>o.type==='desk'&&!o.stored);if(!desk){this.bridge.onMessage('Place a desk or visit a city workplace first.');return}const path=approachPath(b,s.household!.humanTile,desk);if(!path)return;this.pendingJob=command;if(path.length)this.walk(path[path.length-1])}
 cancel(){this.queue=[];this.pendingJob=null;this.predicted=null;this.bridge.onQueue([]);this.bridge.dispatch({type:'cancel'})}
 private position(j:IndoorJourney|null,t:Tile,now:number):Tile{if(!j?.path.length)return t;const steps=Math.max(0,(now-j.startedAt)/ROOM_STEP),i=Math.floor(steps),a=i?j.path[Math.min(i-1,j.path.length-1)]:j.from,z=j.path[Math.min(i,j.path.length-1)],f=Math.min(1,steps-i);return {x:a.x+(z.x-a.x)*f,y:a.y+(z.y-a.y)*f}}
 private rebuild(b:Blueprint){
  this.cameras.main.setZoom(Math.min(1.5,660/((b.width+b.height)*25),420/((b.width+b.height)*13+100))).centerOn(400+(b.width-b.height)*12.5,105+(b.width+b.height-2)*6.5-50)
  for(const o of this.room)o.destroy();this.room=[];this.room.push(drawRoom(this,b,this.bridge.state().home.style))
  for(const o of b.objects.filter(o=>!o.stored)){const sprite=drawFurniture(this,o),family=FURNITURE[o.type].family as FurnitureKind;sprite.on('pointerdown',(pointer:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.dialogOpen()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.onObjectSelect(family,o.id)});this.room.push(sprite)}
  for(const w of b.walls){const g=this.add.graphics(),p=houseIso({x:w.x+.5,y:w.y+.5}),dx=w.axis==='x'?25:-25,dy=13;g.lineStyle(w.door?3:7,w.door?0xb49878:0xb6abc5).lineBetween(p.x-dx,p.y-dy-(w.door?35:45),p.x+dx,p.y+dy-(w.door?35:45));if(!w.door)g.lineStyle(2,0x73677f).lineBetween(p.x-dx,p.y-dy,p.x-dx,p.y-dy-45).lineBetween(p.x+dx,p.y+dy,p.x+dx,p.y+dy-45);g.setDepth(p.y+1);this.room.push(g)}
 }
 update(time:number){
  if(!this.human)return;const s=this.bridge.state(),h=s.household;if(!h)return;const b=activeBlueprint(s),now=Date.now(),signature=JSON.stringify([b,s.home.style]);this.input.enabled=!this.bridge.dialogOpen()
  if(signature!==this.signature){this.signature=signature;this.rebuild(b);if(!houseWalkable(b,this.petTile))this.petTile=entryTile(b)}
  if(!this.bridge.pending())this.predicted=null
  const journey=this.predicted??h.journey,t=this.position(journey,h.humanTile,now),p=houseIso(t);let frame=0
  if(journey&&now<journey.endsAt){const target=journey.path[journey.path.length-1];frame=target.x>t.x?1:target.y<t.y?2:target.x<t.x?3:0}
  this.human.setPosition(p.x,p.y+(journey?Math.sin(time/70):0)).setDepth(p.y+3).setAngle(0).setDisplaySize(44,74)
  if(s.action?.objectId){const o=b.objects.find(o=>o.id===s.action!.objectId);if(o){const d=FURNITURE[o.type],w=o.rotation?d.h:d.w,height=o.rotation?d.w:d.h,seat=houseIso({x:o.x+(w-1)/2,y:o.y+(height-1)/2});frame=furnitureFor(s.action.kind)==='rest'?5:4;this.human.setPosition(seat.x,seat.y-(frame===5?25:12)).setDepth(seat.y+8);if(frame===5)this.human.setAngle(-57).setDisplaySize(37,65)}}
  if(frame!==this.lastFrame){this.human.setTexture(`human-${frame}`);this.lastFrame=frame}
  this.bubble.setText(s.action?ACTIONS[s.action.kind].label:h.pendingUse?'On my way…':this.bridge.pending()?'Just a moment…':'').setPosition(this.human.x,this.human.y-80).setVisible(!!(s.action||h.pendingUse||this.bridge.pending()))
  const petHere=s.location.kind==='home'||h.pet.following;this.pet.setVisible(petHere)
  if(!this.petMoving&&petHere){const target=h.pet.following?{x:Math.round(t.x),y:Math.round(t.y)}:entryTile(b),path=housePath(b,this.petTile,target);if(path&&path.length>1){const next=path[0],z=houseIso(next);this.petMoving=true;this.tweens.add({targets:this.pet,x:z.x-9,y:z.y,duration:ROOM_STEP,onUpdate:()=>this.pet.setDepth(this.pet.y+4),onComplete:()=>{this.petTile=next;this.petMoving=false}})}else{const z=houseIso(this.petTile);this.pet.setPosition(z.x-9,z.y+Math.sin(time/250)*.5).setDepth(z.y+4)}}
  if(!s.action&&!s.job&&!h.journey&&!h.pendingUse&&!this.bridge.pending()){if(this.pendingJob){const command=this.pendingJob;this.pendingJob=null;this.bridge.dispatch(command)}else if(this.queue.length){const q=this.queue.shift()!,o=b.objects.find(o=>!o.stored&&(q.id?o.id===q.id:(FURNITURE[o.type].actions as readonly string[]).includes(q.kind)));this.bridge.onQueue(this.queue.map(q=>ACTIONS[q.kind].label));if(!o){this.bridge.onMessage('Buy the required furniture, or visit a city service.');return}const path=approachPath(b,h.humanTile,o);if(path)this.predicted={from:h.humanTile,path,startedAt:now,endsAt:now+path.length*ROOM_STEP};this.bridge.dispatch({type:'useObject',objectId:o.id,kind:q.kind})}}
 }
}
