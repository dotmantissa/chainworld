import Phaser from 'phaser'
import type {Tile} from './navigation'
import type {Blueprint,Furniture} from '../game/housing'
import {FURNITURE} from '../game/housing'
export const houseIso=(t:Tile)=>({x:400+(t.x-t.y)*25,y:105+(t.x+t.y)*13})
export const houseFromIso=(x:number,y:number):Tile=>({x:Math.round((x-400)/50+(y-105)/26),y:Math.round((y-105)/26-(x-400)/50)})
export function box(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,z:number,color:number,top=color){
 const a=houseIso({x:x-.5,y:y-.5}),b=houseIso({x:x+w-.5,y:y-.5}),c=houseIso({x:x+w-.5,y:y+h-.5}),d=houseIso({x:x-.5,y:y+h-.5}),up=(p:{x:number;y:number})=>({x:p.x,y:p.y-z})
 g.lineStyle(1.5,0x4b4352,1).fillStyle(color).fillPoints([b,c,up(c),up(b)],true).strokePoints([b,c,up(c),up(b)],true)
 g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(12).color).fillPoints([c,d,up(d),up(c)],true).strokePoints([c,d,up(d),up(c)],true)
 g.fillStyle(top).fillPoints([up(a),up(b),up(c),up(d)],true).strokePoints([up(a),up(b),up(c),up(d)],true)
}
export function drawRoom(scene:Phaser.Scene,b:Blueprint,style:string){
 const g=scene.add.graphics().setDepth(-500),a=houseIso({x:-.5,y:-.5}),left=houseIso({x:-.5,y:b.height-.5}),right=houseIso({x:b.width-.5,y:-.5})
 const palettes:Record<string,number>={linen:0xf1e7dd,sage:0xdce9d9,lavender:0xe5def0,terracotta:0xf0dbcb,midnight:0xc3d1e1}
 g.lineStyle(2,0x686172).fillStyle(palettes[style]??palettes.linen).fillPoints([a,left,{x:left.x,y:left.y-100},{x:a.x,y:a.y-100}],true).strokePoints([a,left,{x:left.x,y:left.y-100},{x:a.x,y:a.y-100}],true)
 g.fillStyle(0xf9f1df).fillPoints([a,right,{x:right.x,y:right.y-100},{x:a.x,y:a.y-100}],true).strokePoints([a,right,{x:right.x,y:right.y-100},{x:a.x,y:a.y-100}],true)
 for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){const p=houseIso({x,y});g.lineStyle(.65,0xbda68b,.5).fillStyle((x+y)%2?0xe5c69e:0xf0d5af).fillPoints([{x:p.x,y:p.y-13},{x:p.x+25,y:p.y},{x:p.x,y:p.y+13},{x:p.x-25,y:p.y}],true).strokePoints([{x:p.x,y:p.y-13},{x:p.x+25,y:p.y},{x:p.x,y:p.y+13},{x:p.x-25,y:p.y}],true)}
 for(const t of [2,Math.min(5,b.width-2)]){const p=houseIso({x:t,y:-.5});g.lineStyle(3,0x7c7580).fillStyle(0xb5d7e5).fillPoints([{x:p.x-17,y:p.y-69},{x:p.x+15,y:p.y-53},{x:p.x+15,y:p.y-20},{x:p.x-17,y:p.y-36}],true).strokePoints([{x:p.x-17,y:p.y-69},{x:p.x+15,y:p.y-53},{x:p.x+15,y:p.y-20},{x:p.x-17,y:p.y-36}],true);g.lineStyle(2,0xfff8e9).lineBetween(p.x-1,p.y-61,p.x-1,p.y-28).lineBetween(p.x-17,p.y-52,p.x+15,p.y-36)}
 return g
}
export function drawFurniture(scene:Phaser.Scene,o:Furniture):Phaser.GameObjects.Graphics{
 const d=FURNITURE[o.type],w=o.rotation?d.h:d.w,h=o.rotation?d.w:d.h,g=scene.add.graphics(),p=houseIso({x:o.x+(w-1)/2,y:o.y+(h-1)/2}),x=o.x,y=o.y
 if(o.type==='bed'){box(g,x,y,w,h,12,0xa48668,0xc6a37c);box(g,x,y,w,h,20,0xe8ddea,0xf7f0e7);box(g,x,y+.65,w,Math.max(.5,h-.65),23,0x9f98c3,0xb9b2d8);const pillow=houseIso({x:x+(w-1)/2,y:y-.1});g.lineStyle(1,0x8f899e).fillStyle(0xf7efdd).fillEllipse(pillow.x,pillow.y-24,38,13).strokeEllipse(pillow.x,pillow.y-24,38,13)}
 if(o.type==='kitchen'){box(g,x,y,w,h,35,0x86aaa3,0xf5e9d5);g.lineStyle(2,0x526d6b).lineBetween(p.x,p.y-25,p.x,p.y);g.fillStyle(0x6c7b84).fillEllipse(p.x-12,p.y-35,18,8);g.lineStyle(2,0x68637b).beginPath().arc(p.x-10,p.y-42,5,Math.PI,0).strokePath();g.fillStyle(0x464357).fillCircle(p.x+20,p.y-28,5).fillCircle(p.x+7,p.y-34,4)}
 if(o.type==='desk'){box(g,x,y,w,h,30,0xa68069,0xd4ae83);g.lineStyle(2,0x494557).fillStyle(0x566382).fillRect(p.x-11,p.y-58,25,22).strokeRect(p.x-11,p.y-58,25,22);g.fillStyle(0xb7c9d7).fillRect(p.x-8,p.y-55,19,15);g.fillStyle(0xefebdd).fillEllipse(p.x+15,p.y-25,10,5)}
 if(o.type==='sofa'){box(g,x,y,w,h,18,0xb08191,0xd8aabb);box(g,x,y-.05,w,.3,39,0xaf8096,0xc797ab);g.lineStyle(1,0x95677e).lineBetween(p.x,p.y-20,p.x,p.y-7)}
 if(o.type==='bowl'){g.lineStyle(2,0x6a5264).fillStyle(0xc995aa).fillEllipse(p.x,p.y,26,12).strokeEllipse(p.x,p.y,26,12);g.fillStyle(0x806349).fillEllipse(p.x,p.y-3,20,7);g.fillStyle(0xe6c48d).fillCircle(p.x-4,p.y-4,2).fillCircle(p.x+3,p.y-3,2)}
 if(o.type==='plant'){g.lineStyle(1.5,0x74594f).fillStyle(0xd2a38c).fillTriangle(p.x-10,p.y-10,p.x+10,p.y-10,p.x,p.y+7).fillEllipse(p.x,p.y-10,20,7);g.lineStyle(3,0x558365).lineBetween(p.x,p.y-10,p.x,p.y-34);g.fillStyle(0x7fad82).fillEllipse(p.x-8,p.y-29,16,8).fillEllipse(p.x+8,p.y-38,18,9).fillEllipse(p.x-4,p.y-46,12,10)}
 if(o.type==='lamp'){g.lineStyle(3,0x6e6573).lineBetween(p.x,p.y,p.x,p.y-49);g.fillStyle(0x81788a).fillEllipse(p.x,p.y,20,7);g.lineStyle(1.5,0xa18c6d).fillStyle(0xf7dcb1).fillEllipse(p.x,p.y-52,33,27).strokeEllipse(p.x,p.y-52,33,27)}
 if(o.type==='shelf'){box(g,x,y,w,h,54,0x997963,0xc19c7b);for(let i=0;i<5;i++){g.fillStyle([0xa99acb,0xc98a8b,0x96b6af,0xe0c28b,0x8299b2][i]).fillRect(p.x-20+i*8,p.y-43+i*3,6,23);g.lineStyle(1,0x776173).strokeRect(p.x-20+i*8,p.y-43+i*3,6,23)}}
 g.setDepth(houseIso({x:x+w-1,y:y+h-1}).y+2)
 const poly=new Phaser.Geom.Polygon([{x:p.x-(w+h)*13-8,y:p.y-78},{x:p.x+(w+h)*13+8,y:p.y-45},{x:p.x+(w+h)*13+8,y:p.y+18},{x:p.x-(w+h)*13-8,y:p.y+18}]);g.setInteractive(poly,Phaser.Geom.Polygon.Contains);return g
}
