import { forwardRef, useEffect, useLayoutEffect, useImperativeHandle, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ActionKind, GameState } from '../game/types'
import type { Command } from '../game/gameEngine'
import ChogAvatar from './ChogAvatar'
import type { RoomScene, JobRequest } from '../world/RoomScene'
import type { FurnitureKind } from '../world/interactions'
import {cityNpc,venueOf,type TOPICS} from '../game/places'
import {activeBlueprint} from '../game/indoor'
import {FURNITURE} from '../game/housing'
export interface RoomHandle { request(kind: ActionKind,id?:string): void; requestJob(command:JobRequest):void;requestNpc(id:string,topic:keyof typeof TOPICS):void; cancel(): void }
interface Props { state: GameState; dispatch(c: Command): void; pending:boolean; dialogOpen:boolean; onObjectSelect(kind:FurnitureKind,id?:string):void;onNpcSelect(id:string):void }
const WorldRoom = forwardRef<RoomHandle, Props>(function WorldRoom({ state, dispatch, pending, dialogOpen, onObjectSelect,onNpcSelect }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(state); useLayoutEffect(()=>{latest.current=state},[state])
  const scene = useRef<RoomScene>()
  const pendingRef=useRef(pending);useLayoutEffect(()=>{pendingRef.current=pending},[pending])
  const dialogRef=useRef(dialogOpen)
  useLayoutEffect(()=>{dialogRef.current=dialogOpen;if(scene.current?.input)scene.current.input.enabled=!dialogOpen},[dialogOpen])
  const [queue,setQueue] = useState<string[]>([])
  const [message,setMessage]=useState('Tap a floor tile to walk. Tap furniture to interact.')
  useImperativeHandle(ref,()=>({request:(kind,id)=>scene.current?.request(kind,id),requestJob:command=>scene.current?.requestJob(command),requestNpc:(id,topic)=>scene.current?.requestNpc(id,topic),cancel:()=>scene.current?.cancel()}),[])
  useEffect(()=>{
    let disposed=false
    let game: import('phaser').Game | undefined
    void Promise.all([import('phaser'),import('../world/RoomScene')]).then(([{default:Phaser},{RoomScene}])=>{
      if(disposed || !host.current) return
      const markup=renderToStaticMarkup(<ChogAvatar appearance={latest.current.appearance} tier={latest.current.rarityTier} size={96} portrait={false}/> )
      const svg=markup.slice(markup.indexOf('<svg'),markup.indexOf('</svg>')+6).replace(/<circle cx="50" cy="50" r="50"[^>]*><\/circle>/,'')
      scene.current=new RoomScene({state:()=>latest.current,pending:()=>pendingRef.current,dialogOpen:()=>dialogRef.current,onObjectSelect,onNpcSelect,dispatch,onQueue:setQueue,onMessage:setMessage,avatarSvg:svg})
      game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:800,height:500,backgroundColor:'#b1a595',scene:scene.current,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},fps:{target:30},input:{activePointers:2}})
    }).catch(()=>setMessage('The room could not load. Use the care controls below.'))
    return()=>{disposed=true;game?.destroy(true);scene.current=undefined}
  },[dispatch,onObjectSelect,onNpcSelect,state.profile.gender,state.location.venue,state.location.host])
  const venue=venueOf(state.location.venue),npc=venue&&state.currentZone!==5?cityNpc(state.currentZone,venue):null
  return <section className="room-card" aria-label="Interactive home">
    <div ref={host} className="room-canvas" role="img" aria-label="Isometric Chog home. Accessible furniture controls follow below." />
    <div className="room-caption">{queue.length ? `Queued: ${queue.join(' → ')}` : message}{queue.length>0&&<button className="queue-cancel" onClick={()=>scene.current?.cancel()}>Cancel queue</button>}</div>
    {npc&&<div className="place-people"><span>{npc.role} · {npc.name}</span><button onClick={()=>onNpcSelect(npc.id)}>Meet {npc.name}</button>{venue==='park'&&<span>Bring your Chog along · communal pet care available</span>}</div>}
    <details className="place-objects"><summary>Objects in this place</summary><div>{activeBlueprint(state).objects.filter(o=>!o.stored).map(o=><button key={o.id} onClick={()=>onObjectSelect(FURNITURE[o.type].family as FurnitureKind,o.id)}>{FURNITURE[o.type].label}</button>)}</div></details>
  </section>
})
export default WorldRoom
