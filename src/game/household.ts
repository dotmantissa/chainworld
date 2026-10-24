import type {GameState} from './types'
import type {Tile} from '../world/navigation'
import {entryTile,houseSeed,starterBlueprint,FURNITURE,type Blueprint} from './housing'
import {estateDefault,HOME_STYLES,frontDoor} from './neighborhood'
export interface IndoorJourney {from:Tile;path:Tile[];startedAt:number;endsAt:number}
export interface Household {
 schema:1;seed:number;sourceTier:string;grant:'legacy-rank-v1'|'source-tier-v1';blueprint:Blueprint;humanTile:Tile
 journey:IndoorJourney|null;pendingUse:{objectId:string;kind:import('./types').ActionKind;layoutVersion:number;arrivesAt:number}|null
 pet:{hunger:number;energy:number;affection:number;bond:number;following:boolean;lastCare:number}
 relationships:Record<string,{friendship:number;meetings:number;lastMet:number;memory:string}>
}
export const SOURCE_PACKAGES={Common:{level:0,funds:200},Uncommon:{level:1,funds:500},Rare:{level:2,funds:1200},Epic:{level:3,funds:2500},Legendary:{level:4,funds:5000}} as const
export function ensureHousehold(s:GameState):GameState{
 if(s.household?.schema===1)return s.unlockedZones.length===6?s:{...s,unlockedZones:[0,1,2,3,4,5]}
 const seed=houseSeed(s),blueprint=starterBlueprint(seed,s.meters.housingTier,true)
 return {...s,unlockedZones:[0,1,2,3,4,5],household:{schema:1,seed,sourceTier:s.appearance.sourceTier??'Unverified',grant:'legacy-rank-v1',blueprint,humanTile:entryTile(blueprint),journey:null,pendingUse:null,pet:{hunger:90,energy:90,affection:70,bond:0,following:true,lastCare:0},relationships:{}}}
}
export function freshHousehold(s:GameState):GameState{
 if(s.household)return ensureHousehold(s)
 const tier=s.appearance.sourceTier as keyof typeof SOURCE_PACKAGES,pack=s.rarityVerified?SOURCE_PACKAGES[tier]:undefined
 if(!pack)return ensureHousehold(s)
 const seed=houseSeed(s),blueprint=starterBlueprint(seed,pack.level),meters={...s.meters,housingTier:pack.level},home={...estateDefault({...s,meters}),style:HOME_STYLES[(seed>>>16)%HOME_STYLES.length]},next=ensureHousehold({...s,meters,home,location:{...s.location,tile:frontDoor(home)}})
 const value=blueprint.objects.reduce((sum,o)=>sum+FURNITURE[o.type].price,0)
 return {...next,gChog:pack.funds-value,household:{...next.household!,sourceTier:tier,grant:'source-tier-v1',blueprint,humanTile:entryTile(blueprint)}}
}
export function indoorTile(h:Household,now:number):Tile{
 const j=h.journey;if(!j?.path.length)return h.humanTile
 const n=Math.max(0,Math.min(j.path.length,Math.floor((now-j.startedAt)/200)));return n?j.path[n-1]:j.from
}
