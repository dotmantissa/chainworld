import {lazy,Suspense,useEffect,useLayoutEffect,useRef,useState,useCallback} from 'react'
import {useSignMessage} from 'wagmi'
import {useChogNFT} from './hooks/useChogNFT'
import {createNewGameState} from './game/gameEngine'
import {loadGameState} from './game/persistence'
import type {GameState,ChogTrait} from './game/types'
import {CHOG_CONTRACT} from './contracts/addresses'
import {api,type ServerSnapshot} from './hooks/useGameController'
import LandingScreen from './components/LandingScreen'
import type {SourcePreview} from './components/CollectionGallery'
import {ensureHousehold,freshHousehold} from './game/household'
import {openPreview} from './game/entryState'
const SHARED=import.meta.env.VITE_SHARED_WORLD==='true'
const GameHUD=lazy(()=>import('./components/GameHUD'))
interface EnteredGame {key:string;state:GameState;revision?:number;preview:boolean;traits:ChogTrait[];owner?:string}
async function prepareWorld(){await Promise.all([import('./components/GameHUD'),import('./world/RoomScene'),import('./world/StreetScene'),import('./world/skeleton/characterAssets').then(m=>m.prepareCharacterArt())])}
export default function App(){
 const nft=useChogNFT(),{signMessageAsync}=useSignMessage(),[game,setGame]=useState<EnteredGame|null>(null),[wanted,setWanted]=useState(false),[opening,setOpening]=useState(''),[error,setError]=useState('')
 const operation=useRef(0),busy=useRef(false),autoAttempt=useRef(''),identity=useRef(''),key=`${nft.address?.toLowerCase()}:${nft.tokenId}`;useLayoutEffect(()=>{identity.current=key},[key])
 const [hasPreview,setHasPreview]=useState(()=>{try{return !!localStorage.getItem('chainworld_v2_0_preview_0')}catch{return false}})
 useEffect(()=>()=>{operation.current++},[])
 const enter=async(source?:SourcePreview)=>{
  if(busy.current)return;busy.current=true;const id=++operation.current;setError('');setOpening(source?'Opening this Chog’s household…':hasPreview?'Returning to your world…':'Preparing your first home…')
  try{const loaded=openPreview(source??null);await prepareWorld();if(id!==operation.current)return;setGame({key:`preview:${source?.token.tokenId??'neutral'}`,state:loaded.warning?{...loaded.state,lastMessage:loaded.warning}:loaded.state,traits:source?.token.metadata.attributes??[],preview:true});setHasPreview(true)}catch(e){if(id===operation.current)setError(e instanceof Error?e.message:'Your world could not open. Try again.')}finally{if(id===operation.current){busy.current=false;setOpening('')}}
 }
 const authenticate=useCallback(async()=>{
  if(busy.current||!nft.address||nft.tokenId===null||!nft.metadata||!nft.ownsChog||!nft.isCorrectChain)return
  busy.current=true;const id=++operation.current,entryKey=key,address=nft.address,tokenId=nft.tokenId,metadata=nft.metadata,valid=()=>id===operation.current&&identity.current===entryKey
  setError('');setOpening('Opening your Chog household…')
  try{
   let snapshot:ServerSnapshot
   if(SHARED){
    let authenticated=false;try{const auth=await api<{address:string}>('/api/session');authenticated=auth.address.toLowerCase()===address.toLowerCase()}catch{/* A new wallet needs one login signature. */}
    if(!valid())return
    if(!authenticated){setOpening('Confirm the login message in your wallet…');const auth=await api<{message:string}>('/api/session',{method:'POST',body:JSON.stringify({action:'challenge',address})});if(!valid())return;const signature=await signMessageAsync({message:auth.message});if(!valid())return;await api('/api/session',{method:'POST',body:JSON.stringify({action:'verify',address,message:auth.message,signature})})}
    if(!valid())return;setOpening('Restoring your home and Chog…');snapshot=await api<ServerSnapshot>(`/api/game?tokenId=${tokenId}`,{},60000)
   }else{const initial=createNewGameState(address,tokenId,metadata.attributes,0,{collection:CHOG_CONTRACT});initial.appearance={...initial.appearance,sourceImage:metadata.image,sourceName:metadata.name};const loaded=loadGameState(freshHousehold(initial));snapshot={state:ensureHousehold(loaded.state),revision:0}}
   if(!valid())return;await prepareWorld();if(valid())setGame({key:entryKey,state:snapshot.state,revision:SHARED?snapshot.revision:undefined,traits:metadata.attributes,preview:false,owner:address.toLowerCase()})
  }catch(e){if(valid())setError(e instanceof Error?e.message:'Could not open your world. Try again.')}finally{if(id===operation.current){busy.current=false;setOpening('')}}
 },[key,nft.address,nft.tokenId,nft.metadata,nft.ownsChog,nft.isCorrectChain,signMessageAsync])
 // A deliberate wallet-entry click starts one flow; background metadata refreshes do not remount play.
 useEffect(()=>{if(wanted&&!game&&nft.ownsChog&&nft.metadata&&nft.isCorrectChain&&autoAttempt.current!==key){autoAttempt.current=key;let active=true;queueMicrotask(()=>{if(active)void authenticate()});return()=>{active=false}}},[wanted,game,key,nft.ownsChog,nft.metadata,nft.isCorrectChain,authenticate])
 useEffect(()=>{if(game&&!game.preview&&(game.owner!==nft.address?.toLowerCase()||!nft.isCorrectChain||nft.ownershipLost||nft.tokenId!==null&&nft.tokenId!==game.state.tokenId)){let active=true;queueMicrotask(()=>{if(!active)return;operation.current++;busy.current=false;setGame(null);setOpening('');setWanted(false);setError(nft.ownershipLost?'This Chog has a new owner. Connect its current wallet to continue.':'Your wallet changed. Choose a Chog household to continue.')});return()=>{active=false}}},[game,nft.address,nft.isCorrectChain,nft.ownershipLost,nft.tokenId])
 const cancelEntry=()=>{operation.current++;busy.current=false;setOpening('');autoAttempt.current=key}
 if(opening)return <main className="world-entry" aria-busy="true"><a className="wordmark" href="/">chain<span>world</span><i>✦</i></a><div className="entry-orbit" aria-hidden="true">✦</div><h1>{opening}</h1><p>Your home, progress and Chog are coming with you.</p><button onClick={cancelEntry}>Back to welcome</button></main>
 if(game)return <Suspense fallback={<main className="world-entry" aria-busy="true"><h1>Opening your world…</h1></main>}><GameHUD key={game.key} gameState={game.state} revision={game.revision} traits={game.traits} preview={game.preview} onExit={()=>{setGame(null);setWanted(false);setError('')}}/></Suspense>
 return <LandingScreen nft={nft} onPreview={source=>void enter(source)} onAuthenticate={()=>void authenticate()} onWalletIntent={()=>{setWanted(true);setError('');autoAttempt.current=''}} walletOpen={wanted} hasPreview={hasPreview} onCloseWallet={()=>setWanted(false)} shared={SHARED} authBusy={false} error={error}/>
}
