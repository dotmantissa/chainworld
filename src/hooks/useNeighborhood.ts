import { useEffect,useState } from 'react'
import { identityOf,type NeighborhoodSnapshot } from '../game/neighborhood'
import type { GameState } from '../game/types'
import { api } from './useGameController'
export function useNeighborhood(state:GameState,shared:boolean) {
  const [snapshot,setSnapshot]=useState<NeighborhoodSnapshot>({neighbors:[],parcels:[],offers:[],messages:[]}),[error,setError]=useState('')
  const home=state.home,key=identityOf(state)
  const context=`${state.currentZone}:${state.location.district??0}:${state.location.kind}:${state.location.host??''}:${state.location.venue??''}:${home.open}:${home.plots.length}:${state.profile.name}`
  useEffect(()=>{
    if(!shared)return
    let alive=true
    const refresh=async()=>{
      try{const data=await api<NeighborhoodSnapshot>(`/api/neighborhood?tokenId=${state.tokenId}`);if(alive){setSnapshot(data);setError('')}}catch(e){if(alive)setError(e instanceof Error?e.message:'The neighborhood is unavailable')}
    }
    void refresh();const timer=setInterval(()=>void refresh(),10000)
    return()=>{alive=false;clearInterval(timer)}
  },[shared,key,state.tokenId,context])
  const local:NeighborhoodSnapshot={neighbors:home.city===state.currentZone?[{identity:key,tokenId:state.tokenId,name:state.profile?.name||'Your Chog',appearance:state.appearance,profile:state.profile,home,housingTier:state.meters.housingTier,location:state.location,online:true}]:[],parcels:home.city===state.currentZone?home.plots.map(p=>({...p,identity:key})):[],offers:[],messages:[]}
  return {snapshot:shared?snapshot:local,error}
}
