import type {GameState} from './types'
import type {Tile} from '../world/navigation'
export const FURNITURE={
 bed:{label:'Cloud bed',price:45,w:2,h:3,family:'rest',actions:['rest','sleep']},
 kitchen:{label:'Little kitchen',price:60,w:2,h:1,family:'eat',actions:['eat','snack','wash','cookBreakfast','cookStew','eatLeftovers']},
 desk:{label:'Study desk',price:65,w:2,h:1,family:'work',actions:['work','focus','hermit','practiceCoding']},
 sofa:{label:'Reading sofa',price:35,w:2,h:1,family:'socialize',actions:['socialize','unwind','relax','paint']},
 bowl:{label:'Chog food bowl',price:15,w:1,h:1,family:'pet',actions:[]},
 plant:{label:'Window fern',price:12,w:1,h:1,family:'decor',actions:[]},
 lamp:{label:'Paper lantern',price:18,w:1,h:1,family:'decor',actions:[]},
 shelf:{label:'Bookcase',price:30,w:2,h:1,family:'socialize',actions:['unwind']},
} as const
export type FurnitureType=keyof typeof FURNITURE
export interface Furniture {id:string;type:FurnitureType;x:number;y:number;rotation:0|1;stored:boolean;paid?:number}
export interface Partition {x:number;y:number;axis:'x'|'y';door:boolean}
export interface Blueprint {width:number;height:number;version:number;objects:Furniture[];walls:Partition[];environment?:'cafe'|'work'|'park';npcTiles?:Tile[]}
export const ROOM_STEP=200
export const tileKey=(t:Tile)=>`${t.x},${t.y}`
export const entryTile=(b:Blueprint):Tile=>({x:Math.floor(b.width/2),y:b.height-1})
export function footprint(o:Furniture):Tile[]{const d=FURNITURE[o.type],w=o.rotation?d.h:d.w,h=o.rotation?d.w:d.h;return Array.from({length:w*h},(_,i)=>({x:o.x+i%w,y:o.y+Math.floor(i/w)}))}
export function houseWalkable(b:Blueprint,t:Tile):boolean{return Number.isInteger(t.x)&&Number.isInteger(t.y)&&t.x>=0&&t.y>=0&&t.x<b.width&&t.y<b.height&&!b.npcTiles?.some(p=>p.x===t.x&&p.y===t.y)&&!b.objects.some(o=>!o.stored&&footprint(o).some(p=>p.x===t.x&&p.y===t.y))}
export function wallBlocks(b:Blueprint,a:Tile,z:Tile):boolean{return b.walls.some(w=>!w.door&&(w.axis==='x'?a.y===z.y&&a.y===w.y&&Math.min(a.x,z.x)===w.x:a.x===z.x&&a.x===w.x&&Math.min(a.y,z.y)===w.y))}
export function housePath(b:Blueprint,start:Tile,goal:Tile):Tile[]|null{
 if(!houseWalkable(b,start)||!houseWalkable(b,goal))return null
 const queue=[start],previous=new Map<string,Tile|null>([[tileKey(start),null]])
 for(let i=0;i<queue.length;i++){
  const t=queue[i]
  if(tileKey(t)===tileKey(goal)){const path:Tile[]=[];let p:Tile|null=t;while(p&&tileKey(p)!==tileKey(start)){path.push(p);p=previous.get(tileKey(p))??null}return path.reverse()}
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const n={x:t.x+dx,y:t.y+dy};if(houseWalkable(b,n)&&!wallBlocks(b,t,n)&&!previous.has(tileKey(n))){previous.set(tileKey(n),t);queue.push(n)}}
 }return null
}
export function approaches(b:Blueprint,o:Furniture):Tile[]{const cells=footprint(o),unique=new Map<string,Tile>();for(const t of cells)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p={x:t.x+dx,y:t.y+dy};if(houseWalkable(b,p))unique.set(tileKey(p),p)}return [...unique.values()]}
export function approachPath(b:Blueprint,start:Tile,o:Furniture):Tile[]|null{return approaches(b,o).map(p=>housePath(b,start,p)).filter((p):p is Tile[]=>p!==null).sort((a,z)=>a.length-z.length)[0]??null}
export function validBlueprint(b:Blueprint):boolean{
 if(!Number.isInteger(b.width)||!Number.isInteger(b.height)||b.width<7||b.height<7||b.width>12||b.height>12||!Number.isSafeInteger(b.version)||b.version<1||!Array.isArray(b.objects)||b.objects.length>80||!Array.isArray(b.walls)||b.walls.length>200)return false
 const occupied=new Set<string>(),ids=new Set<string>()
 for(const o of b.objects){if(!o||!Object.prototype.hasOwnProperty.call(FURNITURE,o.type)||typeof o.id!=='string'||o.id.length>80||ids.has(o.id)||![0,1].includes(o.rotation)||typeof o.stored!=='boolean'||!Number.isInteger(o.x)||!Number.isInteger(o.y)||o.paid!==undefined&&(!Number.isSafeInteger(o.paid)||o.paid<0||o.paid>1e9))return false;ids.add(o.id);if(o.stored)continue;for(const p of footprint(o)){const k=tileKey(p);if(p.x<0||p.y<0||p.x>=b.width||p.y>=b.height||occupied.has(k))return false;occupied.add(k)}}
 const edges=new Set<string>()
 for(const p of b.npcTiles??[]){const k=tileKey(p);if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||p.x>=b.width||p.y>=b.height||occupied.has(k))return false;occupied.add(k)}
 for(const w of b.walls){if(!w||!['x','y'].includes(w.axis)||typeof w.door!=='boolean'||!Number.isInteger(w.x)||!Number.isInteger(w.y)||w.x<0||w.y<0||w.x>=b.width-(w.axis==='x'?1:0)||w.y>=b.height-(w.axis==='y'?1:0))return false;const k=`${w.axis}:${w.x}:${w.y}`;if(edges.has(k))return false;edges.add(k)}
 const entry=entryTile(b);if(!houseWalkable(b,entry))return false
 // Every floor tile and every object's usable perimeter must remain reachable.
 const queue=[entry],seen=new Set([tileKey(entry)])
 for(let i=0;i<queue.length;i++){const t=queue[i];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const n={x:t.x+dx,y:t.y+dy},k=tileKey(n);if(n.x>=0&&n.y>=0&&n.x<b.width&&n.y<b.height&&!occupied.has(k)&&!seen.has(k)&&!wallBlocks(b,t,n)){seen.add(k);queue.push(n)}}}
 return seen.size===b.width*b.height-occupied.size&&b.objects.filter(o=>!o.stored).every(o=>approaches(b,o).length>0)
}
export function seedOf(value:string):number{let h=2166136261;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);return h>>>0}
export function houseSeed(s:Pick<GameState,'chainId'|'collection'|'tokenId'|'appearance'>):number{return seedOf(`${s.chainId}:${s.collection.toLowerCase()}:${s.tokenId}:${s.appearance.sourceImage??''}:household-v1`)}
export function starterBlueprint(seed:number,level:number,legacy=false):Blueprint{
 const b:Blueprint={width:7+Math.min(3,Math.floor(level/2)),height:7+Math.min(2,Math.floor(level/2)),version:1,objects:[],walls:[]}
 const types:FurnitureType[]=legacy?['bed','kitchen','desk','sofa','bowl']:level===0?(seed%3===0?[]:['bed']):level===1?['bed',seed%2?'kitchen':'desk','bowl']:['bed','kitchen','desk','sofa','bowl','plant',...(level>=3?['lamp','shelf'] as FurnitureType[]:[])]
 for(const[typeIndex,type]of types.entries()){
  const options:Tile[]=[];for(let y=0;y<b.height-1;y++)for(let x=0;x<b.width;x++)options.push({x,y})
  options.sort((a,z)=>seedOf(`${seed}:${type}:${a.x},${a.y}`)-seedOf(`${seed}:${type}:${z.x},${z.y}`))
  for(const p of options){const o:Furniture={id:`starter-${typeIndex}-${type}`,type,...p,rotation:0,stored:false};const next={...b,objects:[...b.objects,o]};if(validBlueprint(next)){b.objects.push(o);break}}
 }return b
}
