import { useMemo, useState } from 'react'
import { metadataUrls } from '../game/metadata'
import type { FaucetManifest } from '../game/faucetManifest'
export default function CollectionGallery() {
  const [manifest,setManifest]=useState<FaucetManifest|null>(null),[opened,setOpened]=useState(false),[error,setError]=useState('')
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[value,setValue]=useState(''),[page,setPage]=useState(0)
  const categories=useMemo(()=>manifest?[...new Set(manifest.source.tokens.flatMap(t=>t.metadata.attributes.map(a=>a.trait_type)))].sort():[],[manifest])
  const values=useMemo(()=>manifest?[...new Set(manifest.source.tokens.flatMap(t=>t.metadata.attributes.filter(a=>a.trait_type===category).map(a=>a.value)))].sort():[],[manifest,category])
  const tokens=useMemo(()=>manifest?.source.tokens.filter(t=>(!query||`${t.tokenId} ${t.metadata.name}`.toLowerCase().includes(query.toLowerCase()))&&(!category||!value||t.metadata.attributes.some(a=>a.trait_type===category&&a.value===value)))??[],[manifest,query,category,value])
  const open=async()=>{
    setOpened(true);setError('')
    try {
      const response=await fetch('/faucet-manifest.json',{signal:AbortSignal.timeout(15000)})
      if(!response.ok)throw new Error('The original collection catalogue is still being synchronized. Try again shortly.')
      const data=await response.json() as FaucetManifest
      if(!data.verifiedOnChain||data.source?.tokens?.length!==1969)throw new Error('Verified source catalogue unavailable.')
      setManifest(data)
    }catch(e){setError(e instanceof Error?e.message:'Could not load collection')}
  }
  return <section className="collection-gallery"><div className="collection-heading"><div><p className="eyebrow">ONE COLLECTION. 1,969 INDIVIDUALS.</p><h2>Meet the original Chogs.</h2><p className="muted">Browse the original artwork and traits. Connect your wallet and claim a Test Chog to play.</p></div><button onClick={()=>void open()}>Explore the collection</button></div>
    {opened&&(error?<p role="alert">{error} <button onClick={()=>void open()}>Retry catalogue</button></p>:!manifest?<p role="status">Loading original NFT catalogue…</p>:<>
      <div className="collection-filters"><label>Find a Chog<input placeholder="Token ID or original name" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></label><label>Trait<select value={category} onChange={e=>{setCategory(e.target.value);setValue('');setPage(0)}}><option value="">All traits</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Value<select value={value} onChange={e=>{setValue(e.target.value);setPage(0)}}><option value="">All values</option>{values.map(v=><option key={v}>{v}</option>)}</select></label></div>
      <p className="muted">{tokens.length} residents · Monad mainnet block {manifest.source.snapshotBlock.toLocaleString()} · Game rarity uses collection-wide trait frequency.</p>
      <div className="collection-grid">{tokens.slice(page*8,page*8+8).map(token=>{
        const claim=manifest.claims.find(c=>c.originalId===token.tokenId)!
        return <article className="collection-card" key={token.tokenId}><img loading="lazy" src={metadataUrls(token.metadata.image)[0]} alt={token.metadata.name} onError={event=>{const img=event.currentTarget;const urls=metadataUrls(token.metadata.image);const next=Number(img.dataset.gateway??0)+1;if(next<urls.length){img.dataset.gateway=String(next);img.src=urls[next]}}}/><div><h3>{token.metadata.name}</h3><p className="muted">Token #{token.tokenId} · Game rank {claim.rank}</p><details><summary>Original traits</summary>{token.metadata.attributes.map(a=><p className="trait-row" key={a.trait_type}><span>{a.trait_type}</span><strong>{a.value}</strong></p>)}</details></div></article>
      })}</div>
      <div className="collection-pages"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous Chogs</button><span>Page {page+1} / {Math.max(1,Math.ceil(tokens.length/8))}</span><button disabled={(page+1)*8>=tokens.length} onClick={()=>setPage(p=>p+1)}>Next Chogs</button></div>
    </>)}
  </section>
}
