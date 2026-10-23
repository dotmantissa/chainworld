import type {GameState,ZoneId} from './types'
import {starterBlueprint,seedOf,houseWalkable,validBlueprint,type Blueprint,type FurnitureType} from './housing'
import {CITY_INFRASTRUCTURE,type CityId} from './neighborhood'
export type Venue='cafe'|'work'|'park'
export interface CityNpc {id:string;name:string;role:string;city:CityId;venue:Venue;x:number;y:number;gender:'female'|'male';interest:string}
const people=[['Violet','Mika','Jun'],['Ada','Theo','Iris'],['Bea','Noah','Kai'],['Amira','Sol','Nia'],['Marin','Ren','Coral']]
export function placeKey(city:ZoneId,venue:Venue):string{return `city:${city}:0:${venue}`}
export function venueOf(key:string|undefined):Venue|null{const v=key?.split(':')[3];return v==='cafe'||v==='work'||v==='park'?v:null}
const cache=new Map<string,Blueprint>()
export function venueBlueprint(city:CityId,venue:Venue):Blueprint{
 const key=placeKey(city,venue),old=cache.get(key);if(old)return structuredClone(old)
 const b=starterBlueprint(seedOf(key),2+city%3,true),allowed:FurnitureType[]=venue==='cafe'?['kitchen','sofa','shelf','plant']:venue==='work'?['desk','shelf','sofa','lamp']:['sofa','plant','bowl']
 b.objects=b.objects.filter(o=>allowed.includes(o.type));b.environment=venue
 const extras:FurnitureType[]=venue==='park'?['sofa','sofa','plant','plant','plant','plant','plant']:venue==='cafe'?['sofa','plant','plant','shelf','lamp']:['desk','desk','shelf','plant','lamp']
 for(const type of extras){let placed=false;for(let y=0;y<b.height-1&&!placed;y++)for(let x=0;x<b.width&&!placed;x++){const o={id:`venue-${b.objects.length}-${type}`,type,x,y,rotation:0 as const,stored:false};if(validBlueprint({...b,objects:[...b.objects,o]})){b.objects.push(o);placed=true}}}
 // Add a separate NPC standing space that navigation treats as occupied.
 const positions=[];for(let y=1;y<b.height-1;y++)for(let x=1;x<b.width-1;x++)if(houseWalkable(b,{x,y}))positions.push({x,y})
 const ordered=[...positions.slice(city*3),...positions.slice(0,city*3)];b.npcTiles=[];for(const p of ordered)if(validBlueprint({...b,npcTiles:[p]})){b.npcTiles=[p];break}cache.set(key,structuredClone(b));return b
}
export function cityNpc(city:CityId,venue:Venue):CityNpc{
 const i=venue==='cafe'?0:venue==='work'?1:2,p=venueBlueprint(city,venue).npcTiles?.[0]??{x:1,y:1}
 return {id:`npc:${city}:${venue}`,name:people[city][i],role:venue==='cafe'?'Café regular':venue==='work'?'Studio host':'Park keeper',city,venue,...p,gender:i===1?'male':'female',interest:venue==='cafe'?'good food and local stories':venue==='work'?'making something useful':'Chogs and quiet green spaces'}
}
export function npcById(id:string):CityNpc|null{const m=id.match(/^npc:([0-4]):(cafe|work|park)$/);return m?cityNpc(Number(m[1]) as CityId,m[2] as Venue):null}
export function venueTitle(s:Pick<GameState,'currentZone'|'location'>):string{const v=venueOf(s.location.venue),index=v==='cafe'?0:v==='work'?1:2;return v&&s.currentZone!==5?CITY_INFRASTRUCTURE[s.currentZone].services[index]:''}
export const TOPICS={introduce:'Introduce yourself',chogs:'Talk about Chogs',hobby:'Ask about their interests',story:'Share a neighborhood story',gift:'Share a home-cooked gift',hangout:'Spend time together'} as const
