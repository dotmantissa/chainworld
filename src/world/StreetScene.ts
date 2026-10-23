import {WorldCamera} from './WorldCamera'
import type {CameraCommand,CameraView} from './cameraControls'
import {humanArtwork,humanPortraitArtwork,cityArtwork,materialArtwork,loadArtwork,sizeHuman,type ArtAsset} from './artwork'
import {loadPetArtwork,setPetPose} from './petArtwork'
import Phaser from 'phaser'
import type {GameState} from '../game/types'
import {identityOf,plotOrigin,PLOT_GRID,SERVICES,serviceName,STEP_MS,streetWalkable,type Neighbor,type NeighborhoodSnapshot} from '../game/neighborhood'
import type {Tile} from './navigation'
export const streetIso=(t:Tile)=>({x:1200+(t.x-t.y)*32,y:120+(t.x+t.y)*16})
const fromIso=(x:number,y:number):Tile=>({x:Math.round((x-1200)/64+(y-120)/32),y:Math.round((y-120)/32-(x-1200)/64)})
export interface StreetBridge {state():GameState;snapshot():NeighborhoodSnapshot;blocked():boolean;walk(tile:Tile):void;selectPlot(tile:Tile):void;selectService(index:number):void;selectNeighbor(neighbor:Neighbor):void;avatarSvg(neighbor?:Neighbor):string;onCameraChange(view:CameraView):void}
export class StreetScene extends Phaser.Scene{
 private resident!:Phaser.GameObjects.Image;private pet!:Phaser.GameObjects.Image;private buildings:Phaser.GameObjects.GameObject[]=[];private visitors=new Map<string,Phaser.GameObjects.Container>();private signature='';private lastTile:Tile={x:0,y:0};private poses:ArtAsset[]=[];private petKey='';private cityBuildings:ArtAsset[]=[]
 private cameraView?:WorldCamera;private labels:Phaser.GameObjects.Text[]=[]
 cameraCommand(command:CameraCommand){this.cameraView?.command(command)}
 constructor(private bridge:StreetBridge){super('neighborhood')}
 preload(){const s=this.bridge.state();this.poses=humanArtwork(s);this.cityBuildings=cityArtwork(s.currentZone===5?0:s.currentZone);loadArtwork(this,this.poses);loadArtwork(this,this.cityBuildings);loadArtwork(this,materialArtwork);loadArtwork(this,humanPortraitArtwork);this.petKey=loadPetArtwork(this,s,this.bridge.avatarSvg())}

