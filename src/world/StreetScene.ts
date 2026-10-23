import {residentArtwork,type ResidentArtwork} from './residentArtwork'
import {svgDataUri} from './svg'
import Phaser from 'phaser'
import type { GameState } from '../game/types'
import { CITY_INFRASTRUCTURE,identityOf,plotOrigin,PLOT_GRID,SERVICES,serviceName,STEP_MS,streetWalkable,type Neighbor,type NeighborhoodSnapshot } from '../game/neighborhood'
import type { Tile } from './navigation'
export const streetIso=(t:Tile)=>({x:900+(t.x-t.y)*24,y:100+(t.x+t.y)*12})
const fromIso=(x:number,y:number):Tile=>({x:Math.round((x-900)/48+(y-100)/24),y:Math.round((y-100)/24-(x-900)/48)})
export interface StreetBridge {
 state():GameState;snapshot():NeighborhoodSnapshot;blocked():boolean
 walk(tile:Tile):void;selectPlot(tile:Tile):void;selectService(index:number):void;selectNeighbor(neighbor:Neighbor):void
 avatarSvg(neighbor?:Neighbor):string
}
export class StreetScene extends Phaser.Scene {
 private artwork:ResidentArtwork|null=null
 private resident!:Phaser.GameObjects.Image
 private buildings:Phaser.GameObjects.GameObject[]=[]
 private visitors=new Map<string,Phaser.GameObjects.Container>()
 private signature=''
 private lastTile:Tile={x:0,y:0}
 constructor(private bridge:StreetBridge){super('neighborhood');this.artwork=residentArtwork(bridge.state())}
 preload(){
  this.load.spritesheet('city-buildings','/art/city-buildings.webp',{frameWidth:512,frameHeight:512})
  this.load.image('chog-sheet',this.artwork?.path??'/art/chog-resident-v2.webp')
  this.load.svg('street-resident',svgDataUri(this.bridge.avatarSvg()),{width:144,height:160})
 }
 create(){
  const s=this.bridge.state(),city=s.currentZone===5?0:s.currentZone
  this.cameras.main.setBackgroundColor('#c5c5b3')
  const ground=this.add.graphics().setDepth(-1000)
  for(let y=0;y<39;y++)for(let x=0;x<36;x++){
   const p=streetIso({x,y}),walkable=streetWalkable({x,y})
   ground.fillStyle(walkable?((x+y)%2?0xc5c4b7:0xc9c8bb):0xa2ae89)
   ground.fillPoints([{x:p.x,y:p.y-12},{x:p.x+24,y:p.y},{x:p.x,y:p.y+12},{x:p.x-24,y:p.y}],true)
   ground.lineStyle(.5,0x938e7c,.13).strokePoints([{x:p.x,y:p.y-12},{x:p.x+24,y:p.y},{x:p.x,y:p.y+12},{x:p.x-24,y:p.y}],true)
  }
  const source=this.textures.get('chog-sheet'),image=source.getSourceImage() as HTMLImageElement
  const columns=this.artwork?.columns??2,rows=this.artwork?.rows??2
  for(let i=0;i<(this.artwork?.frames??4);i++)source.add(i,0,(i%columns)*image.width/columns,Math.floor(i/columns)*image.height/rows,image.width/columns,image.height/rows)
  const neutral=this.artwork!==null
  this.resident=this.add.image(0,0,neutral?'chog-sheet':'street-resident',neutral?0:undefined).setOrigin(.5,.9).setDisplaySize(63,70)
  this.lastTile=s.location.tile
  const p=streetIso(this.lastTile);this.resident.setPosition(p.x,p.y)
  this.cameras.main.startFollow(this.resident,true,.12,.12,0,60).setZoom(1.25).setBounds(0,-100,1800,1200)
  for(let index=0;index<SERVICES.length;index++){
   const service=SERVICES[index],p=streetIso(service.tile),sprite=this.add.image(p.x,p.y+20,'city-buildings',service.frame).setDisplaySize(175,175).setOrigin(.5,.9).setDepth(p.y+16)
   sprite.setInteractive({pixelPerfect:true,alphaTolerance:40,useHandCursor:true}).on('pointerdown',(pointer:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.blocked()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.selectService(index)})
   this.add.text(p.x,p.y+30,serviceName(city,index),{fontSize:'10px',color:'#fbf6e9',backgroundColor:'#4c5143e8',padding:{x:7,y:4}}).setOrigin(.5,0).setDepth(p.y+100)
  }
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(!this.bridge.blocked()&&pointer.event.target===this.game.canvas)this.bridge.walk(fromIso(pointer.worldX,pointer.worldY))})
 }
 private rebuild(){
  for(const item of this.buildings)item.destroy();this.buildings=[]
  const s=this.bridge.state(),snapshot=this.bridge.snapshot(),city=s.currentZone===5?0:s.currentZone
  const accent=Phaser.Display.Color.HexStringToColor(CITY_INFRASTRUCTURE[city].accent).color
  for(let y=0;y<PLOT_GRID;y++)for(let x=0;x<PLOT_GRID;x++){
   const owner=snapshot.parcels.find(p=>p.x===x&&p.y===y)?.identity
   const neighbor=snapshot.neighbors.find(n=>n.identity===owner)
   const origin=plotOrigin({x,y}),p=streetIso({x:origin.x+.5,y:origin.y+.5})
   const estateAnchor=neighbor&&neighbor.home.x===x&&neighbor.home.y===y
   const pad=this.add.graphics().setDepth(p.y-1)
   pad.fillStyle(owner?0x9caa88:0xb1b296,.7).fillPoints([{x:p.x,y:p.y-25},{x:p.x+48,y:p.y},{x:p.x,y:p.y+25},{x:p.x-48,y:p.y}],true)
   pad.lineStyle(2,owner===identityOf(s)?0xe0c784:0x8b8e75,.8).strokePoints([{x:p.x,y:p.y-25},{x:p.x+48,y:p.y},{x:p.x,y:p.y+25},{x:p.x-48,y:p.y}],true)
   this.buildings.push(pad)
   if(estateAnchor){
    const sprite=this.add.image(p.x,p.y+17,'city-buildings',neighbor.housingTier>=3?1:0).setDisplaySize(148,148).setOrigin(.5,.9).setDepth(p.y+20).setTint(accent)
    sprite.setInteractive({pixelPerfect:true,alphaTolerance:40,useHandCursor:true}).on('pointerdown',(pointer:Phaser.Input.Pointer,_a:number,_b:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.blocked()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.selectPlot({x,y})})
    const label=this.add.text(p.x,p.y+35,owner===identityOf(s)?'Your home':neighbor.name,{fontSize:'9px',color:'#fff9ec',backgroundColor:'#514c40de',padding:{x:5,y:3}}).setOrigin(.5,0).setDepth(p.y+101)
    this.buildings.push(sprite,label)
   }else{
    const sign=this.add.text(p.x,p.y,owner===identityOf(s)?'Your garden':owner?'Private land':'For sale',{fontSize:'9px',color:owner?'#f9f1db':'#524f3d',backgroundColor:owner?'#687a5ce8':'#e2ddc5e8',padding:{x:5,y:3}}).setOrigin(.5,.5).setDepth(p.y+1).setInteractive({useHandCursor:true})
    sign.on('pointerdown',(pointer:Phaser.Input.Pointer,_a:number,_b:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.blocked()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.selectPlot({x,y})});this.buildings.push(sign)
   }
  }
 }
 private renderPosition(location:GameState['location'],now:number):Tile{
  const j=location.journey
  if(!j||!j.path.length)return location.tile
  const steps=Math.max(0,(now-j.startedAt)/STEP_MS),index=Math.floor(steps)
  const from=index===0?j.from:j.path[Math.min(index-1,j.path.length-1)],to=j.path[Math.min(index,j.path.length-1)],f=Math.min(1,steps-index)
  return{x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f}
 }
 update(time:number){
  if(!this.resident)return
  this.input.enabled=!this.bridge.blocked()
  const s=this.bridge.state(),snapshot=this.bridge.snapshot(),now=Date.now()
  const signature=JSON.stringify([s.currentZone,snapshot.parcels,snapshot.neighbors.map(n=>[n.identity,n.name,n.home,n.housingTier])])
  if(signature!==this.signature){this.signature=signature;this.rebuild()}
  const tile=this.renderPosition(s.location,now),p=streetIso(tile)
  this.resident.setPosition(p.x,p.y+(s.location.journey?Math.sin(time/65)*2:Math.sin(time/400)*.4)).setDepth(p.y+30)
  if(this.artwork){const dx=tile.x-this.lastTile.x,dy=tile.y-this.lastTile.y;if(Math.abs(dx)+Math.abs(dy)>.002)this.resident.setFrame(Math.abs(dx)>Math.abs(dy)?dx>0?0:2:dy>0?1:3)}
  else this.resident.setFlipX(tile.x<this.lastTile.x||tile.y>this.lastTile.y)
  this.lastTile=tile
  const visible=snapshot.neighbors.filter(n=>n.identity!==identityOf(s)&&n.online&&n.location?.kind==='street')
  for(const[id,container]of this.visitors)if(!visible.some(n=>n.identity===id)){container.destroy();this.visitors.delete(id)}
  for(const neighbor of visible){
   let container=this.visitors.get(neighbor.identity)
   const key=`neighbor:${neighbor.identity}`
   if(!container){
    if(!this.textures.exists(key))this.textures.addBase64(key,svgDataUri(this.bridge.avatarSvg(neighbor)))
    const image=this.add.image(0,0,'chog-sheet',0).setOrigin(.5,.9).setDisplaySize(60,65)
    const name=this.add.text(0,-75,neighbor.name,{fontSize:'10px',backgroundColor:'#fff6e9',color:'#4a3e49',padding:{x:6,y:3}}).setOrigin(.5,1)
    container=this.add.container(0,0,[image,name]);container.setSize(60,80).setInteractive({useHandCursor:true}).on('pointerdown',(pointer:Phaser.Input.Pointer,_a:number,_b:number,event:Phaser.Types.Input.EventData)=>{if(this.bridge.blocked()||pointer.event.target!==this.game.canvas)return;event.stopPropagation();this.bridge.selectNeighbor(neighbor)})
    this.visitors.set(neighbor.identity,container)
   }
   const avatar=container.list[0] as Phaser.GameObjects.Image
   if(this.textures.exists(key))avatar.setTexture(key)
   const p=streetIso(this.renderPosition(neighbor.location,now));container.setPosition(p.x,p.y).setDepth(p.y+30)
  }
 }
}
