import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import type { useChogNFT } from '../hooks/useChogNFT'
import { MONAD_TESTNET_ID } from '../contracts/addresses'
import FaucetPanel from './FaucetPanel'
import CollectionGallery, { type SourcePreview } from './CollectionGallery'
import {useState} from 'react'
import {DEFAULT_PROFILE,type ResidentProfile} from '../game/residentProfile'
interface Props { nft:ReturnType<typeof useChogNFT>; onPreview(resident?:SourcePreview):void; onAuthenticate(profile?:ResidentProfile):void; shared:boolean; authBusy:boolean; error:string }
export default function LandingScreen({nft,onPreview,onAuthenticate,shared,authBusy,error}:Props) {
  const {isConnected,chainId}=useAccount()
  const network=useSwitchChain()
  const [profile,setProfile]=useState<ResidentProfile>({...DEFAULT_PROFILE})
  return <main className="landing-shell">
    <nav className="landing-nav"><a className="wordmark" href="/">chain<span>world</span><i>✦</i></a><ConnectKitButton/></nav>
    <div className="landing-grid"><section className="landing-copy"><p className="eyebrow">SMALL CHOG. BIG ON-CHAIN LIFE.</p><h1>Your little corner<br/>of the <em>chain.</em></h1><p>Find a home, make a living, and look after your Chog. A cozy life simulator where your NFT is the resident and the world moves with real blockchain gas.</p><div className="flex gap-3 flex-wrap mt-6"><button className="primary" onClick={()=>onPreview()}>Explore a local preview ↗</button><a href="#enter" className="text-link">Bring your Chog ↓</a></div><div className="landing-stats"><span>01 <small>Your NFT identity</small></span><span>05 <small>Blockchain cities</small></span><span>∞ <small>Little possibilities</small></span></div></section>
    <section id="enter" className="onboarding-card space-y-5"><p className="eyebrow">YOUR NEXT CHAPTER</p><h2>Move into Chain World</h2><p className="muted">Connect on Monad Testnet, select your resident, and step inside.</p>
      {!isConnected?<ConnectKitButton label="Connect wallet"/>:chainId!==MONAD_TESTNET_ID?<div className="space-y-2"><button className="primary" disabled={network.isPending} onClick={()=>network.switchChain({chainId:MONAD_TESTNET_ID})}>Switch to Monad Testnet</button>{network.error&&<p role="alert">{network.error.message.split('\n')[0]}</p>}</div>:<>
        <FaucetPanel key={nft.address} onClaimed={tokenId=>{nft.setSelected(String(tokenId));nft.retry()}}/>
        <label className="token-label">Resident token ID <small>(leave blank to use your first NFT)</small><input inputMode="numeric" value={nft.selected} onChange={e=>nft.setSelected(e.target.value)} placeholder="e.g. 0" aria-label="Resident token ID"/></label>
        {nft.needsTokenId&&<p className="muted">This collection does not support token enumeration. Enter an owned token ID.</p>}
        {nft.isLoading?<p role="status">Loading ownership and original NFT traits…</p>:nft.ownsChog&&nft.metadata?<><p>Chog #{nft.tokenId} is ready.</p><div className="signup-character"><label>Your character’s name<input maxLength={40} value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label><label>Character sex / presentation<select value={profile.gender} onChange={e=>setProfile({...profile,gender:e.target.value as ResidentProfile['gender']})}><option value="unspecified">Androgynous / choose later</option><option value="female">Female</option><option value="male">Male</option><option value="nonbinary">Nonbinary</option></select></label><p className="muted">Your NFT shapes your human character’s features. Your Chog joins you as your pet.</p></div>{shared&&<button className="primary" disabled={authBusy} onClick={()=>onAuthenticate(profile)}>{authBusy?'Opening your world…':'Verify wallet & enter'}</button>}</>:!nft.error&&<p className="muted">No owned Chog selected. Claim above when the faucet is available, or enter an existing token ID.</p>}
      </>}
      {(nft.error||error)&&<div className="notice" role="alert"><p>{error||nft.error}</p><button onClick={nft.retry}>Retry NFT loading</button></div>}
      <p className="preview-note">Testnet game. gCHOG is in-game currency. {shared?'Progress follows your NFT in the shared world.':'NFT progress stays in this browser until the shared service is configured.'}</p>
    </section></div>
    <section className="landing-features">{[['⌂','A home that grows with you','Care, work, and spend your earnings on a better little life.'],['✦','An identity of your own','Your original NFT traits shape your resident and career.'],['↗','A world with a pulse','Live gas moves living costs. Find the neighborhood that suits you.']].map(([icon,title,text])=><article key={title}><span>{icon}</span><h3>{title}</h3><p>{text}</p></article>)}</section>
    <CollectionGallery onPreview={onPreview}/>
    <footer>CHAIN WORLD <span>A life worth logging into. · Monad Testnet</span></footer>
  </main>
}
