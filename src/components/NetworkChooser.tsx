import {useEffect,useRef} from 'react'
import {ConnectKitButton} from 'connectkit'
import {MONAD_MAINNET_ID,MONAD_TESTNET_ID,type PlayChainId} from '../game/networks'
export default function NetworkChooser({connected,onChoose,onClose}:{connected:boolean;onChoose(chainId:PlayChainId):void;onClose():void}){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close()},[])
 return <dialog className="network-chooser" ref={ref} aria-label="Choose your network" onCancel={onClose}><button className="dialog-close" aria-label="Close network selection" onClick={onClose}>×</button><p className="eyebrow">CHOOSE YOUR WORLD</p><h2>Where would you like to play?</h2><p className="muted">Your household and progress stay separate on each network.</p><ConnectKitButton.Custom>{({show})=><div className="network-options">{([{chainId:MONAD_TESTNET_ID,label:'Play on testnet',text:'Claim a free Test Chog and explore Monad Testnet.'},{chainId:MONAD_MAINNET_ID,label:'Play on Mainnet',text:'Enter with a Chog you own from the original Monad mainnet collection.'}] as const).map(n=><button key={n.chainId} aria-label={n.label} aria-describedby={`network-description-${n.chainId}`} onClick={()=>{onChoose(n.chainId);if(!connected)show?.()}}><strong>{n.label}</strong><span id={`network-description-${n.chainId}`}>{n.text}</span></button>)}</div>}</ConnectKitButton.Custom></dialog>
}
