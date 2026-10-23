import { useCallback, useRef, useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import type { GameState, ChogTrait } from '../game/types'
import { ACTIONS, actionCost, dailyCost, HOUSING_LABELS, isDegenSpiral, QUESTS, TIER_LABELS, upgradeCost, type Command } from '../game/gameEngine'
import { getEventMultiplier, getTodaysEvent } from '../game/events'
import { ZONES, travelCost } from '../game/zones'
import { useGameController } from '../hooks/useGameController'
import WorldRoom, { type RoomHandle } from './WorldRoom'
import MeterBar from './MeterBar'
import JobsPanel from './JobsPanel'
import WorldMap from './WorldMap'
import RegistryPanel from './RegistryPanel'
import ObjectDialog from './ObjectDialog'
import type {FurnitureKind} from '../world/interactions'
import ZoneCard from './ZoneCard'
import ResidentProfile from './ResidentProfile'
import ChogAvatar from './ChogAvatar'
import WorldNeighborhood,{type NeighborhoodHandle} from './WorldNeighborhood'
import {useNeighborhood} from '../hooks/useNeighborhood'
import {HOME_STYLES,identityOf,CITY_INFRASTRUCTURE} from '../game/neighborhood'
interface Props { gameState:GameState; revision?:number; traits:ChogTrait[]; preview?:boolean; onExit():void }
export default function GameHUD({gameState,revision,traits,preview,onExit}:Props) {
  const {state:s,dispatch,saveError,gas,serverError,pending,shared}=useGameController(gameState,revision)
  const [tab,setTab]=useState('home')
  const [selectedObject,setSelectedObject]=useState<FurnitureKind|null>(null)
  const room=useRef<RoomHandle>(null)
  const street=useRef<NeighborhoodHandle>(null)
  const {snapshot:neighborhood,error:neighborhoodError}=useNeighborhood(s,shared)
  const outdoors=s.location?.kind==='street'
  const host=s.location?.host?neighborhood.neighbors.find(n=>n.identity===s.location.host):undefined
  const roomState=host?{...s,home:host.home,meters:{...s.meters,housingTier:host.housingTier}}:s
  const requestAction=(kind:Parameters<RoomHandle['request']>[0])=>{if(outdoors)street.current?.requestAction(kind);else room.current?.request(kind)}
  const dispatchJob=useCallback((command:Command)=>{if(command.type==='startJob'){if(s.location?.kind==='street')street.current?.requestJob(command);else room.current?.requestJob(command)}else dispatch(command)},[dispatch,s.location?.kind])
  const event=getTodaysEvent(s.lastSaved)
  const activity=s.action??s.job
  return <main className="game-shell">
    <header className="game-header"><div><a className="wordmark" href="/">chain<span>world</span><i>✦</i></a><p className="muted">{ZONES[s.currentZone].name} · {HOUSING_LABELS[s.meters.housingTier]}</p></div>
      <div className="header-balance"><strong>{s.gChog.toLocaleString()} <small>gCHOG</small></strong><p className="muted">{dailyCost(s,{now:s.lastSaved,gas})} / simulated day</p></div>
      {preview?<button onClick={onExit}>Exit preview</button>:<ConnectKitButton/>}
    </header>
    <div className="world-layout"><div className="world-column">
      <div className="room-heading"><div><p className="eyebrow">A LITTLE LIFE ON THE CHAIN</p><h1>{outdoors?'Life beyond the front door.':host?`Visiting ${host.name}`:'Home, sweet node.'}</h1></div><span className="pill">{shared?'Shared world':preview?'Local preview':'Local prototype'}</span></div>
      {outdoors?<WorldNeighborhood ref={street} state={s} snapshot={neighborhood} dispatch={dispatch} pending={pending} blocked={selectedObject!==null} gas={gas} onTravel={()=>setTab('zones')}/>:<><WorldRoom ref={room} state={roomState} dispatch={dispatch} pending={pending} dialogOpen={selectedObject!==null} onObjectSelect={setSelectedObject}/><div className="street-controls"><button onClick={()=>dispatch({type:'leaveHome'})} disabled={pending||!!s.action||!!s.job}>Leave home & explore</button>{host&&<p className="muted">You are a guest. Your own funds and needs apply.</p>}</div></>}
      <div className="activity-strip" role="status" aria-live="polite"><span className="status-dot"/>{s.lastMessage}{pending&&<span className="muted"> · Saving…</span>}</div>
      {neighborhoodError&&shared&&<p className="notice">{neighborhoodError}</p>}
      {(saveError||serverError)&&<p className="notice" role="alert">{serverError||'Browser storage is full or unavailable. Your progress is not being saved.'}</p>}
      {preview&&<p className="preview-note">{s.appearance.sourceImage?'A preview of an original Chog. Ownership and shared progress require your NFT.':'The reference Chog in a local preview. Connect an NFT to play your own character.'}</p>}
      <div className="action-bar">{(['eat','rest','socialize','work'] as const).map(kind=><button key={kind} onClick={()=>setSelectedObject(kind)}><span>{({eat:'◒',rest:'☾',socialize:'♡',work:'⌘'})[kind]}</span>{ACTIONS[kind].label}<small>{ACTIONS[kind].duration/1000}s · {actionCost(s,kind,gas)?`${actionCost(s,kind,gas)} gCHOG`:'Free'}</small></button>)}</div>
      {activity&&<div className="panel flex items-center justify-between"><div><p>{s.action?ACTIONS[s.action.kind].label:s.job?.kind==='validator'?'Block Validator':'Gwei Grifter'}</p><progress max={activity.endsAt-activity.startedAt} value={Math.min(activity.endsAt-activity.startedAt,Math.max(0,s.lastSaved-activity.startedAt))}/></div><button onClick={()=>{if(room.current)room.current.cancel();else dispatch({type:'cancel'})}}>Cancel</button></div>}
      <nav className="game-tabs" aria-label="Game panels">{[['home','Your life'],['jobs','Make a living'],['zones','Travel'],['map','Neighbors']].map(([id,label])=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{label}</button>)}</nav>
      {tab==='home'&&<div className="home-panels"><section className="panel space-y-3"><p className="eyebrow">MAKE YOURSELF AT HOME</p><h2>A little room to grow</h2><p className="muted">Your estate has {s.home.plots.length} parcel{s.home.plots.length===1?'':'s'}. Improve your home with earned gCHOG. Better beds restore more energy, and each tier brings a new room palette.</p><button className="primary" disabled={s.meters.housingTier>=5||s.gChog<upgradeCost(s,gas)} onClick={()=>dispatch({type:'upgrade'})}>{s.meters.housingTier>=5?'Home fully improved':`Improve home · ${upgradeCost(s,gas)} gCHOG`}</button><label className="home-style-label">Interior palette<select value={s.home.style} disabled={pending||s.location?.kind==='visit'} onChange={e=>dispatch({type:'decorate',style:e.target.value as typeof HOME_STYLES[number],open:s.home.open})}>{HOME_STYLES.map(style=><option key={style}>{style}</option>)}</select></label><label className="visitor-toggle"><input type="checkbox" checked={s.home.open} disabled={pending} onChange={e=>dispatch({type:'decorate',style:s.home.style,open:e.target.checked})}/> Open my home to visitors</label></section><section className="panel space-y-3"><h2>Little milestones</h2>{QUESTS.map(q=><div className="quest-row" key={q.id}><div><strong>{q.name}</strong><p className="muted">{q.description}</p></div><button disabled={s.quests.includes(q.id)||!q.ready(s)} onClick={()=>dispatch({type:'claimQuest',id:q.id})}>{s.quests.includes(q.id)?'✓ Claimed':`+${q.reward}`}</button></div>)}</section></div>}
      {tab==='jobs'&&<JobsPanel gameState={s} dispatch={dispatchJob}/>}
      {tab==='zones'&&<section className="panel space-y-3"><h2>Find your kind of neighborhood</h2><p className="muted">Earn 100 / 200 / 300 / 400 XP to open Basedford / Arbiquerque / Polygone-on-Sea / Gwei York. Home and Sanctuary are always free to reach.</p>{ZONES.map(z=><div key={z.id}><ZoneCard zone={z} isCurrentZone={s.currentZone===z.id} isUnlocked={s.unlockedZones.includes(z.id)} rarityRank={s.rarityRank} onTravel={zone=>dispatch({type:'travel',zone})} eventMultiplier={getEventMultiplier(event,z.id,'cost',s.lastSaved)}/><p className="travel-price">Travel: {travelCost(s.currentZone,z.id,gas[z.id])} gCHOG</p></div>)}</section>}
      {tab==='map'&&<section className="panel space-y-3"><h2>Your living neighborhood</h2><p className="muted">{s.currentZone!==5?CITY_INFRASTRUCTURE[s.currentZone].architecture:'A quiet place to recover.'}</p>{neighborhood.neighbors.map(n=><div className="quest-row" key={n.identity}><div><strong>{n.name}</strong><p className="muted">{n.home.plots.length} parcels · {n.online?'Around now':'Away'}</p></div><button disabled={!outdoors||!n.home.open} onClick={()=>{dispatch({type:'walk',target:{x:3+n.home.x*4,y:7+n.home.y*4}})}}>Walk to home</button></div>)}{shared&&<p className="preview-note">Properties and gCHOG offers are recorded in the shared game ledger. Onchain land settlement is awaiting contract deployment.</p>}<h3>Land offers</h3>{!neighborhood.offers.length&&<p className="muted">No pending offers. Select adjacent land outside to buy it or make an offer.</p>}{neighborhood.offers.map(offer=><div className="quest-row" key={offer.id}><div><strong>Parcel {offer.x+1}, {offer.y+1}</strong><p>{offer.amount} gCHOG · {offer.expiresAt<s.lastSaved?'Expired':'Funds held'}</p></div><div className="flex gap-2">{offer.buyer===identityOf(s)?<button disabled={pending} onClick={()=>dispatch({type:'respondOffer',id:offer.id,decision:'cancel'})}>Cancel & refund</button>:<><button disabled={pending||offer.expiresAt<s.lastSaved} onClick={()=>dispatch({type:'respondOffer',id:offer.id,decision:'accept'})}>Accept</button><button disabled={pending} onClick={()=>dispatch({type:'respondOffer',id:offer.id,decision:'reject'})}>Reject</button></>}</div></div>)}{neighborhood.messages.map(m=><p className="muted" key={m.id}>{m.sender===identityOf(s)?'You shared':'A neighbor shared'} a {m.gesture}.</p>)}</section>}
      {tab==='map'&&(preview?<section className="panel"><p>Connect your NFT wallet to see the on-chain neighborhood.</p></section>:<WorldMap gameState={s}/>)}
    </div><aside className="resident-sidebar">
      <section className="panel resident-card"><p className="eyebrow">YOUR RESIDENT</p><ChogAvatar appearance={s.appearance} tier={s.rarityTier} size={104}/><h2>{s.profile?.name||s.appearance.sourceName||(preview?'The neighborhood Chog':`Chog #${s.tokenId}`)}</h2><span className="pill">{s.rarityVerified?`${TIER_LABELS[s.rarityTier]} · Rank ${s.rarityRank}`:'Rarity awaiting source verification'}</span><p className="muted capitalize">{s.appearance.profession} · {s.xp} XP</p>
        <ResidentProfile profile={s.profile} pending={pending} onSave={profile=>dispatch({type:'setProfile',profile})}/><div className="space-y-4 mt-5"><MeterBar label="Hunger" value={s.meters.hunger} max={100}/><MeterBar label="Energy" value={s.meters.energy} max={100}/><MeterBar label="Social" value={s.meters.social} max={100}/><MeterBar label="Reputation" value={s.meters.reputation} max={500}/></div>
        {isDegenSpiral(s.meters)&&<p className="notice">Degen Spiral: 40% earnings. Food and a friendly call will help.</p>}
        {s.gChog<20&&s.meters.hunger<20&&<button className="mt-3" onClick={()=>dispatch({type:'ration'})}>Get a community ration</button>}
      </section>
      <section className="event-card"><p className="eyebrow">AROUND THE CHAIN</p><h3>{event.name}</h3><p>{event.effect}</p><small>Until {new Date(event.endsAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · UTC rotation</small></section>
      {!preview&&<RegistryPanel state={s} dispatch={dispatch} shared={shared}/>}
      <details className="panel"><summary>NFT traits & abilities</summary>{traits.length?traits.map(t=><p key={t.trait_type} className="trait-row"><span>{t.trait_type}</span><strong>{t.value}</strong></p>):<p className="muted">Neutral preview. No NFT traits are assigned.</p>}<p className="muted mt-3">Income ×{s.stats.incomeMultiplier.toFixed(2)} · Decay ×{s.stats.meterDecayMultiplier.toFixed(2)} · Social +{s.stats.socialGainRate}</p><p className="muted">Unsupported visual traits use a neutral rendering; original traits remain listed here.</p></details>
      <p className="preview-note">{shared?'Progress is stored for your NFT in the shared world.':'Progress is stored in this browser for this NFT. Shared persistence requires the game service.'} 1 real minute = 10 game minutes. gCHOG is game currency.</p>
    </aside></div>
    {selectedObject&&<ObjectDialog key={selectedObject} object={selectedObject} state={s} gas={gas} onChoose={kind=>{requestAction(kind);setSelectedObject(null)}} onClose={()=>setSelectedObject(null)} onStartValidator={()=>{dispatchJob({type:'startJob',kind:'validator'});setTab('jobs');setSelectedObject(null)}}/>}
  </main>
}
