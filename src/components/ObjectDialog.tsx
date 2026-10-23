import { useEffect, useRef } from 'react'
import type { ActionKind, GameState, ZoneId } from '../game/types'
import { ACTIONS, actionCost } from '../game/gameEngine'
import { INTERACTIONS, unavailableReason, type FurnitureKind } from '../world/interactions'
interface Props { object:FurnitureKind; state:GameState; gas:Partial<Record<ZoneId,number|null>>; onChoose(kind:ActionKind):void; onClose():void; onStartValidator():void;onPetCare?(kind:'feed'|'pet'|'play'):void }
export default function ObjectDialog({object,state,gas,onChoose,onClose,onStartValidator,onPetCare}:Props) {
  const dialog=useRef<HTMLDialogElement>(null)
  const content=INTERACTIONS[object]
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[])
  return <dialog ref={dialog} className="object-dialog" aria-labelledby="object-title" onCancel={onClose} onClick={event=>{if(event.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose()}}}>
    <button className="dialog-close" aria-label="Close object actions" onClick={onClose}>×</button>
    <div className="object-preview anime-object-preview"><span>{({eat:'♨',rest:'☾',work:'⌘',socialize:'♡',pet:'✦',decor:'♧'})[object]}</span><small>A little life, one moment at a time.</small></div>
    <div className="object-options"><p className="eyebrow">MAKE YOURSELF AT HOME</p><h2 id="object-title">{content.title}</h2><p className="muted">{content.description}</p>
      <div className="object-action-list">{content.actions.map(({kind,benefit})=>{
        const action=ACTIONS[kind],cost=actionCost(state,kind,gas),reason=unavailableReason(state,kind,cost)
        return <button className="object-action" key={kind} disabled={!!reason} onClick={()=>onChoose(kind)}><span><strong>{action.label}</strong><small>{benefit}</small><small className="action-reason">{reason??'Walk to object & begin'}</small></span><span className="object-action-cost">{cost?`${cost} gCHOG`:'Free'}<small>{action.duration/1000}s{kind==='hermit'?' / cycle':''}</small></span></button>
      })}</div>
      {object==='work'&&<button className="mb-4" disabled={state.meters.energy<10} onClick={onStartValidator}>Play Block Validator · 20s</button>}
      {object==='pet'&&<div className="pet-actions">{(['feed','pet','play'] as const).map(kind=><button key={kind} onClick={()=>onPetCare?.(kind)}>{({feed:'Fill food bowl',pet:'Pet your Chog',play:'Play together'})[kind]}</button>)}</div>}
      <p className="preview-note">Choose an action to add it to your resident’s queue. Costs apply when the interaction starts. You can cancel from the activity bar.</p>
    </div>
  </dialog>
}
