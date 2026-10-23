import type { GameState } from '../game/types'
export interface ResidentArtwork {path:string;columns:number;rows:number;frames:number;sleepImage?:string;sleepFrame?:number;seatedFrame?:number}
const reference:ResidentArtwork={path:'/art/chog-resident-v2.webp',columns:2,rows:2,frames:4,sleepImage:'/art/chog-sleep-v2.webp'}
const originalOne:ResidentArtwork={path:'/art/chog/source-1-resident-v1.webp',columns:3,rows:2,frames:6,sleepFrame:4,seatedFrame:5}
export function residentArtwork(state:Pick<GameState,'appearance'|'chainId'>):ResidentArtwork|null {
 const a=state.appearance
 if(state.chainId===0&&!a.sourceImage)return reference
 // Match the authentic image AND its recorded visible traits, independent of spinoff token numbering.
 if(a.sourceImage==='ipfs://bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/1462.webp'&&a.skinTrait==='Pink'&&a.bodyTrait==='Yellow 143 Jersey'&&a.headTrait==='MCGA'&&a.eyeTrait==='BTC Glass')return originalOne
 return null
}
