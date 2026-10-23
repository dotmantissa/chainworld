import { useEffect, useMemo, useState } from 'react'
import { useSignMessage } from 'wagmi'
import { useChogNFT } from './hooks/useChogNFT'
import { createNewGameState } from './game/gameEngine'
import { loadGameState } from './game/persistence'
import type { GameState } from './game/types'
import { CHOG_CONTRACT } from './contracts/addresses'
import { api, type ServerSnapshot } from './hooks/useGameController'
import LandingScreen from './components/LandingScreen'
import GameHUD from './components/GameHUD'
import type { SourcePreview } from './components/CollectionGallery'
const SHARED=import.meta.env.VITE_SHARED_WORLD==='true'
export default function App() {
  const nft=useChogNFT()
  const signer=useSignMessage()
  const [preview,setPreview]=useState(false)
  const [sourcePreview,setSourcePreview]=useState<SourcePreview|null>(null)
  const [session,setSession]=useState<{key:string;snapshot:ServerSnapshot}|null>(null)
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const key=`${nft.address?.toLowerCase()}:${nft.tokenId}`
  const local=useMemo(()=>{
    if(SHARED||!nft.metadata||!nft.address||nft.tokenId===null||!nft.ownsChog)return null
    const identity=createNewGameState(nft.address,nft.tokenId,nft.metadata.attributes,0,{collection:CHOG_CONTRACT})
    identity.appearance={...identity.appearance,sourceImage:nft.metadata.image,sourceName:nft.metadata.name}
    return loadGameState(identity)
  },[nft.metadata,nft.address,nft.tokenId,nft.ownsChog])
  const demo=useMemo(()=>{
    const initial=sourcePreview?createNewGameState('preview',sourcePreview.token.tokenId,sourcePreview.token.metadata.attributes,0,{chainId:0,collection:'source-preview',rank:sourcePreview.rank}):createNewGameState('preview',0,[],0,{chainId:0,collection:'preview'})
    if(sourcePreview)initial.appearance={...initial.appearance,sourceImage:sourcePreview.token.metadata.image,sourceName:sourcePreview.token.metadata.name}
    return loadGameState({...initial,lastMessage:sourcePreview?'Original NFT preview. This does not claim or own the NFT.':'Welcome to the local preview. Tap furniture or use the controls to begin.'}).state
  },[sourcePreview])
  useEffect(()=>{
    if(!SHARED||!nft.ownsChog||nft.tokenId===null||!nft.metadata)return
    let alive=true
    void api<{address:string}>('/api/session').then(auth=>{
      if(auth.address.toLowerCase()!==nft.address?.toLowerCase())return
      return api<ServerSnapshot>(`/api/game?tokenId=${nft.tokenId}`,{},60000).then(snapshot=>{if(alive)setSession({key,snapshot})})
    }).catch(()=>{})
    return()=>{alive=false}
  },[key,nft.ownsChog,nft.metadata,nft.tokenId,nft.address])
  const authenticate=async()=>{
    if(!nft.address||nft.tokenId===null)return
    setBusy(true);setError('')
    try{
      const auth=await api<{message:string}>('/api/session',{method:'POST',body:JSON.stringify({action:'challenge',address:nft.address})})
      const signature=await signer.signMessageAsync({message:auth.message})
      await api('/api/session',{method:'POST',body:JSON.stringify({action:'verify',address:nft.address,message:auth.message,signature})})
      const snapshot=await api<ServerSnapshot>(`/api/game?tokenId=${nft.tokenId}`,{},60000)
      setSession({key,snapshot})
    }catch(e){setError(e instanceof Error?e.message:'Could not open your world')}finally{setBusy(false)}
  }
  let state:GameState|null=null,revision:number|undefined
  if(preview)state=demo
  else if(nft.isCorrectChain&&nft.ownsChog&&nft.metadata){
    if(SHARED&&session?.key===key){state=session.snapshot.state;revision=session.snapshot.revision}
    else if(!SHARED&&local)state=local.warning?{...local.state,lastMessage:local.warning}:local.state
  }
  return state?<GameHUD key={preview?`preview:${sourcePreview?.token.tokenId??'neutral'}`:key} gameState={state} revision={revision} traits={preview?sourcePreview?.token.metadata.attributes??[]:nft.metadata?.attributes??[]} preview={preview} onExit={()=>setPreview(false)}/>:<LandingScreen nft={nft} onPreview={resident=>{setSourcePreview(resident??null);setPreview(true)}} onAuthenticate={()=>void authenticate()} shared={SHARED} authBusy={busy} error={error}/>
}
