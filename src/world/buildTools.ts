import type {FurnitureType,Furniture} from '../game/housing'
import {editHousing,type HousingEdit} from '../game/indoor'
import type {GameState} from '../game/types'
import {cityPrice} from '../game/zones'
export type BuildTool={kind:'select';id?:string}|{kind:'place';type:FurnitureType;id?:string;rotation:0|1}|{kind:'wall';axis:'x'|'y';door:boolean;remove:boolean}
export interface BuildPreview {valid:boolean;message:string;command:HousingEdit;object?:Furniture;cost:number}
/** Uses exactly the same pure validator and price calculation as the authoritative edit. */
export function buildPreview(s:GameState,tool:BuildTool,x:number,y:number,gas?:number|null):BuildPreview|null{
 const b=s.household?.blueprint;if(!s.buildMode||!b||tool.kind==='select')return null
 const command:HousingEdit=tool.kind==='wall'?{type:'editWall',x,y,axis:tool.axis,door:tool.door,remove:tool.remove,version:b.version}:tool.id?{type:'moveFurniture',id:tool.id,x,y,rotation:tool.rotation,version:b.version}:{type:'buyFurniture',furniture:tool.type,x,y,rotation:tool.rotation,version:b.version}
 const next=editHousing(s,command,n=>cityPrice(n,s.home.city,gas)),cost=Math.max(0,s.gChog-next.gChog),valid=next.household!.blueprint.version===b.version+1
 return {valid,message:valid?tool.kind==='wall'?'Click to edit this wall edge':tool.id?'Release to place owned furniture':`Click to buy & place · ${cost} gCHOG`:next.lastMessage,command,cost,object:tool.kind==='place'?{id:tool.id??'preview',type:tool.type,x,y,rotation:tool.rotation,stored:false}:undefined}
}
