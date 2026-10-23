import type {ActionKind,GameState} from './types'
import type {Tile} from '../world/navigation'
import {ensureHousehold,indoorTile} from './household'
import {FURNITURE,approachPath,housePath,entryTile,validBlueprint,ROOM_STEP,type Blueprint,type FurnitureType} from './housing'
export function activeBlueprint(s:GameState):Blueprint{return s.location.interior??ensureHousehold(s).household!.blueprint}
export function queueIndoor(s:GameState,target:Tile,now:number,use?:{objectId:string;kind:ActionKind}):GameState{
 s=ensureHousehold(s);const h=s.household!,b=activeBlueprint(s)
 if(s.action||s.job||h.journey||s.location.journey)return {...s,lastMessage:'Finish or cancel your current activity first.'}
 const path=housePath(b,h.humanTile,target)
 if(path===null)return {...s,lastMessage:'That route is blocked by furniture or a wall.'}
 const end=now+path.length*ROOM_STEP
 return {...s,household:{...h,journey:path.length?{from:h.humanTile,path,startedAt:now,endsAt:end}:null,pendingUse:use?{...use,arrivesAt:end,layoutVersion:b.version}:null},lastMessage:use?'Walking to your selected object…':'Walking through your home…'}
}
export function queueObject(s:GameState,id:string,kind:ActionKind,now:number):GameState{
 s=ensureHousehold(s);const b=activeBlueprint(s),o=b.objects.find(o=>o.id===id&&!o.stored)
 if(!o||!(FURNITURE[o.type].actions as readonly string[]).includes(kind))return {...s,lastMessage:'This object does not support that interaction.'}
 const path=approachPath(b,s.household!.humanTile,o)
 if(path===null)return {...s,lastMessage:'This object is unreachable. Clear a path in Build & Buy.'}
 return queueIndoor(s,path[path.length-1]??s.household!.humanTile,now,{objectId:id,kind})
}
export type HousingEdit=
 |{type:'buyFurniture';furniture:FurnitureType;x:number;y:number;rotation:0|1;version:number}
 |{type:'moveFurniture';id:string;x:number;y:number;rotation:0|1;version:number}
 |{type:'storeFurniture'|'sellFurniture';id:string;version:number}
 |{type:'expandRoom';axis:'x'|'y';version:number}
 |{type:'editWall';x:number;y:number;axis:'x'|'y';door:boolean;remove:boolean;version:number}
export function editHousing(s:GameState,c:HousingEdit,price:(n:number)=>number):GameState{
 s=ensureHousehold(s);const h=s.household!,b=h.blueprint,fail=(lastMessage:string)=>({...s,lastMessage})
 if(s.location.kind!=='home'||s.location.venue||s.currentZone!==s.home.city)return fail('Build at your own home, outside any activity.')
 if(s.action||s.job||h.journey||h.pendingUse)return fail('Finish walking and activities before building.')
 if(c.version!==b.version)return fail('Your home changed. The catalogue refreshed; choose again.')
 let next=structuredClone(b),cost=0,refund=0
 if(c.type==='buyFurniture'){cost=price(FURNITURE[c.furniture].price);next.objects.push({id:`bought-${s.sequence+1}-${c.furniture}`,type:c.furniture,x:c.x,y:c.y,rotation:c.rotation,stored:false,paid:cost})}
 else if(c.type==='expandRoom'){const cells=c.axis==='x'?b.height:b.width;cost=price(cells*12);if((b.width+(c.axis==='x'?1:0))*(b.height+(c.axis==='y'?1:0))>64*s.home.plots.length)return fail('Buy more adjacent land before expanding further.');if(c.axis==='x')next.width++;else next.height++}
 else if(c.type==='editWall'){next.walls=next.walls.filter(w=>!(w.x===c.x&&w.y===c.y&&w.axis===c.axis));if(!c.remove){next.walls.push({x:c.x,y:c.y,axis:c.axis,door:c.door});cost=price(c.door?10:6)}}
 else{const o=next.objects.find(o=>o.id===c.id);if(!o)return fail('That furniture item no longer exists.');if(c.type==='moveFurniture')Object.assign(o,{x:c.x,y:c.y,rotation:c.rotation,stored:false});else if(c.type==='storeFurniture')o.stored=true;else{refund=Math.floor((o.paid??FURNITURE[o.type].price)*.6);next.objects=next.objects.filter(i=>i.id!==o.id)}}
 if(cost>s.gChog)return fail('Not enough household gCHOG for this change.')
 next.version++
 if(!validBlueprint(next))return fail('Placement blocked: keep the entrance, floor routes and object access clear.')
 const human=housePath(next,entryTile(next),h.humanTile)!==null?h.humanTile:entryTile(next)
 return {...s,gChog:s.gChog-cost+refund,sequence:s.sequence+1,household:{...h,blueprint:next,humanTile:human},lastMessage:c.type==='buyFurniture'?'Furniture purchased and placed.':c.type==='sellFurniture'?`Furniture sold for ${refund} gCHOG.`:c.type==='expandRoom'?'Home expanded. Your new floor is ready.':'Home layout saved.'}
}
export function stopIndoor(s:GameState,now:number):GameState{return s.household?{...s,household:{...s.household,humanTile:indoorTile(s.household,now),journey:null,pendingUse:null}}:s}
