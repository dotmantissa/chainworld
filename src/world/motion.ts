import type {Tile} from './navigation'
export interface MotionJourney {from:Tile;path:Tile[];startedAt:number;endsAt:number}
export function directionFrame(from:Tile,to:Tile):number{
 const dx=to.x-from.x,dy=to.y-from.y
 return Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy<0?2:0
}
/** Renderer interpolation shares the authoritative route and step duration. */
export function sampleJourney(j:MotionJourney|null|undefined,tile:Tile,now:number,stepMs:number):{tile:Tile;moving:boolean;frame:number;index:number}{
 if(!j?.path.length)return {tile,moving:false,frame:0,index:0}
 const steps=Math.max(0,(now-j.startedAt)/stepMs),index=Math.floor(steps)
 if(now>=j.endsAt||index>=j.path.length)return {tile:j.path[j.path.length-1],moving:false,frame:directionFrame(j.path.length>1?j.path[j.path.length-2]:j.from,j.path[j.path.length-1]),index:j.path.length}
 const from=index?j.path[index-1]:j.from,to=j.path[index],fraction=steps-index
 return {tile:{x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction},moving:true,frame:directionFrame(from,to),index}
}
export const WALK_KEYS:Record<string,Tile>={w:{x:0,y:-1},a:{x:-1,y:0},s:{x:0,y:1},d:{x:1,y:0}}
