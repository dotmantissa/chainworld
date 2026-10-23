import type { ActionKind, GameState, ZoneId } from './types'
import type { Tile } from '../world/navigation'
export type CityId=Exclude<ZoneId,5>
export const PLOT_GRID=8,STREET_WIDTH=36,STREET_HEIGHT=39,STEP_MS=180
export const HOME_STYLES=['linen','sage','lavender','terracotta','midnight'] as const
export type HomeStyle=typeof HOME_STYLES[number]
export interface Estate {city:CityId;district:number;x:number;y:number;plots:Tile[];style:HomeStyle;open:boolean}
export interface StreetJourney {from:Tile;path:Tile[];startedAt:number;endsAt:number}
export interface WorldLocation {kind:'home'|'street'|'visit';tile:Tile;host?:string;journey:StreetJourney|null}
export interface Neighbor {identity:string;tokenId:number;name:string;image?:string;appearance:GameState['appearance'];profile:GameState['profile'];home:Estate;housingTier:number;location:WorldLocation;online:boolean}
export interface LandOffer {id:string;buyer:string;seller:string;city:CityId;district:number;x:number;y:number;amount:number;expiresAt:number;status:string}
export interface NeighborhoodSnapshot {neighbors:Neighbor[];parcels:{x:number;y:number;identity:string}[];offers:LandOffer[];messages:{id:string;sender:string;recipient:string;gesture:string;at:number}[]}
export const DEFAULT_LOCATION:WorldLocation={kind:'home',tile:{x:5,y:8},journey:null}
export const DEFAULT_ESTATE:Estate={city:0,district:0,x:0,y:0,plots:[{x:0,y:0}],style:'linen',open:true}
export const identityOf=(s:Pick<GameState,'chainId'|'collection'|'tokenId'>)=>`${s.chainId}:${s.collection.toLowerCase()}:${s.tokenId}`
export const plotOrigin=(plot:Tile):Tile=>({x:2+plot.x*4,y:5+plot.y*4})
export const frontDoor=(plot:Tile):Tile=>{const p=plotOrigin(plot);return{x:p.x+1,y:p.y+2}}
export const SERVICES=[
  {id:'cafe',label:'The Mempool Café',frame:2,tile:{x:5,y:1},approach:{x:5,y:3},actions:['eat','snack'] as ActionKind[]},
  {id:'work',label:'Proof of Work Club',frame:3,tile:{x:13,y:1},approach:{x:13,y:3},actions:['work','focus','hermit'] as ActionKind[]},
  {id:'park',label:'Touch Grass Gardens',frame:4,tile:{x:21,y:1},approach:{x:21,y:3},actions:['socialize','unwind'] as ActionKind[]},
  {id:'station',label:'Bridge & Prejudice Transit',frame:5,tile:{x:29,y:1},approach:{x:29,y:3},actions:[] as ActionKind[]},
]
export const CITY_INFRASTRUCTURE:Record<CityId,{architecture:string;services:string[];accent:string}>= {
  0:{architecture:'Sandstone homes, violet trams and a parallel validator hall',services:['Parallel Perk Café','Ten Thousand TPS Works','Monad Meadow','Parallel Lines Tram'],accent:'#ad91d3'},
  1:{architecture:'Limestone townhouses, prestigious plazas and brass streetlights',services:['The Expensive Espresso','Proof of Work Avenue','Central Gwei Park','Peak Fare Terminal'],accent:'#bba785'},
  2:{architecture:'Blue waterfront cottages, maker studios and public gardens',services:['Based & Breakfast','Builder’s Block Studio','Blue Sky Gardens','All Your Base Station'],accent:'#77aac5'},
  3:{architecture:'Terracotta courtyards, traders’ arcades and optimistic parks',services:['Arbi’s Sandwich Counter','Optimistic Accounts','Seven Day Gardens','Finality Eventually Station'],accent:'#85b6b6'},
  4:{architecture:'Colorful seaside villas, a market arcade and mosaic promenades',services:['Many Sided Meals','Polygon Maker Market','Mosaic Shore Gardens','Round Trip Station'],accent:'#b89cc9'},
}
export const serviceName=(city:ZoneId,index:number)=>city===5?SERVICES[index].label:CITY_INFRASTRUCTURE[city].services[index]
export const adjacent=(a:Tile,b:Tile)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1
export const distance=(a:Tile,b:Tile)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)
export function streetWalkable(tile:Tile):boolean {
  if(!Number.isInteger(tile.x)||!Number.isInteger(tile.y)||tile.x<0||tile.y<0||tile.x>=STREET_WIDTH||tile.y>=STREET_HEIGHT)return false
  // All parcels have fenced building pads, including unsold ones; sidewalks remain public.
  if(tile.y>=5&&tile.x>=2&&tile.x<34&&tile.y<37&&((tile.x-2)%4)<2&&((tile.y-5)%4)<2)return false
  return !SERVICES.some(service=>Math.abs(tile.x-service.tile.x)<=1&&tile.y<=2)
}
export function streetPath(start:Tile,target:Tile):Tile[]|null {
  if(!streetWalkable(start)||!streetWalkable(target))return null
  const key=(tile:Tile)=>tile.y*STREET_WIDTH+tile.x
  const queue=[start],previous=new Map<number,Tile|null>([[key(start),null]])
  for(let at=0;at<queue.length;at++) {
    const tile=queue[at]
    if(key(tile)===key(target)){
      const path:Tile[]=[];let cursor:Tile|null=tile
      while(cursor&&key(cursor)!==key(start)){path.push(cursor);cursor=previous.get(key(cursor))??null}
      return path.reverse()
    }
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const next={x:tile.x+dx,y:tile.y+dy}
      if(streetWalkable(next)&&!previous.has(key(next))){previous.set(key(next),tile);queue.push(next)}
    }
  }
  return null
}
export function journeyTile(location:WorldLocation,now:number):Tile {
  const j=location.journey
  if(!j||!j.path.length)return location.tile
  const completed=Math.floor(Math.max(0,now-j.startedAt)/STEP_MS)
  return completed>=j.path.length?j.path[j.path.length-1]:completed>0?j.path[completed-1]:j.from
}
export function settleLocation(s:GameState,now:number):GameState {
  const location=s.location??DEFAULT_LOCATION
  return location.journey&&now>=location.journey.endsAt?{...s,location:{...location,tile:location.journey.path[location.journey.path.length-1],journey:null}}:s
}
export function estateDefault(s:GameState):Estate {
  const size=1+Math.floor(s.meters.housingTier/2)
  return {...DEFAULT_ESTATE,city:s.currentZone===5?0:s.currentZone,plots:[{x:0,y:0},...(size>=2?[{x:1,y:0}]:[]),...(size>=3?[{x:0,y:1}]:[])]}
}
export function parseEstate(value:unknown):Estate|null {
  if(!value||typeof value!=='object')return null
  const h=value as Estate
  if(![0,1,2,3,4].includes(h.city)||!Number.isSafeInteger(h.district)||h.district<0||!HOME_STYLES.includes(h.style)||typeof h.open!=='boolean'||!Array.isArray(h.plots)||!h.plots.length||h.plots.length>64)return null
  if(!h.plots.every(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<8&&p.y<8)||!h.plots.some(p=>p.x===h.x&&p.y===h.y))return null
  if(new Set(h.plots.map(p=>`${p.x},${p.y}`)).size!==h.plots.length)return null
  const connected=[h.plots[0]]
  for(let i=0;i<connected.length;i++)for(const p of h.plots)if(!connected.includes(p)&&adjacent(connected[i],p))connected.push(p)
  return connected.length===h.plots.length?h:null
}
