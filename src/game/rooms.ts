import {footprint,tileKey,FURNITURE,type Blueprint,type FurnitureType} from './housing'
import type {Tile} from '../world/navigation'

export interface DetectedRoom {id:number;label:string;cells:Tile[];area:number;freeArea:number;doors:number;furniture:FurnitureType[]}
export function partitionAt(b:Blueprint,a:Tile,z:Tile){return b.walls.find(w=>w.axis==='x'?a.y===z.y&&a.y===w.y&&Math.min(a.x,z.x)===w.x:a.x===z.x&&a.x===w.x&&Math.min(a.y,z.y)===w.y)}
/** Doors divide architectural rooms while remaining passable to navigation. */
export function detectRooms(b:Blueprint):DetectedRoom[]{
 const seen=new Set<string>(),rooms:DetectedRoom[]=[],owners=new Map<string,number>()
 for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){
  const start={x,y};if(seen.has(tileKey(start)))continue
  const cells=[start];seen.add(tileKey(start))
  for(let i=0;i<cells.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const t=cells[i],next={x:t.x+dx,y:t.y+dy},key=tileKey(next)
   if(next.x>=0&&next.y>=0&&next.x<b.width&&next.y<b.height&&!seen.has(key)&&!partitionAt(b,t,next)){seen.add(key);cells.push(next)}
  }
  const id=rooms.length;for(const t of cells)owners.set(tileKey(t),id)
  const keys=new Set(cells.map(tileKey)),objects=b.objects.filter(o=>!o.stored&&footprint(o).some(t=>keys.has(tileKey(t)))),types=[...new Set(objects.map(o=>o.type))]
  const label=types.includes('bed')&&types.includes('kitchen')?'Open-plan studio':types.includes('bed')?'Bedroom':types.includes('kitchen')?'Kitchen':types.includes('desk')?'Study':types.includes('sofa')||types.includes('shelf')?'Lounge':types.includes('bowl')?'Chog room':'Empty room'
  const occupied=new Set(objects.flatMap(o=>footprint(o).filter(t=>keys.has(tileKey(t))).map(tileKey)))
  rooms.push({id,label,cells,area:cells.length,freeArea:cells.length-occupied.size,doors:0,furniture:types})
 }
 for(const w of b.walls.filter(w=>w.door)){
  const a=owners.get(tileKey(w)),z=owners.get(tileKey({x:w.x+(w.axis==='x'?1:0),y:w.y+(w.axis==='y'?1:0)}))
  if(a!==undefined&&z!==undefined&&a!==z){rooms[a].doors++;rooms[z].doors++}
 }
 return rooms
}
export function partitionCutsFurniture(b:Blueprint,w:Blueprint['walls'][number]):boolean {
 const a=tileKey(w),z=tileKey({x:w.x+(w.axis==='x'?1:0),y:w.y+(w.axis==='y'?1:0)})
 return b.objects.some(o=>!o.stored&&footprint(o).some(t=>tileKey(t)===a)&&footprint(o).some(t=>tileKey(t)===z))
}
export const ROOM_COLORS=['#eee4f4','#e3ede5','#efe8d6','#e1eaf2','#f2e1e4','#e3eceb']
export function roomContents(room:DetectedRoom):string{return room.furniture.map(type=>FURNITURE[type].label).join(' · ')||'Ready for your furnishings'}
