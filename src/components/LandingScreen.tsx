import BrandLogo from './BrandLogo'
import {useEffect} from 'react'
import {ConnectKitButton} from 'connectkit'
import {useSwitchChain} from 'wagmi'
import type {useChogNFT} from '../hooks/useChogNFT'
import {MONAD_TESTNET_ID,networkName,type PlayChainId} from '../game/networks'
import FaucetPanel from './FaucetPanel'
import CollectionGallery from './CollectionGallery'
interface Props {selectedNetwork:PlayChainId|null;nft:ReturnType<typeof useChogNFT>;onAuthenticate():void;onWalletIntent():void;onCloseWallet():void;walletOpen:boolean;authBusy:boolean;error:string}
export default function LandingScreen({selectedNetwork,nft,onAuthenticate,onWalletIntent,onCloseWallet,walletOpen,authBusy,error}:Props){
 const network=useSwitchChain(),connected=!!nft.address,testnet=selectedNetwork!==143,label=networkName(selectedNetwork??MONAD_TESTNET_ID)
 useEffect(()=>{if(walletOpen)document.getElementById('enter')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})},[walletOpen])
 return <main className="landing-shell welcome-page">
  <nav className="landing-nav"><BrandLogo/><span className="welcome-tagline">PLAY · BUILD · BELONG</span></nav>
  <div className="landing-grid"><section className="landing-copy"><p className="eyebrow">A LITTLE LIFE. A CHOG BY YOUR SIDE.</p><h1>Make yourself<br/><em>at home.</em></h1><p>Care for your Chog, make goods together and earn your place in a living neighborhood. Build a home and a business around the NFT that makes your household yours.</p><div className="welcome-actions"><button className="primary" onClick={onWalletIntent}>{connected?'Continue with my Chog':'Connect wallet to play'} ↗</button></div><p className="landing-play-note">Choose Testnet or Mainnet · Connect your wallet · Play with your Chog</p>{error&&!walletOpen&&<p className="notice" role="alert">{error}</p>}</section>
   <section className="welcome-home" aria-label="A life with your Chog"><img src="/art/entry/home-v1.webp" alt="A resident and their Chog in a furnished home" width="900" height="560"/><div><span>YOUR HOME. YOUR CHOG. YOUR NEXT CHAPTER.</span><p>Make things. Meet people. Make room for life.</p></div></section>
  </div>
  {walletOpen&&<section id="enter" className="onboarding-card welcome-account" aria-label="Enter with your Chog"><div className="welcome-account-heading"><div><p className="eyebrow">{label.toUpperCase()} HOUSEHOLD</p><h2>{!connected?'Bring your Chog home':!nft.isCorrectChain?'One network switch, then you’re in':nft.isLoading?'Finding your Chog…':nft.ownsChog?'Your household is ready':testnet?'Find your first Chog':'A mainnet Chog is required'}</h2></div><button onClick={onCloseWallet} aria-label="Close Chog entry">×</button></div>
   <ol className="signup-steps" aria-label="Signup progress"><li aria-current={!connected?'step':undefined}>1 · Connect wallet</li><li aria-current={connected&&!nft.ownsChog?'step':undefined}>2 · {testnet?'Get your Test Chog':'Verify your Chog'}</li><li aria-current={nft.ownsChog?'step':undefined}>3 · Sign in & play</li></ol>
   {!connected?<><p className="muted">Connect your wallet to sign in on {label}. {testnet?'You’ll claim a free Test Chog if you don’t own one yet.':'You must own a Chog from the original mainnet collection.'}</p><ConnectKitButton label="Connect wallet"/></>:!nft.isCorrectChain?<><button className="primary" disabled={network.isPending} onClick={()=>network.switchChain({chainId:selectedNetwork??MONAD_TESTNET_ID})}>Switch to {label}</button>{network.error&&<p role="alert">{network.error.message.split('\n')[0]}</p>}</>:<>
    {nft.isLoading?<p role="status">Checking ownership and restoring original Chog traits…</p>:nft.error?<p className="muted">Resolve the ownership check below to continue.</p>:nft.ownsChog&&nft.metadata?<div className="welcome-ready"><p>{nft.metadata.name??`Chog #${nft.tokenId}`} is ready. Your resident and home settings are available while playing.</p><button className="primary" disabled={authBusy} onClick={onAuthenticate}>Enter my household</button></div>:testnet?<FaucetPanel key={nft.address} onClaimed={tokenId=>{nft.setSelected(String(tokenId));nft.retry()}}/>:<div className="mainnet-entry"><p className="muted">Connect a wallet that owns a mainnet Chog. Test Chogs cannot be used on Mainnet.</p><a href="https://monadvision.com/address/0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763" target="_blank" rel="noreferrer">View the mainnet Chog collection ↗</a></div>}
    <details open={nft.needsTokenId||undefined}><summary>Choose another owned Chog</summary><label className="token-label">Chog token ID<input inputMode="numeric" value={nft.selected} onChange={e=>nft.setSelected(e.target.value)} placeholder="Leave blank for your first NFT" aria-label="Resident token ID"/></label>{nft.needsTokenId&&<p className="muted">Enter an owned token ID for this collection.</p>}</details>
   </>}
   {(nft.error||error)&&<div className="notice" role="alert"><p>{error||nft.error}</p><button onClick={nft.retry}>Retry NFT loading</button>{nft.ownsChog&&<button onClick={onAuthenticate}>Retry entry</button>}</div>}
   <p className="preview-note">Your wallet and {testnet?'Test Chog':'mainnet Chog'} are required to play. Progress and workshop assets follow your NFT household. {label}; gCHOG is game currency.</p>
  </section>}
  <section className="landing-features">{[['01','Care for your partner','Your Chog’s traits and bond shape your workshop and earnings.'],['02','Make a little living','Craft with real furniture and deliver goods to city businesses.'],['03','Make the place yours','Buy furniture and arrange it directly inside your home.']].map(([n,title,text])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}</section>
  <CollectionGallery/><footer><BrandLogo/><span>A life worth coming home to. · Monad</span></footer>
 </main>
}
