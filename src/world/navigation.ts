import type { FurnitureKind } from './interactions'
export interface Tile { x:number; y:number }
export const ROOM_SIZE=7
export const OBJECTS:{kind:FurnitureKind;label:string;tile:Tile;approach:Tile;footprint:Tile[];texture:string;width:number;anchorY:number}[]=[
  {kind:'eat',label:'Kitchen',tile:{x:0.3,y:2.8},approach:{x:1,y:3},footprint:[{x:0,y:2},{x:0,y:3}],texture:'kitchen',width:195,anchorY:0.8},
  {kind:'rest',label:'Bed',tile:{x:5.4,y:1},approach:{x:4,y:2},footprint:[{x:5,y:0},{x:6,y:0},{x:5,y:1},{x:6,y:1},{x:5,y:2},{x:6,y:2}],texture:'bed',width:225,anchorY:0.75},
  {kind:'work',label:'Workstation',tile:{x:1.7,y:0.3},approach:{x:2,y:1},footprint:[{x:1,y:0},{x:2,y:0}],texture:'workstation',width:185,anchorY:0.8},
  {kind:'socialize',label:'Reading nook',tile:{x:5.3,y:5.2},approach:{x:4,y:5},footprint:[{x:5,y:5},{x:6,y:5},{x:5,y:6},{x:6,y:6}],texture:'social',width:175,anchorY:0.82},
]
export function walkable(t:Tile):boolean{return Number.isInteger(t.x)&&Number.isInteger(t.y)&&t.x>=0&&t.y>=0&&t.x<ROOM_SIZE&&t.y<ROOM_SIZE&&!OBJECTS.some(o=>o.footprint.some(f=>f.x===t.x&&f.y===t.y))}
const key=(t:Tile)=>`${t.x},${t.y}`
export function findPath(start:Tile,goal:Tile):Tile[]|null{
  if(!walkable(goal))return null
  const queue:Tile[][]=[[start]],seen=new Set([key(start)])
  while(queue.length){
    const route=queue.shift()!,tile=route[route.length-1]
    if(key(tile)===key(goal))return route.slice(1)
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const next={x:tile.x+dx,y:tile.y+dy}
      if(walkable(next)&&!seen.has(key(next))){seen.add(key(next));queue.push([...route,next])}
    }
  }
  return null
}
export function iso(t:Tile):{x:number;y:number}{return{x:400+(t.x-t.y)*45,y:178+(t.x+t.y)*22}}
export function fromIso(x:number,y:number):Tile{return{x:Math.round((x-400)/90+(y-178)/44),y:Math.round((y-178)/44-(x-400)/90)}}
