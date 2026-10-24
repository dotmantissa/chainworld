import type {GameState,ZoneId} from './types'
import {houseWalkable,entryTile,validBlueprint,type Blueprint,type FurnitureType} from './housing'
import {CITY_INFRASTRUCTURE,type CityId} from './neighborhood'
export const VENUES=['cafe','work','park','library'] as const
export type Venue=typeof VENUES[number]
export const VENUE_SERVICE_INDEX:Record<Venue,number>={cafe:0,work:1,park:2,library:4}
export const venueForService=(index:number)=>VENUES.find(v=>VENUE_SERVICE_INDEX[v]===index)
export interface CityNpc {id:string;name:string;role:string;city:CityId;venue:Venue;x:number;y:number;gender:'female'|'male';interest:string}
const people=[['Violet','Mika','Jun','Rowan'],['Ada','Theo','Iris','Cleo'],['Bea','Noah','Kai','Sage'],['Amira','Sol','Nia','Luca'],['Marin','Ren','Coral','Ash']]
export function placeKey(city:ZoneId,venue:Venue):string{return `city:${city}:0:${venue}`}
export function venueOf(key:string|undefined):Venue|null{const v=key?.split(':')[3];return VENUES.includes(v as Venue)?v as Venue:null}
const cache=new Map<string,Blueprint>()
export function venueBlueprint(city:CityId,venue:Venue):Blueprint{
 const key=placeKey(city,venue),old=cache.get(key);if(old)return structuredClone(old)
 // Public spaces are authored commercial floorplans, never household starter packages.
 const b:Blueprint={width:12,height:12,version:2,environment:venue,objects:[],walls:[],npcTiles:[{x:6,y:2}]}
 const add=(type:FurnitureType,x:number,y:number,rotation:0|1=0)=>{const object={id:`${venue}-${city}-${b.objects.length}-${type}`,type,x,y,rotation,stored:false};const next={...b,objects:[...b.objects,object]};if(!validBlueprint(next))throw new Error(`Invalid authored ${venue} placement: ${type} ${x},${y}`);b.objects.push(object)}
 if(venue==='cafe'){
  add('cafeCounter',1,1);add('cafeCounter',8,1);add('kitchen',1,0);add('kitchen',8,0)
  for(const x of [0,4,8])for(const y of [4,8])add('cafeTable',x,y)
  add('basin',6,0);add('shelf',0,11);add('shelf',9,11)
  for(const [x,y]of [[0,3],[11,3],[3,6],[7,6],[11,7],[3,10],[7,10]])add((x+y+city)%2?'plant':'lamp',x,y)
 }else if(venue==='library'){
  for(const x of [0,3])for(const y of [0,3,6,9])add('bookStack',x,y)
  for(const x of [8,10])add('bookStack',x,0)
  for(const x of [8])for(const y of [3,6,9])add('readingTable',x,y)
  add('desk',5,0);add('desk',10,3,1);add('sofa',0,11);add('sofa',3,11)
  for(const [x,y]of [[6,4],[5,5],[5,9],[11,2],[11,7],[11,11],[7,11]])add((x+y+city)%2?'plant':'lamp',x,y)
 }else if(venue==='work'){
  for(const x of [0,3,8])for(const y of [0,3,6])add('desk',x,y)
  add('meetingTable',0,9);add('meetingTable',8,9);add('kitchen',10,0,1);add('basin',11,3);add('shelf',10,6,1)
  for(const [x,y]of [[6,0],[5,2],[7,4],[2,7],[5,8],[7,8],[4,11],[11,11]])add((x+y+city)%2?'plant':'lamp',x,y)
 }else{
  for(const x of [0,9])for(const y of [2,6,10])add('sofa',x,y)
  for(const [x,y]of [[0,0],[2,0],[4,0],[8,0],[10,0],[2,4],[4,4],[8,4],[11,4],[2,8],[4,8],[8,8],[11,8],[3,11],[8,11]])add('plant',x,y)
  add('bowl',5,5);add('bowl',7,9);add('lamp',0,5);add('lamp',7,11)
 }
 // Clear central promenade and cross aisles connect every seat, shelf, service and NPC.
 cache.set(key,structuredClone(b));return b
}
export function cityNpc(city:CityId,venue:Venue):CityNpc{
 const i=VENUES.indexOf(venue),p=venueBlueprint(city,venue).npcTiles?.[0]??{x:1,y:1}
 return {id:`npc:${city}:${venue}`,name:people[city][i],role:venue==='cafe'?'Café regular':venue==='work'?'Studio host':venue==='library'?'Librarian':'Park keeper',city,venue,...p,gender:i===1?'male':'female',interest:venue==='cafe'?'good food and local stories':venue==='work'?'making something useful':venue==='library'?'books, ideas and neighborhood history':'Chogs and quiet green spaces'}
}
export function npcById(id:string):CityNpc|null{const m=id.match(/^npc:([0-4]):(cafe|work|park|library)$/);return m?cityNpc(Number(m[1]) as CityId,m[2] as Venue):null}
export function venueTitle(s:Pick<GameState,'currentZone'|'location'>):string{const v=venueOf(s.location.venue),index=v?VENUE_SERVICE_INDEX[v]:0;return v&&s.currentZone!==5?CITY_INFRASTRUCTURE[s.currentZone].services[index]:''}
export const TOPICS={introduce:'Introduce yourself',chogs:'Talk about Chogs',hobby:'Ask about their interests',story:'Share a neighborhood story',gift:'Share a home-cooked gift',hangout:'Spend time together'} as const

/** Refresh legacy public geometry only after its active interaction/approach finishes. */
export function refreshVenue(s:GameState):GameState{const v=venueOf(s.location.venue);if(!v||s.currentZone===5||!s.household||s.action||s.job||s.household.journey||s.household.pendingUse||!s.location.interior||s.location.interior.version>=2)return s;const interior=venueBlueprint(s.currentZone,v);return {...s,location:{...s.location,interior},household:{...s.household,humanTile:houseWalkable(interior,s.household.humanTile)?s.household.humanTile:entryTile(interior)}}}