 create(){
  const s=this.bridge.state(),city=s.currentZone===5?0:s.currentZone;this.cameras.main.setBackgroundColor(['#e1e8d8','#e8e2d6','#bcdbe2','#e5d2b9','#c5dee0'][city]);const ground=this.add.graphics().setDepth(-1000)
  for(let y=0;y<39;y++)for(let x=0;x<36;x++){const p=streetIso({x,y}),walkable=streetWalkable({x,y});this.add.image(p.x,p.y,materialArtwork[walkable?2:3].key).setDisplaySize(64.5,32.5).setDepth(-999);if(!walkable&&y>=5)ground.fillStyle(0x5a6b4e,.05).fillEllipse(p.x,p.y,38,13)}
  this.resident=this.add.image(0,0,this.poses[0].key);sizeHuman(this.resident,this.poses,0,70);this.pet=this.add.image(0,0,this.petKey);setPetPose(this.pet,this.petKey);this.pet.setScale(this.pet.scaleX*.85,this.pet.scaleY*.85);this.lastTile=s.location.tile;const p=streetIso(this.lastTile);this.resident.setPosition(p.x,p.y);this.cameras.main.startFollow(this.resident,true,.12,.12,0,30).setZoom(1.3).setBounds(-180,-300,2760,2000)
  for(let index=0;index<SERVICES.length;index++){const service=SERVICES[index],p=streetIso(service.tile),art=this.cityBuildings[service.frame],sprite=this.add.image(p.x,p.y+34,art.key).setDisplaySize(192,192*art.height/art.width).setOrigin(.5,1).setDepth(p.y+32);sprite.setInteractive({pixelPerfect:true,alphaTolerance:70,useHandCursor:true}).on('pointerup',(pointer:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.blocked()||!this.cameraView?.canSelect()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.selectService(index)});const label=this.add.text(p.x,p.y+34-sprite.displayHeight-8,serviceName(city,index),{fontSize:'12px',color:'#564a63',backgroundColor:'#fff9e9',padding:{x:7,y:4}}).setOrigin(.5,1).setResolution(2).setDepth(1000000).setData({anchorX:p.x,anchorY:p.y+34-sprite.displayHeight-8,bottomY:p.y+34,halfWidth:96});label.setInteractive({useHandCursor:true}).on('pointerup',(...args:unknown[])=>sprite.emit('pointerup',...args));this.labels.push(label)}

  this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(!this.bridge.blocked()&&this.cameraView?.canSelect()&&pointer.event.target===this.game.canvas)this.bridge.walk(fromIso(pointer.worldX,pointer.worldY))})
  this.cameraView=new WorldCamera(this,()=>this.cameras.main.startFollow(this.resident,true,.12,.12,0,30).setZoom(1.3),view=>this.bridge.onCameraChange(view),.3,3.5)
 }
 private rebuild(){
  for(const item of this.buildings)item.destroy();this.labels=this.labels.filter(label=>!this.buildings.includes(label));this.buildings=[];const s=this.bridge.state(),snapshot=this.bridge.snapshot()
  for(let y=0;y<PLOT_GRID;y++)for(let x=0;x<PLOT_GRID;x++){
   const owner=snapshot.parcels.find(p=>p.x===x&&p.y===y)?.identity,neighbor=snapshot.neighbors.find(n=>n.identity===owner),origin=plotOrigin({x,y}),p=streetIso({x:origin.x+.5,y:origin.y+.5}),estateAnchor=neighbor&&neighbor.home.x===x&&neighbor.home.y===y,pad=this.add.graphics().setDepth(p.y-1)
   pad.fillStyle(owner?0xa8bd94:0xc7cdad,.7).fillPoints([{x:p.x,y:p.y-32},{x:p.x+64,y:p.y},{x:p.x,y:p.y+32},{x:p.x-64,y:p.y}],true);pad.lineStyle(1.5,owner===identityOf(s)?0xc4a56f:0x9b9f87,.8).strokePoints([{x:p.x,y:p.y-32},{x:p.x+64,y:p.y},{x:p.x,y:p.y+32},{x:p.x-64,y:p.y}],true);this.buildings.push(pad)
   if(estateAnchor){const art=this.cityBuildings[neighbor.housingTier>=3?1:0],sprite=this.add.image(p.x,p.y+31,art.key).setDisplaySize(132,132*art.height/art.width).setOrigin(.5,1).setDepth(p.y+20);sprite.setInteractive({pixelPerfect:true,alphaTolerance:40,useHandCursor:true}).on('pointerup',(pointer:Phaser.Input.Pointer,_a:number,_b:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.blocked()||!this.cameraView?.canSelect()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.selectPlot({x,y})});const label=this.add.text(p.x,p.y+31-sprite.displayHeight-9,owner===identityOf(s)?'Your home':neighbor.name,{fontSize:'12px',color:'#69596e',backgroundColor:'#fff8e5',padding:{x:5,y:3}}).setOrigin(.5,1).setResolution(2).setDepth(1000001).setData({anchorX:p.x,anchorY:p.y+31-sprite.displayHeight-9,bottomY:p.y+31,halfWidth:66});label.setInteractive({useHandCursor:true}).on('pointerup',(...args:unknown[])=>sprite.emit('pointerup',...args));this.labels.push(label);this.buildings.push(sprite,label)}
   else{const sign=this.add.text(p.x,p.y,owner===identityOf(s)?'Your garden':owner?'Private land':'For sale',{fontSize:'9px',color:'#675b69',backgroundColor:owner?'#dce7cd':'#f1ead4',padding:{x:5,y:3}}).setOrigin(.5,.5).setDepth(p.y+1).setInteractive({useHandCursor:true});sign.on('pointerup',(pointer:Phaser.Input.Pointer,_a:number,_b:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.blocked()||!this.cameraView?.canSelect()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.selectPlot({x,y})});this.buildings.push(sign)}
  }
 }
 private renderPosition(location:GameState['location'],now:number):Tile{const j=location.journey;if(!j?.path.length)return location.tile;const steps=Math.max(0,(now-j.startedAt)/STEP_MS),index=Math.floor(steps),from=index===0?j.from:j.path[Math.min(index-1,j.path.length-1)],to=j.path[Math.min(index,j.path.length-1)],f=Math.min(1,steps-index);return{x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f}}
 update(time:number){
  if(!this.resident)return;this.input.enabled=!this.bridge.blocked();const s=this.bridge.state(),snapshot=this.bridge.snapshot(),now=Date.now(),signature=JSON.stringify([s.currentZone,snapshot.parcels,snapshot.neighbors.map(n=>[n.identity,n.name,n.home,n.housingTier])]);if(signature!==this.signature){this.signature=signature;this.rebuild()}
  const camera=this.cameras.main,z=camera.zoom,cx=camera.scrollX+camera.width/2,cy=camera.scrollY+camera.height/2,left=cx-camera.width/(2*z),right=cx+camera.width/(2*z),top=cy-camera.height/(2*z),bottom=cy+camera.height/(2*z)
  for(const label of this.labels){
   const x=label.getData('anchorX') as number,y=label.getData('anchorY') as number,base=label.getData('bottomY') as number,half=label.getData('halfWidth') as number
   label.setScale(1/z).setVisible(x+half>left&&x-half<right&&base>top&&y<bottom)
   label.setPosition(Math.max(left+(label.width/2+8)/z,Math.min(right-(label.width/2+8)/z,x)),Math.max(top+(label.height+8)/z,y))
  }
  const tile=this.renderPosition(s.location,now),p=streetIso(tile);const moving=!!s.location.journey,dx=tile.x-this.lastTile.x,dy=tile.y-this.lastTile.y,frame=moving?(dy<0?2:dx<0?3:dx>0?1:0):0;sizeHuman(this.resident,this.poses,frame,70);this.resident.setPosition(p.x,p.y+(moving?Math.sin(time/65)*.8:0)).setDepth(p.y+30);this.lastTile=tile
  const j=s.location.journey,petTile=j?.path.length?j.path[Math.max(0,Math.min(j.path.length-1,Math.floor((now-j.startedAt)/STEP_MS)-2))]:tile,petP=streetIso(petTile);this.pet.setVisible(s.household?.pet.following??true).setPosition(petP.x-14,petP.y+Math.sin(time/200)).setDepth(petP.y+31)
  const visible=snapshot.neighbors.filter(n=>n.identity!==identityOf(s)&&n.online&&n.location?.kind==='street')
  for(const[id,container]of this.visitors)if(!visible.some(n=>n.identity===id)){container.destroy();this.visitors.delete(id)}
  for(const neighbor of visible){
   let container=this.visitors.get(neighbor.identity);const poses=humanArtwork({appearance:neighbor.appearance,profile:neighbor.profile,collection:neighbor.identity.split(':')[1],tokenId:neighbor.tokenId})
   if(!container){const image=this.add.image(0,0,poses[0].key),name=this.add.text(0,-78,neighbor.name,{fontSize:'10px',backgroundColor:'#fff6e9',color:'#4a3e49',padding:{x:6,y:3}}).setOrigin(.5,1);sizeHuman(image,poses,0,70);container=this.add.container(0,0,[image,name]);container.setSize(50,85).setInteractive({useHandCursor:true}).on('pointerup',(pointer:Phaser.Input.Pointer,_a:number,_b:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.blocked()||!this.cameraView?.canSelect()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.selectNeighbor(neighbor)});this.visitors.set(neighbor.identity,container)}
   const avatar=container.list[0] as Phaser.GameObjects.Image;sizeHuman(avatar,poses,0,70);const p=streetIso(this.renderPosition(neighbor.location,now));container.setPosition(p.x,p.y).setDepth(p.y+30)
  }

 }
}
