import {FURNITURE,type Furniture} from '../game/housing'
import {furnitureArtwork,outdoorArtwork} from './artwork'
import type {Blueprint,Partition} from '../game/housing'
export const houseProjection=(x:number,y:number)=>({x:400+(x-y)*25,y:115+(x+y)*13})
export function furnitureView(o:Furniture,environment?:Blueprint['environment']){
 const d=FURNITURE[o.type],w=o.rotation?d.h:d.w,h=o.rotation?d.w:d.h,point=houseProjection(o.x+(w-1)/2,o.y+(h-1)/2),outdoor=environment==='park'
 const asset=outdoor&&o.type==='sofa'?outdoorArtwork[o.rotation]:outdoor&&o.type==='plant'?outdoorArtwork[(o.x+o.y)%3===0?4+o.rotation:2+o.rotation]:furnitureArtwork(o.type,o.rotation)
 const widths={cafeCounter:155,cafeTable:120,bookStack:118,readingTable:132,meetingTable:150,showerStall:78,bed:144,kitchen:110,desk:116,sofa:110,basin:52,shower:120,bowl:28,plant:44,lamp:24,shelf:75},width=outdoor&&o.type==='plant'?asset===outdoorArtwork[2]||asset===outdoorArtwork[3]?76:46:outdoor&&o.type==='sofa'?91:widths[o.type]
 return {...point,w,h,asset,width,height:o.type==='showerStall'?116:width*asset.height/asset.width,baseY:(w+h)*6.5+2,flipX:asset.flipX??(o.type==='bed'&&o.rotation===1),depth:houseProjection(o.x+w-1,o.y+h-1).y+2}
}
/** Partition art uses the same cell boundary as wallBlocks, including door openings. */
export function partitionSegment(w:Partition){
 return w.axis==='x'?[houseProjection(w.x+.5,w.y-.5),houseProjection(w.x+.5,w.y+.5)]:[houseProjection(w.x-.5,w.y+.5),houseProjection(w.x+.5,w.y+.5)]
}
