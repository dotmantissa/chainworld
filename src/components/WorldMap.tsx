import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { CHAIN_WORLD_REGISTRY_ABI as abi } from '../contracts/chainWorldRegistryAbi'
import { REGISTRY_ADDRESS } from '../contracts/addresses'
import type { GameState } from '../game/types'
import { ZONES } from '../game/zones'
import { HOUSING_LABELS } from '../game/gameEngine'
function Profile({tokenId,onClose}:{tokenId:bigint;onClose():void}) {
  const profile=useReadContract({address:REGISTRY_ADDRESS,abi,functionName:'getPlayer',args:[tokenId],chainId:10143})
  const p=profile.data
  return <section className="panel space-y-2" aria-label="Neighbor profile"><button onClick={onClose}>Close profile</button><h3>Chog #{tokenId.toString()}</h3>
    {profile.isLoading?<p>Loading profile…</p>:profile.error?<p>Profile unavailable. <button onClick={()=>void profile.refetch()}>Retry</button></p>:p?<>
      <p>{ZONES[p[2]]?.name} · Lot #{p[1].toString()}</p>
      {p[4]===0n?<p className="muted">This resident has not published a profile snapshot.</p>:<><p>{HOUSING_LABELS[p[3][5]]} · Reputation {p[3][4]}/500</p><p>Hunger {p[3][1]} · Energy {p[3][2]} · Social {p[3][3]}</p><p className="muted">Owner-reported snapshot · {new Date(Number(p[4])*1000).toLocaleString()}</p></>}
    </>:null}
  </section>
}
export default function WorldMap({gameState:s}:{gameState:GameState}) {
  const [page,setPage]=useState(0),[selected,setSelected]=useState<bigint|null>(null)
  const count=useReadContract({address:REGISTRY_ADDRESS,abi,functionName:'totalRegistered',chainId:10143,query:{enabled:!!REGISTRY_ADDRESS,refetchInterval:15000}})
  const lots=useReadContract({address:REGISTRY_ADDRESS,abi,functionName:'getLots',args:[BigInt(page*36),36n],chainId:10143,query:{enabled:!!REGISTRY_ADDRESS,refetchInterval:15000}})
  if(!REGISTRY_ADDRESS)return <section className="panel"><h2>Meet the neighborhood</h2><p className="muted">The token-bound world directory is awaiting deployment.</p></section>
  return <div className="space-y-3"><section className="panel space-y-3"><div className="flex justify-between"><h2>The neighborhood</h2><span>Page {page+1}</span></div>
    <p className="muted">Select a resident to read their published profile.</p>
    {lots.error?<p role="alert">Could not load the map. <button onClick={()=>void lots.refetch()}>Retry</button></p>:lots.isLoading?<p>Loading neighborhood…</p>:<div className="grid grid-cols-6 gap-2">{Array.from({length:36},(_,i)=>{
      const owner=lots.data?.[0][i],token=lots.data?.[1][i],empty=!owner||/^0x0{40}$/.test(owner)
      const own=token!==undefined&&Number(token)===s.tokenId&&!empty
      return <button key={i} className={`lot-cell ${own?'own':''}`} disabled={empty} aria-label={empty?`Empty lot ${page*36+i}`:`Visit Chog ${token}`} title={owner} onClick={()=>setSelected(token!)}>{empty?'·':own?'⌂':`#${token}`}</button>
    })}</div>}
    <div className="flex justify-between"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><button disabled={!count.data||BigInt((page+1)*36)>=count.data} onClick={()=>setPage(p=>p+1)}>Next</button></div>
  </section>{selected!==null&&<Profile tokenId={selected} onClose={()=>setSelected(null)}/>}</div>
}
