import Phaser from 'phaser'
import type {Tile} from './navigation'
import type {Blueprint,Furniture} from '../game/housing'
import {FURNITURE} from '../game/housing'
import {furnitureArtwork,materialArtwork,outdoorArtwork,architectureArtwork} from './artwork'
export const houseIso=(t:Tile)=>({x:400+(t.x-t.y)*25,y:115+(t.x+t.y)*13})
export const houseFromIso=(x:number,y:number):Tile=>({x:Math.round((x-400)/50+(y-115)/26),y:Math.round((y-115)/26-(x-400)/50)})
export function drawRoom(scene:Phaser.Scene,b:Blueprint,style:string):Phaser.GameObjects.Container{
 const room=scene.add.container(0,0).setDepth(-500),g=scene.add.graphics(),a=houseIso({x:-.5,y:-.5}),left=houseIso({x:-.5,y:b.height-.5}),right=houseIso({x:b.width-.5,y:-.5}),wallHeight=127
 room.add(g)
 const palettes:Record<string,number>={linen:0xe8dfce,sage:0xc9d4c0,lavender:0xd7ccdf,terracotta:0xe3c7ae,midnight:0xb9c8d0}
 const bottom=houseIso({x:b.width-.5,y:b.height-.5})
 g.fillStyle(0xb5a084).fillPoints([left,bottom,right,{x:right.x,y:right.y+10},{x:bottom.x,y:bottom.y+10},{x:left.x,y:left.y+10}],true)
 g.lineStyle(1,0x877762,.7).strokePoints([left,bottom,right],false)
 if(b.environment!=='park'){
  g.fillGradientStyle(palettes[style]??palettes.linen,0xf8f3e6,0xc5b6a2,0xf3eadb,1).fillPoints([a,left,{x:left.x,y:left.y-wallHeight},{x:a.x,y:a.y-wallHeight}],true)
  g.fillGradientStyle(0xfff9e9,0xf5e8d6,0xf2e6d2,0xd8c6ae,1).fillPoints([a,right,{x:right.x,y:right.y-wallHeight},{x:a.x,y:a.y-wallHeight}],true)
  g.lineStyle(4,0xfaf1e0).lineBetween(a.x,a.y-wallHeight,left.x,left.y-wallHeight).lineBetween(a.x,a.y-wallHeight,right.x,right.y-wallHeight)
  g.lineStyle(5,0x9c846c).lineBetween(a.x,a.y,left.x,left.y).lineBetween(a.x,a.y,right.x,right.y)
  g.lineStyle(1,0x8e806c,.6).lineBetween(a.x,a.y-wallHeight,a.x,a.y)
 }
 const material=b.environment==='park'?3:b.environment==='cafe'?5:style==='midnight'?1:style==='terracotta'?2:0
 for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){const p=houseIso({x,y}),tile=scene.add.image(p.x,p.y,materialArtwork[material].key).setDisplaySize(50.8,26.5);if((x+y)%3===0)tile.setTint(0xf4f0e8);room.add(tile)}
 if(b.environment==='park')return room
 const details=scene.add.graphics();room.add(details)
 for(const t of [1.5,Math.min(5,b.width-2)]){
  const p=houseIso({x:t,y:-.5}),art=architectureArtwork[0],window=scene.add.image(p.x,p.y-75,art.key).setDisplaySize(61,61*art.height/art.width)
  room.add(window)
 }
 const light=scene.add.graphics();room.add(light);const w=houseIso({x:b.width-3,y:1})
 light.fillStyle(0xfff4cc,.16).fillPoints([{x:w.x-45,y:w.y-12},{x:w.x+3,y:w.y+12},{x:w.x-60,y:w.y+82},{x:w.x-116,y:w.y+53}],true)
 return room
}
export function drawFurniture(scene:Phaser.Scene,o:Furniture,environment?:Blueprint['environment']):Phaser.GameObjects.Container{
 const d=FURNITURE[o.type],w=o.rotation?d.h:d.w,h=o.rotation?d.w:d.h,p=houseIso({x:o.x+(w-1)/2,y:o.y+(h-1)/2}),outdoor=environment==='park',asset=outdoor&&o.type==='sofa'?outdoorArtwork[o.rotation]:outdoor&&o.type==='plant'?outdoorArtwork[(o.x+o.y)%3===0?4+o.rotation:2+o.rotation]:furnitureArtwork(o.type,o.rotation)
 const widths={bed:118,kitchen:85,desk:91,sofa:91,bowl:28,plant:44,lamp:24,shelf:75},width=outdoor&&o.type==='plant'?asset===outdoorArtwork[2]||asset===outdoorArtwork[3]?76:46:widths[o.type],height=width*asset.height/asset.width
 const shadow=scene.add.ellipse(0,2,Math.min((w+h)*21,width*.8),Math.min((w+h)*8,20),0x3b3029,.13)
 const image=scene.add.image(0,(w+h)*6.5+2,asset.key).setDisplaySize(width,height).setOrigin(.5,1).setFlipX(o.type==='bed'&&o.rotation===1)
 const container=scene.add.container(p.x,p.y,[shadow,image]).setDepth(houseIso({x:o.x+w-1,y:o.y+h-1}).y+2)
 image.setInteractive({pixelPerfect:true,alphaTolerance:70,useHandCursor:true})
 image.on('pointerdown',(pointer:Phaser.Input.Pointer,x:number,y:number,event:Phaser.Types.Input.EventData)=>container.emit('pointerdown',pointer,x,y,event))
 return container
}
