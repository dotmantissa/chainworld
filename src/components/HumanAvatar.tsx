import {useEffect,useState,useMemo} from 'react'
import {humanArtwork} from '../world/artwork'
import type {GameState} from '../game/types'
export default function HumanAvatar({state,size=110}:{state:Pick<GameState,'appearance'|'profile'|'collection'|'tokenId'>;size?:number}){
 const asset=humanArtwork(state)[0],[portrait,setPortrait]=useState<string|null>(null),identity=useMemo(()=>({appearance:state.appearance,profile:state.profile,collection:state.collection,tokenId:state.tokenId}),[state.appearance,state.profile,state.collection,state.tokenId])
 useEffect(()=>{let active=true;void import('../world/skeleton/portrait').then(module=>{if(!active)return;try{const data=module.skeletalPortrait(identity);if(active)setPortrait(data)}catch{/* Retain the accessible portrait on devices without WebGL. */}}).catch(()=>{/* Keep the existing portrait if its renderer cannot load. */});return()=>{active=false}},[identity])
 return <div className="human-avatar" role="img" aria-label={`${state.profile.name||'Your human character'} · ${state.profile.gender}`} style={{height:size,width:size*.7}}><img src={portrait??asset.url} alt="" style={{height:size,width:'auto',maxWidth:'100%',objectFit:'contain'}}/></div>
}
