import { useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CHAIN_WORLD_REGISTRY_ABI as abi } from '../contracts/chainWorldRegistryAbi'
import { CHOG_CONTRACT, REGISTRY_ADDRESS } from '../contracts/addresses'
import type { GameState } from '../game/types'
import type { Command } from '../game/gameEngine'
export default function RegistryPanel({state:s,dispatch,shared}:{state:GameState;dispatch(c:Command):void;shared:boolean}) {
  const collection=useReadContract({address:REGISTRY_ADDRESS!,abi,functionName:'chogContract',chainId:10143,query:{enabled:!!REGISTRY_ADDRESS}})
  const matches=collection.data?.toLowerCase()===CHOG_CONTRACT.toLowerCase()
  const player=useReadContract({address:REGISTRY_ADDRESS!,abi,functionName:'getPlayer',args:[BigInt(s.tokenId)],chainId:10143,query:{enabled:!!REGISTRY_ADDRESS&&matches,refetchInterval:15000}})
  const write=useWriteContract()
  const receipt=useWaitForTransactionReceipt({hash:write.data,chainId:10143})
  const {refetch:refetchPlayer}=player
  useEffect(()=>{if(receipt.isSuccess)void refetchPlayer()},[receipt.isSuccess,refetchPlayer])
  const registered=player.data?.[0]??false,lot=registered?Number(player.data![1]):null
  useEffect(()=>{if(!shared&&player.data&&(s.registeredLot!==lot||s.registeredOnChain!==registered))dispatch({type:'registration',lot})},[lot,registered,player.data,shared,s.registeredLot,s.registeredOnChain,dispatch])
  if(!REGISTRY_ADDRESS)return <section className="panel"><h3>World directory</h3><p className="muted">The upgraded registry is awaiting deployment. Your home and progression are available now.</p></section>
  const busy=write.isPending||receipt.isLoading
  const txError=write.error??receipt.error
  return <section className="panel space-y-2"><h3>{registered?`Your lot · #${lot}`:'Claim your world lot'}</h3>
    {!matches?<p role="alert">{collection.isLoading?'Checking registry collection…':'Registry collection does not match this game.'}</p>:player.isLoading?<p>Checking your lot…</p>:player.error?<p role="alert">Could not load your registration. <button onClick={()=>void player.refetch()}>Retry</button></p>:<>
      <p className="muted">The lot belongs to your NFT and follows its current owner. Published snapshots are owner-reported.</p>
      <div className="flex flex-wrap gap-2">{!registered?<button className="primary" disabled={busy} onClick={()=>write.writeContract({address:REGISTRY_ADDRESS!,abi,functionName:'register',args:[BigInt(s.tokenId)],chainId:10143})}>Register NFT</button>:<>
        <button disabled={busy} onClick={()=>write.writeContract({address:REGISTRY_ADDRESS!,abi,functionName:'setZone',args:[BigInt(s.tokenId),s.currentZone],chainId:10143})}>Publish district</button>
        <button disabled={busy} onClick={()=>write.writeContract({address:REGISTRY_ADDRESS!,abi,functionName:'saveMeterSnapshot',args:[BigInt(s.tokenId),[Math.min(100,Math.round(s.gChog/32)),Math.round(s.meters.hunger),Math.round(s.meters.energy),Math.round(s.meters.social),Math.round(s.meters.reputation),s.meters.housingTier]],chainId:10143})}>Publish profile</button>
      </>}</div>
    </>}
    {busy&&<p role="status">{write.isPending?'Confirm in your wallet…':'Waiting for confirmation…'}</p>}
    {receipt.data?.status==='reverted'&&<p role="alert">The transaction reverted. Refresh your registration before retrying.</p>}
    {txError&&<p role="alert">{txError.message.split('\n')[0]}</p>}
  </section>
}
