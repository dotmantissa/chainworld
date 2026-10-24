import {lazy,Suspense,useEffect,useLayoutEffect,useRef,useState,useCallback} from 'react'
import {useSignMessage} from 'wagmi'
import {useChogNFT} from './hooks/useChogNFT'
import type {GameState,ChogTrait} from './game/types'
import {api,type ServerSnapshot} from './hooks/useGameController'
import LandingScreen from './components/LandingScreen'
const GameHUD=lazy(()=>import('./components/GameHUD'))
interface EnteredGame {key:string;state:GameState;revision:number;traits:ChogTrait[];owner:string}
async function prepareWorld(){await Promise.all([import('./components/GameHUD'),import('./world/RoomScene'),import('./world/StreetScene'),import('./world/skeleton/characterAssets').then(m=>m.prepareCharacterArt())])}
export default function App(){
 const nft=useChogNFT(),{signMessageAsync}=useSignMessage(),[game,setGame]=useState<EnteredGame|null>(null),[wanted,setWanted]=useState(false),[opening,setOpening]=useState(''),[error,setError]=useState('')
 const operation=useRef(0),busy=useRef(false),autoAttempt=useRef(''),identity=useRef(''),key=`${nft.address?.toLowerCase()}:${nft.tokenId}`;useLayoutEffect(()=>{identity.current=key},[key])
 useEffect(()=>()=>{operation.current++},[])
 const authenticate=useCallback(async()=>{
  if(busy.current||!nft.address||nft.tokenId===null||!nft.metadata||!nft.ownsChog||!nft.isCorrectChain)return
  busy.current=true;const id=++operation.current,entryKey=key,address=nft.address,tokenId=nft.tokenId,metadata=nft.metadata,valid=()=>id===operation.current&&identity.current===entryKey
  setError('');setOpening('Opening your Chog household…')
  try{
   let authenticated=false;try{const auth=await api<{address:string}>('/api/session');authenticated=auth.address.toLowerCase()===address.toLowerCase()}catch{/* A new wallet needs one login signature. */}
   if(!valid())return
   if(!authenticated){setOpening('Confirm the login message in your wallet…');const auth=await api<{message:string}>('/api/session',{method:'POST',body:JSON.stringify({action:'challenge',address})});if(!valid())return;const signature=await signMessageAsync({message:auth.message});if(!valid())return;await api('/api/session',{method:'POST',body:JSON.stringify({action:'verify',address,message:auth.message,signature})})}
   if(!valid())return;setOpening('Restoring your home and Chog…');const snapshot=await api<ServerSnapshot>(`/api/game?tokenId=${tokenId}`,{},60000)
   if(!valid())return;if(!snapshot.state||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0||snapshot.state.tokenId!==tokenId||snapshot.state.walletAddress.toLowerCase()!==address.toLowerCase())throw new Error('Your NFT household could not be verified. Please retry entry.');await prepareWorld();if(valid())setGame({key:entryKey,state:snapshot.state,revision:snapshot.revision,traits:metadata.attributes,owner:address.toLowerCase()})
  }catch(e){if(valid())setError(e instanceof Error?e.message:'Could not open your world. Try again.')}finally{if(id===operation.current){busy.current=false;setOpening('')}}
 },[key,nft.address,nft.tokenId,nft.metadata,nft.ownsChog,nft.isCorrectChain,signMessageAsync])
 // A deliberate wallet-entry click starts one flow; background metadata refreshes do not remount play.
 useEffect(()=>{if(wanted&&!game&&nft.ownsChog&&nft.metadata&&nft.isCorrectChain&&autoAttempt.current!==key){autoAttempt.current=key;let active=true;queueMicrotask(()=>{if(active)void authenticate()});return()=>{active=false}}},[wanted,game,key,nft.ownsChog,nft.metadata,nft.isCorrectChain,authenticate])
 useEffect(()=>{if(game&&(game.owner!==nft.address?.toLowerCase()||!nft.isCorrectChain||nft.ownershipLost||nft.tokenId!==null&&nft.tokenId!==game.state.tokenId)){let active=true;queueMicrotask(()=>{if(!active)return;operation.current++;busy.current=false;setGame(null);setOpening('');setWanted(false);setError(nft.ownershipLost?'This Chog has a new owner. Connect its current wallet to continue.':'Your wallet changed. Choose a Chog household to continue.')});return()=>{active=false}}},[game,nft.address,nft.isCorrectChain,nft.ownershipLost,nft.tokenId])
 const cancelEntry=()=>{operation.current++;busy.current=false;setOpening('');autoAttempt.current=key}
 if(opening)return <main className="world-entry" aria-busy="true"><a className="wordmark" href="/">chain<span>world</span><i>✦</i></a><div className="entry-orbit" aria-hidden="true">✦</div><h1>{opening}</h1><p>Your home, progress and Chog are coming with you.</p><button onClick={cancelEntry}>Back to welcome</button></main>
 if(game)return <Suspense fallback={<main className="world-entry" aria-busy="true"><h1>Opening your world…</h1></main>}><GameHUD key={game.key} gameState={game.state} revision={game.revision} traits={game.traits} onExit={reason=>{autoAttempt.current=key;setGame(null);setWanted(!!reason);setError(reason??'')}}/></Suspense>
 return <LandingScreen nft={nft} onAuthenticate={()=>void authenticate()} onWalletIntent={()=>{setWanted(true);setError('');autoAttempt.current='';if(nft.ownsChog&&nft.metadata&&nft.isCorrectChain){autoAttempt.current=key;void authenticate()}}} walletOpen={wanted} onCloseWallet={()=>setWanted(false)} authBusy={false} error={error}/>
}
