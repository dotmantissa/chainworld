import {useEffect,useRef} from 'react'
import {npcById,TOPICS} from '../game/places'
import type {GameState} from '../game/types'
export default function NpcDialog({id,state,onTalk,onClose}:{id:string;state:GameState;onTalk(topic:keyof typeof TOPICS):void;onClose():void}){
 const dialog=useRef<HTMLDialogElement>(null),npc=npcById(id),relationship=state.household?.relationships[id]
 useEffect(()=>{const d=dialog.current;d?.showModal();return()=>d?.close()},[])
 if(!npc)return null
 return <dialog ref={dialog} className="street-dialog npc-dialog" aria-label={`Meet ${npc.name}`} onCancel={onClose}><button className="dialog-close" aria-label="Close conversation" onClick={onClose}>×</button><p className="eyebrow">A FAMILIAR FACE</p><h2>{npc.name}</h2><p>{npc.role}</p><p className="muted">{relationship?`${relationship.meetings} shared moments · Friendship ${relationship.friendship}/100`:'A new face in the neighborhood. Walk over and say hello.'}</p>{relationship&&<p className="memory-note">Last memory: {TOPICS[relationship.memory as keyof typeof TOPICS]??'A friendly conversation'}</p>}<div className="npc-topics">{(Object.entries(TOPICS) as [keyof typeof TOPICS,string][]).map(([topic,label])=><button key={topic} disabled={!!state.action||!!state.job} onClick={()=>onTalk(topic)}>{label}<small>Walk closer & talk</small></button>)}</div><button onClick={onClose}>Maybe later</button></dialog>
}
