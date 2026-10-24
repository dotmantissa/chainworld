import {useEffect} from 'react'
import {ConnectKitButton} from 'connectkit'
import {useSwitchChain} from 'wagmi'
import type {useChogNFT} from '../hooks/useChogNFT'
import {MONAD_TESTNET_ID} from '../contracts/addresses'
import FaucetPanel from './FaucetPanel'
import CollectionGallery,{type SourcePreview} from './CollectionGallery'
interface Props {nft:ReturnType<typeof useChogNFT>;onPreview(resident?:SourcePreview):void;onAuthenticate():void;onWalletIntent():void;onCloseWallet():void;walletOpen:boolean;hasPreview:boolean;shared:boolean;authBusy:boolean;error:string}
export default function LandingScreen({nft,onPreview,onAuthenticate,onWalletIntent,onCloseWallet,walletOpen,hasPreview,shared,authBusy,error}:Props){
 const network=useSwitchChain(),connected=!!nft.address
 useEffect(()=>{if(walletOpen)document.getElementById('enter')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})},[walletOpen])
 return <main className="landing-shell welcome-page">
  <nav className="landing-nav"><a className="wordmark" href="/">chain<span>world</span><i>✦</i></a><span className="welcome-tagline">PLAY · BUILD · BELONG</span></nav>
  <div className="landing-grid"><section className="landing-copy"><p className="eyebrow">A LITTLE LIFE. A CHOG BY YOUR SIDE.</p><h1>Make yourself<br/><em>at home.</em></h1><p>Care for your Chog, make goods together and earn your place in a living neighborhood. Build a home and a business around the NFT that makes your household yours.</p><div className="welcome-actions"><button className="primary" onClick={()=>onPreview()}>{hasPreview?'Continue playing':'Play now'} ↗</button><button className="welcome-wallet" onClick={onWalletIntent}>Continue with my Chog</button></div><p className="landing-play-note">Play instantly. No wallet, character setup or settings required.</p>{error&&!walletOpen&&<p className="notice" role="alert">{error}</p>}</section>
   <section className="welcome-home" aria-label="A life with your Chog"><img src="/art/entry/home-v1.webp" alt="A resident and their Chog in a furnished home" width="900" height="560"/><div><span>YOUR HOME. YOUR CHOG. YOUR NEXT CHAPTER.</span><p>Make things. Meet people. Make room for life.</p></div></section>
  </div>
  {walletOpen&&<section id="enter" className="onboarding-card welcome-account" aria-label="Enter with your Chog"><div className="welcome-account-heading"><div><p className="eyebrow">YOUR NFT HOUSEHOLD</p><h2>{!connected?'Bring your Chog home':!nft.isCorrectChain?'One network switch, then you’re in':nft.isLoading?'Finding your Chog…':nft.ownsChog?'Your household is ready':'Find your first Chog'}</h2></div><button onClick={onCloseWallet} aria-label="Close Chog entry">×</button></div>
   {!connected?<><p className="muted">Connect the wallet that owns your Chog. Returning sessions open without another signature.</p><ConnectKitButton label="Connect wallet"/></>:!nft.isCorrectChain?<><button className="primary" disabled={network.isPending} onClick={()=>network.switchChain({chainId:MONAD_TESTNET_ID})}>Switch to Monad Testnet</button>{network.error&&<p role="alert">{network.error.message.split('\n')[0]}</p>}</>:<>
    {nft.isLoading?<p role="status">Checking ownership and restoring original Chog traits…</p>:nft.ownsChog&&nft.metadata?<div className="welcome-ready"><p>{nft.metadata.name??`Chog #${nft.tokenId}`} is ready. Your resident and home settings are available while playing.</p><button className="primary" disabled={authBusy} onClick={onAuthenticate}>Enter my household</button></div>:<FaucetPanel key={nft.address} onClaimed={tokenId=>{nft.setSelected(String(tokenId));nft.retry()}}/>}
    <details open={nft.needsTokenId||undefined}><summary>Choose another owned Chog</summary><label className="token-label">Chog token ID<input inputMode="numeric" value={nft.selected} onChange={e=>nft.setSelected(e.target.value)} placeholder="Leave blank for your first NFT" aria-label="Resident token ID"/></label>{nft.needsTokenId&&<p className="muted">Enter an owned token ID for this collection.</p>}</details>
   </>}
   {(nft.error||error)&&<div className="notice" role="alert"><p>{error||nft.error}</p><button onClick={nft.retry}>Retry NFT loading</button>{nft.ownsChog&&<button onClick={onAuthenticate}>Retry entry</button>}</div>}
   <p className="preview-note">{shared?'Progress and workshop assets follow your NFT household.':'NFT progress is saved in this browser.'} Testnet game; gCHOG is game currency.</p>
  </section>}
  <section className="landing-features">{[['01','Care for your partner','Your Chog’s traits and bond shape your workshop and earnings.'],['02','Make a little living','Craft with real furniture and deliver goods to city businesses.'],['03','Make the place yours','Buy furniture and arrange it directly inside your home.']].map(([n,title,text])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}</section>
  <CollectionGallery onPreview={onPreview}/><footer>CHAIN WORLD <span>A life worth coming home to. · Monad Testnet</span></footer>
 </main>
}
