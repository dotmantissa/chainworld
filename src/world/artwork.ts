import type Phaser from 'phaser'
import manifest from './art-manifest.json'
import venues from './venue-manifest.json'
import realistic from './realism-manifest.json'
import {seedOf} from '../game/housing'
import type {GameState} from '../game/types'
import type {FurnitureType} from '../game/housing'
import type {CityNpc} from '../game/places'
export interface ArtAsset {key:string;url:string;width:number;height:number;flipX?:boolean}
type HumanState=Pick<GameState,'appearance'|'profile'|'collection'|'tokenId'>
const paletteAsset=(asset:ArtAsset,palette:number,suffix='palette'):ArtAsset=>palette?{...asset,key:`${asset.key}-${suffix}-${palette}`,url:asset.url.replace('.webp',`-${suffix}-${palette}.webp`)}:asset
export function humanArtwork(state:HumanState):ArtAsset[]{
 const family=state.profile.gender==='female'?'female':state.profile.gender==='male'?'male':'neutral'
 const a=state.appearance,seed=seedOf(`${state.collection}:${state.tokenId}:${a.sourceImage??''}:${a.headTrait}:${a.bodyTrait}:${a.eyeTrait}`)
 return manifest.humans[family].slice((seed%2)*6,(seed%2)*6+6).map(asset=>paletteAsset(asset,(seed>>>8)%4))
}
export function npcArtwork(npc:CityNpc):ArtAsset[]{const start=((npc.city+(npc.venue==='park'?1:0))%2)*6;return manifest.humans[npc.gender].slice(start,start+6).map(asset=>paletteAsset(asset,npc.city%4))}
export const humanPortraitArtwork:ArtAsset[]=Object.values(manifest.humans).flatMap(poses=>[poses[0],poses[6]].flatMap(asset=>[0,1,2,3].map(palette=>paletteAsset(asset,palette))))
export const furnitureArtwork=(type:FurnitureType,rotation=0):ArtAsset=>{const venue=venues[type as keyof typeof venues];if(venue)return {...venue,flipX:rotation===1};const asset=realistic[(type==='showerStall'?'shower':type) as keyof typeof realistic];return asset?{...asset,flipX:rotation===1}:manifest.furniture[type as keyof typeof manifest.furniture][rotation]}
export const buildingsArtwork:ArtAsset[]=manifest.buildings
export const cityArtwork=(city:number):ArtAsset[]=>[...buildingsArtwork.map(asset=>paletteAsset(asset,city,'city')),venues.libraryExterior]
export const materialArtwork:ArtAsset[]=manifest.materials
export const outdoorArtwork:ArtAsset[]=manifest.outdoor
export const architectureArtwork:ArtAsset[]=manifest.architecture
export function loadArtwork(scene:Phaser.Scene,assets:ArtAsset[]){for(const a of assets)if(!scene.textures.exists(a.key))scene.load.image(a.key,a.url)}
export function sizeHuman(image:Phaser.GameObjects.Image,poses:ArtAsset[],frame:number,height=97){const asset=poses[frame],scale=frame===5?height/asset.width:height/poses[0].height;image.setTexture(asset.key).setDisplaySize(asset.width*scale,asset.height*scale).setOrigin(.5,frame===5?.5:.985).setAngle(0).setFlipX(false)}
