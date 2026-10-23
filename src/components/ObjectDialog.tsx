import { useEffect, useRef } from 'react'
import type { ActionKind, GameState, ZoneId } from '../game/types'
import { ACTIONS, actionCost } from '../game/gameEngine'
import { INTERACTIONS, unavailableReason, type FurnitureKind } from '../world/interactions'
import {furnitureArtwork,outdoorArtwork} from '../world/artwork'
import {activeBlueprint} from '../game/indoor'
import {FURNITURE} from '../game/housing'
interface Props { object:FurnitureKind;objectId?:string; state:GameState; gas:Partial<Record<ZoneId,number|null>>; onChoose(kind:ActionKind):void; onClose():void; onStartValidator():void;onPetCare?(kind:'feed'|'pet'|'play'):void }
export default function ObjectDialog({object,objectId,state,gas,onChoose,onClose,onStartValidator,onPetCare}:Props) {
  const dialog=useRef<HTMLDialogElement>(null)
  const content=INTERACTIONS[object]
  const item=objectId?activeBlueprint(state).objects.find(o=>o.id===objectId):undefined
  const park=activeBlueprint(state).environment==='park'
  const art=park&&item?.type==='sofa'?outdoorArtwork[item.rotation]:park&&item?.type==='plant'?outdoorArtwork[2+item.rotation]:furnitureArtwork(item?.type??({eat:'kitchen',rest:'bed',work:'desk',socialize:'sofa',pet:'bowl',decor:'plant'} as const)[object],item?.rotation)
  const actions=content.actions.filter(a=>!item||(FURNITURE[item.type].actions as readonly string[]).includes(a.kind))
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[])
  return <dialog ref={dialog} className="object-dialog" aria-labelledby="object-title" onCancel={onClose} onClick={event=>{if(event.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose()}}}>
    <button className="dialog-close" aria-label="Close object actions" onClick={onClose}>×</button>
    <div className="object-preview anime-object-preview"><img src={art.url} alt=""/><small>{park&&item?.type==='sofa'?'Park bench':item?FURNITURE[item.type].label:'A little life, one moment at a time.'}</small></div>
    <div className="object-options"><p className="eyebrow">{park?'A MOMENT IN THE GARDENS':'MAKE YOURSELF AT HOME'}</p><h2 id="object-title">{park&&item?.type==='sofa'?'The park bench':content.title}</h2><p className="muted">{park&&item?.type==='sofa'?'Take a seat, enjoy a quiet read or catch up with a friend.':content.description}</p>
      <div className="object-action-list">{actions.map(({kind,benefit})=>{
        const action=ACTIONS[kind],cost=actionCost(state,kind,gas),reason=unavailableReason(state,kind,cost)
        return <button className="object-action" key={kind} disabled={!!reason} onClick={()=>onChoose(kind)}><span><strong>{action.label}</strong><small>{benefit}</small><small className="action-reason">{reason??'Walk to object & begin'}</small></span><span className="object-action-cost">{cost?`${cost} gCHOG`:'Free'}<small>{action.duration/1000}s{kind==='hermit'?' / cycle':''}</small></span></button>
      })}</div>
      {object==='work'&&<button className="mb-4" disabled={state.meters.energy<10} onClick={onStartValidator}>Play Block Validator · 20s</button>}
      {object==='pet'&&<div className="pet-actions">{(['feed','pet','play'] as const).map(kind=><button key={kind} onClick={()=>onPetCare?.(kind)}>{({feed:'Fill food bowl',pet:'Pet your Chog',play:'Play together'})[kind]}</button>)}</div>}
      {object==='decor'&&<p className="muted">{park?'A little greenery for everyone to enjoy.':'Arrange, store or sell this furnishing in Build & Buy.'}</p>}
      <p className="preview-note">Choose an action to add it to your resident’s queue. Costs apply when the interaction starts. You can cancel from the activity bar.</p>
    </div>
  </dialog>
}
