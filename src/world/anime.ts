import Phaser from 'phaser'
import type {Tile} from './navigation'
import type {Blueprint,Furniture} from '../game/housing'
import {footprint} from '../game/housing'
import {materialArtwork,architectureArtwork} from './artwork'
import {furnitureView,partitionSegment} from './furnitureView'
import {detectRooms} from '../game/rooms'
export const houseIso=(t:Tile)=>({x:400+(t.x-t.y)*25,y:115+(t.x+t.y)*13})
export const houseFromIso=(x:number,y:number):Tile=>({x:Math.round((x-400)/50+(y-115)/26),y:Math.round((y-115)/26-(x-400)/50)})
export function drawRoom(scene:Phaser.Scene,b:Blueprint,style:string):Phaser.GameObjects.Container{
 const room=scene.add.container(0,0).setDepth(-500),g=scene.add.graphics(),a=houseIso({x:-.5,y:-.5}),left=houseIso({x:-.5,y:b.height-.5}),right=houseIso({x:b.width-.5,y:-.5}),wallHeight=127
 room.add(g)
 if(!b.environment){
  const garden=[{x:-1.15,y:-1.15},{x:b.width+.3,y:-1.15},{x:b.width+.3,y:b.height+.45},{x:-1.15,y:b.height+.45}].map(houseIso)
  g.fillStyle(0x8b9c7c).fillPoints(garden,true).lineStyle(4,0x738866,.6).strokePoints(garden,true)
  const entry=houseIso({x:Math.floor(b.width/2),y:b.height-.05});g.fillStyle(0xc7c0ae).fillPoints([{x:entry.x-30,y:entry.y},{x:entry.x,y:entry.y-15},{x:entry.x+30,y:entry.y},{x:entry.x,y:entry.y+15}],true)
 }
 for(let i=4;i>=1;i--)g.fillStyle(0x44362a,.025).fillEllipse(400+(b.width-b.height)*12.5,115+(b.width+b.height)*6.5+14,(b.width+b.height)*25+i*7,(b.width+b.height)*13+i*5)
 const palettes:Record<string,number>={linen:0xe8dfce,sage:0xc9d4c0,lavender:0xd7ccdf,terracotta:0xe3c7ae,midnight:0xb9c8d0}
 const bottom=houseIso({x:b.width-.5,y:b.height-.5})
 g.fillStyle(0xb5a084).fillPoints([left,bottom,right,{x:right.x,y:right.y+10},{x:bottom.x,y:bottom.y+10},{x:left.x,y:left.y+10}],true)
 g.lineStyle(1,0x877762,.7).strokePoints([left,bottom,right],false)
 if(b.environment!=='park'){
  g.fillGradientStyle(palettes[style]??palettes.linen,0xf8f3e6,0xc5b6a2,0xf3eadb,1).fillPoints([a,left,{x:left.x,y:left.y-wallHeight},{x:a.x,y:a.y-wallHeight}],true)
  g.fillGradientStyle(0xfff9e9,0xf5e8d6,0xf2e6d2,0xd8c6ae,1).fillPoints([a,right,{x:right.x,y:right.y-wallHeight},{x:a.x,y:a.y-wallHeight}],true)
  g.lineStyle(4,0xfaf1e0).lineBetween(a.x,a.y-wallHeight,left.x,left.y-wallHeight).lineBetween(a.x,a.y-wallHeight,right.x,right.y-wallHeight)
  g.lineStyle(12,0x3c3025,.09).lineBetween(a.x,a.y-4,left.x,left.y-4).lineBetween(a.x,a.y-4,right.x,right.y-4)
  g.lineStyle(5,0x9c846c).lineBetween(a.x,a.y,left.x,left.y).lineBetween(a.x,a.y,right.x,right.y)
  g.lineStyle(1,0x8e806c,.6).lineBetween(a.x,a.y-wallHeight,a.x,a.y)
 }
 const material=b.environment==='park'?3:b.environment==='work'?1:b.environment==='cafe'?5:b.environment==='library'?0:style==='midnight'?1:style==='terracotta'?2:0
 const tiled=new Set((b.environment?[]:detectRooms(b)).filter(r=>r.label==='Bathroom'||r.label==='Kitchen').flatMap(r=>r.cells.map(t=>`${t.x},${t.y}`)))
 for(const object of b.objects.filter(o=>!o.stored&&['kitchen','basin','shower','showerStall'].includes(o.type)))for(const t of footprint(object))for(const dy of [0,1])tiled.add(`${t.x},${t.y+dy}`)
 for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){const p=houseIso({x,y}),zone=b.environment==='cafe'&&y>=3?0:b.environment==='work'&&y>=9?0:b.environment==='library'&&x>=7&&y>=2?1:material,tile=scene.add.image(p.x,p.y,materialArtwork[b.environment!=='park'&&tiled.has(`${x},${y}`)?5:zone].key).setDisplaySize(50.8,26.5);if((x+y)%3===0)tile.setTint(0xf4f0e8);room.add(tile)}
 if(b.environment==='park')return room
 const details=scene.add.graphics();room.add(details)
 if(b.environment){
  // Commercial glazing and signage, without domestic curtains or bedroom decoration.
  for(const x of [1,4,7,10]){const a=houseIso({x:x-.3,y:-.5}),z=houseIso({x:x+1.3,y:-.5}),pane=[{x:a.x,y:a.y-30},{x:z.x,y:z.y-30},{x:z.x,y:z.y-110},{x:a.x,y:a.y-110}];details.fillStyle(0xacc9ca,.85).fillPoints(pane,true).lineStyle(4,b.environment==='work'?0x58686a:0x7b654c).strokePoints(pane,true).lineStyle(2,0xf0e5c9,.7).lineBetween((a.x+z.x)/2,(a.y+z.y)/2-30,(a.x+z.x)/2,(a.y+z.y)/2-110)}
  const p=houseIso({x:-.5,y:5.5}),label=scene.add.text(p.x,p.y-94,b.environment==='cafe'?'COFFEE  •  KITCHEN':b.environment==='library'?'READ  •  LEARN  •  GROW':'MAKE  •  SHARE  •  CREATE',{fontFamily:'Georgia',fontSize:'11px',color:b.environment==='library'?'#69583d':'#42635b',backgroundColor:'#f8efda',padding:{x:12,y:6}}).setOrigin(.5,.5).setAngle(-27);room.add(label)
  if(b.environment==='work'){const p=houseIso({x:-.5,y:9});details.fillStyle(0xf4f1e4).fillRoundedRect(p.x-30,p.y-92,60,42,2).lineStyle(2,0x96a8a0).strokeRoundedRect(p.x-30,p.y-92,60,42,2);for(let i=0;i<3;i++)details.lineStyle(1,0x8aa8a0,.6).lineBetween(p.x-22,p.y-83+i*8,p.x+15-i*5,p.y-83+i*8)}
 }else for(const t of [1.5,Math.min(5,b.width-2)]){
  const p=houseIso({x:t,y:-.5}),art=architectureArtwork[0],window=scene.add.image(p.x,p.y-75,art.key).setDisplaySize(61,61*art.height/art.width)
  room.add(window)
 }
 const light=scene.add.graphics();room.add(light);const w=houseIso({x:b.width-3,y:1})
 light.fillStyle(0xfff4cc,.16).fillPoints([{x:w.x-45,y:w.y-12},{x:w.x+3,y:w.y+12},{x:w.x-60,y:w.y+82},{x:w.x-116,y:w.y+53}],true)
 return room
}
export function drawFurniture(scene:Phaser.Scene,o:Furniture,environment?:Blueprint['environment']):Phaser.GameObjects.Container{
 const v=furnitureView(o,environment),shadow=scene.add.graphics()
 shadow.fillStyle(0x332b24,.15).fillEllipse(0,2,Math.min((v.w+v.h)*21,v.width*.8),Math.min((v.w+v.h)*8,20))
 if(o.type==='lamp'||o.type==='desk')for(let i=3;i>0;i--)shadow.fillStyle(0xffd99d,.025*i).fillEllipse(4,8,32+i*14,12+i*4)
 const image=scene.add.image(0,v.baseY,v.asset.key).setDisplaySize(v.width,v.height).setOrigin(.5,1).setFlipX(v.flipX)
 const container=scene.add.container(v.x,v.y,[shadow,image]).setDepth(v.depth)
 image.setInteractive({pixelPerfect:true,alphaTolerance:70,useHandCursor:true})
 for(const event of ['pointerover','pointerout'])image.on(event,()=>container.emit(event))
 image.on('pointerup',(pointer:Phaser.Input.Pointer,x:number,y:number,event:Phaser.Types.Input.EventData)=>container.emit('pointerup',pointer,x,y,event))
 return container
}
export function drawPartition(scene:Phaser.Scene,w:Blueprint['walls'][number]):Phaser.GameObjects.Graphics{
 const [a,z]=partitionSegment(w),height=76,g=scene.add.graphics().setDepth(Math.max(a.y,z.y)+1)
 if(w.door){
  g.lineStyle(4,0xa98e71).lineBetween(a.x,a.y,a.x,a.y-height).lineBetween(z.x,z.y,z.x,z.y-height).lineBetween(a.x,a.y-height,z.x,z.y-height)
  g.fillStyle(0xb49b80,.55).fillPoints([a,{x:a.x+14,y:a.y+5},{x:a.x+14,y:a.y-height+10},{x:a.x,y:a.y-height+5}],true)
 }else{
  g.fillStyle(0xd9d2c8).fillPoints([a,z,{x:z.x,y:z.y-height},{x:a.x,y:a.y-height}],true)
  g.fillStyle(0xf5f0e4).fillPoints([{x:a.x,y:a.y-height},{x:z.x,y:z.y-height},{x:z.x+3,y:z.y-height-2},{x:a.x+3,y:a.y-height-2}],true)
  g.lineStyle(4,0xf1e9d9).lineBetween(a.x,a.y-3,z.x,z.y-3)
  g.lineStyle(1,0x8c8171,.5).lineBetween(a.x,a.y-height,z.x,z.y-height)
 }
 return g
}
