import {useCallback,useEffect,useRef,useState} from 'react'
import {useAccount,usePublicClient,useReadContract,useWaitForTransactionReceipt,useWriteContract} from 'wagmi'
import type {Hex} from 'viem'
import {FAUCET_ADDRESS,CHOG_CONTRACT,MONAD_TESTNET_ID} from '../contracts/addresses'
import {FAUCET_ABI as abi} from '../contracts/chainWorldRegistryAbi'
import {claimedToken,faucetEntry,loadFaucetManifest} from '../game/faucet'
import type {FaucetManifest} from '../game/faucetManifest'
import {metadataUrls} from '../game/metadata'
function readPending(key:string):Hex|undefined{try{const value=localStorage.getItem(key);return value&&/^0x[0-9a-f]{64}$/i.test(value)?value as Hex:undefined}catch{return undefined}}
function storePending(key:string,value?:Hex){try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key)}catch{/* Receipt tracking still works in memory. */}}
export default function FaucetPanel({onClaimed}:{onClaimed(tokenId:number):void}) {
 const {address,chainId}=useAccount(),client=usePublicClient({chainId:MONAD_TESTNET_ID})
 const enabled=!!FAUCET_ADDRESS&&!!address&&chainId===MONAD_TESTNET_ID
 const storageKey=`cw_claim_${FAUCET_ADDRESS}_${address?.toLowerCase()}`
 const [manifest,setManifest]=useState<FaucetManifest|null>(null),[manifestError,setManifestError]=useState(''),[attempt,setAttempt]=useState(0)
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[preparing,setPreparing]=useState(false)
 const [pendingHash,setPendingHash]=useState<Hex|undefined>(()=>readPending(storageKey))
 const handled=useRef<Hex>(),alive=useRef(true),notify=useRef(onClaimed)
 useEffect(()=>{notify.current=onClaimed},[onClaimed])
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 useEffect(()=>{
  if(!FAUCET_ADDRESS)return
  let active=true
  void loadFaucetManifest(attempt>0).then(data=>{if(active){setManifest(data);setManifestError('')}}).catch(e=>{if(active)setManifestError(e instanceof Error?e.message:'Could not load the NFT catalogue')})
  return()=>{active=false}
 },[attempt])
 const claimed=useReadContract({address:FAUCET_ADDRESS!,abi,functionName:'hasClaimed',args:address?[address]:undefined,chainId:MONAD_TESTNET_ID,query:{enabled}})
 const supply=useReadContract({address:FAUCET_ADDRESS!,abi,functionName:'totalSupply',chainId:MONAD_TESTNET_ID,query:{enabled,refetchInterval:10000}})
 const cap=useReadContract({address:FAUCET_ADDRESS!,abi,functionName:'maxSupply',chainId:MONAD_TESTNET_ID,query:{enabled}})
 const root=useReadContract({address:FAUCET_ADDRESS!,abi,functionName:'manifestRoot',chainId:MONAD_TESTNET_ID,query:{enabled}})
 const {refetch:refetchClaimed}=claimed,{refetch:refetchSupply}=supply,{refetch:refetchRoot}=root,{refetch:refetchCap}=cap
 const refresh=useCallback(()=>{void refetchClaimed();void refetchSupply();void refetchRoot();void refetchCap()},[refetchClaimed,refetchSupply,refetchRoot,refetchCap])
 const write=useWriteContract()
 const receipt=useWaitForTransactionReceipt({hash:pendingHash,chainId:MONAD_TESTNET_ID,onReplaced:({transaction})=>{
  setPendingHash(transaction.hash);storePending(storageKey,transaction.hash)
 }})
 useEffect(()=>{
  const result=receipt.data
  if(!result||!address||!FAUCET_ADDRESS||handled.current===result.transactionHash)return
  handled.current=result.transactionHash
  queueMicrotask(()=>{
   if(!alive.current)return
   storePending(storageKey);setPendingHash(undefined);refresh()
   if(result.status!=='success'){setError('The claim was not completed. Another player may have taken this assignment. The faucet has refreshed; try again.');return}
   const tokenId=claimedToken(result.logs,FAUCET_ADDRESS!,address)
   if(tokenId===null){setError('The transaction confirmed without a Chog claim. Refresh your wallet and try again.');return}
   setMessage(`Chog #${tokenId} is yours. Your resident is selected below.`);setError('');notify.current(tokenId)
  })
 },[receipt.data,address,storageKey,refresh])
 const claim=async()=>{
  if(!FAUCET_ADDRESS||!address||!client||!manifest||!enabled)return
  setPreparing(true);setError('');setMessage('')
  try{
   // Observe current assignment immediately before simulation, rather than a ten-second-old UI count.
   const [already,count,actualRoot,actualCap]=await Promise.all([
    client.readContract({address:FAUCET_ADDRESS,abi,functionName:'hasClaimed',args:[address]}),
    client.readContract({address:FAUCET_ADDRESS,abi,functionName:'totalSupply'}),
    client.readContract({address:FAUCET_ADDRESS,abi,functionName:'manifestRoot'}),
    client.readContract({address:FAUCET_ADDRESS,abi,functionName:'maxSupply'}),
   ])
   if(already)throw new Error('This wallet has already claimed a Test Chog. Select your owned resident below.')
   if(count>=actualCap)throw new Error('All Test Chogs have been claimed.')
   if(actualRoot!==manifest.root||actualCap!==BigInt(manifest.claims.length)||FAUCET_ADDRESS.toLowerCase()!==CHOG_CONTRACT.toLowerCase())throw new Error('The faucet and game collection do not match the verified source manifest.')
   const {claim}=faucetEntry(manifest,Number(count))
   await client.simulateContract({account:address,address:FAUCET_ADDRESS,abi,functionName:'claim',args:[BigInt(claim.originalId),claim.uri,claim.proof]})
   if(!alive.current)return
   const hash=await write.writeContractAsync({address:FAUCET_ADDRESS,abi,functionName:'claim',args:[BigInt(claim.originalId),claim.uri,claim.proof],chainId:MONAD_TESTNET_ID})
   storePending(storageKey,hash);if(alive.current)setPendingHash(hash)
  }catch(e){if(alive.current){setError(e instanceof Error?e.message.split('\n')[0]:'The claim could not be submitted. Please try again.');refresh()}}
  finally{if(alive.current)setPreparing(false)}
 }
 if(!FAUCET_ADDRESS)return <section className="faucet-card"><h3>Test Chog faucet</h3><p className="muted">The verified source collection is ready. Faucet deployment is being configured.</p></section>
 const soldOut=supply.data!==undefined&&cap.data!==undefined&&supply.data>=cap.data
 const index=supply.data!==undefined?Number(supply.data):undefined
 let entry:ReturnType<typeof faucetEntry>|null=null,assignmentError=''
 try{if(manifest&&index!==undefined&&!soldOut)entry=faucetEntry(manifest,index)}catch{assignmentError='This faucet assignment does not match the verified Chog collection.'}
 if(manifest&&root.data!==undefined&&cap.data!==undefined&&(root.data!==manifest.root||cap.data!==BigInt(manifest.claims.length)||FAUCET_ADDRESS.toLowerCase()!==CHOG_CONTRACT.toLowerCase()))assignmentError='The configured faucet does not match the verified game collection.'
 const valid=!!entry&&root.data===manifest?.root&&cap.data===BigInt(manifest?.claims.length??0)&&FAUCET_ADDRESS.toLowerCase()===CHOG_CONTRACT.toLowerCase()
 const busy=preparing||write.isPending||!!pendingHash
 return <section className="faucet-card space-y-3" aria-label="Test Chog faucet"><p className="eyebrow">YOUR FIRST CHOG. YOUR NEXT CHAPTER.</p><h3>Claim a Chog & move in</h3><p className="muted">Free unofficial Monad Testnet NFT, one claim per wallet. You only pay network gas with test MON.</p>
  {entry&&<div className="faucet-resident"><img src={metadataUrls(entry.source.metadata.image)[0]} alt={entry.source.metadata.name}/><div><strong>{entry.source.metadata.name}</strong><p className="muted">Game rarity rank {entry.claim.rank} · Original traits preserved</p></div></div>}
  <p>{supply.data?.toString()??'…'} / {cap.data?.toString()??'…'} claimed</p>
  <button className="primary" disabled={!enabled||!valid||soldOut||claimed.data!==false||busy} onClick={()=>void claim()}>{write.isPending?'Confirm in wallet…':pendingHash?'Waiting for your Chog…':preparing?'Preparing your claim…':soldOut?'Faucet sold out':claimed.data?'Chog already claimed':'Claim free Test Chog'}</button>
  <p className="preview-note">After claiming, your NFT is selected automatically. Sign the game login message to enter your shared world.</p>
  {!valid&&!soldOut&&!manifestError&&!assignmentError&&<p className="muted">Loading the verified faucet assignment…</p>}
  {message&&<p role="status">{message}</p>}
  {(error||manifestError||assignmentError||receipt.error||claimed.error||supply.error||root.error||cap.error)&&<div role="alert"><p>{error||manifestError||assignmentError||'Could not read the faucet. Check your connection and try again.'}</p><button onClick={()=>{setAttempt(a=>a+1);refresh();if(pendingHash)void receipt.refetch()}}>Refresh faucet</button></div>}
  <a className="text-link" href="https://faucet.monad.xyz" target="_blank" rel="noreferrer">Need test MON for gas? ↗</a>
 </section>
}
