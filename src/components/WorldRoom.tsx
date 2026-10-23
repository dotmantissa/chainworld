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
import CameraControls from './CameraControls'
import QueueControls from './QueueControls'
import type {CameraView} from '../world/cameraControls'
export interface RoomHandle { request(kind: ActionKind,id?:string): void; requestJob(command:JobRequest):void;requestNpc(id:string,topic:keyof typeof TOPICS):void; cancel(): void }
interface Props { state: GameState; dispatch(c: Command): void; pending:boolean; dialogOpen:boolean; onObjectSelect(kind:FurnitureKind,id?:string):void;onNpcSelect(id:string):void }
const WorldRoom = forwardRef<RoomHandle, Props>(function WorldRoom({ state, dispatch, pending, dialogOpen, onObjectSelect,onNpcSelect }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(state); useLayoutEffect(()=>{latest.current=state},[state])
  const scene = useRef<RoomScene>()
  const pendingRef=useRef(pending);useLayoutEffect(()=>{pendingRef.current=pending},[pending])
  const dialogRef=useRef(dialogOpen)
  useLayoutEffect(()=>{dialogRef.current=dialogOpen;if(scene.current?.input)scene.current.input.enabled=!dialogOpen},[dialogOpen])
  const [camera,setCamera]=useState<CameraView>({zoom:1,panMode:false})
  const sceneKey=`${state.profile.gender}:${state.location.venue??''}:${state.location.host??''}`
  const [readyScene,setReadyScene]=useState<string|null>(null)
  const loading=readyScene!==sceneKey
  const [message,setMessage]=useState('Click to walk · WASD to move · E for nearby objects.')
  useImperativeHandle(ref,()=>({request:(kind,id)=>scene.current?.request(kind,id),requestJob:command=>scene.current?.requestJob(command),requestNpc:(id,topic)=>scene.current?.requestNpc(id,topic),cancel:()=>scene.current?.cancel()}),[])
  useEffect(()=>{
    let disposed=false
    let game: import('phaser').Game | undefined
    void Promise.all([import('phaser'),import('../world/RoomScene')]).then(([{default:Phaser},{RoomScene}])=>{
      if(disposed || !host.current) return
      const markup=renderToStaticMarkup(<ChogAvatar appearance={latest.current.appearance} tier={latest.current.rarityTier} size={96} portrait={false}/> )
      const svg=markup.slice(markup.indexOf('<svg'),markup.indexOf('</svg>')+6).replace(/<circle cx="50" cy="50" r="50"[^>]*><\/circle>/,'')
      scene.current=new RoomScene({state:()=>latest.current,pending:()=>pendingRef.current,dialogOpen:()=>dialogRef.current,onObjectSelect,onNpcSelect,dispatch,onMessage:setMessage,onReady:()=>{if(!disposed)setReadyScene(sceneKey)},onCameraChange:view=>{if(!disposed)setCamera(view)},avatarSvg:svg})
      game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:800,height:500,backgroundColor:'#b1a595',scene:scene.current,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},fps:{target:30},input:{activePointers:2}})
    }).catch(()=>{if(!disposed){setReadyScene(sceneKey);setMessage('The room could not load. Use the care controls below.')}})
    return()=>{disposed=true;game?.destroy(true);scene.current=undefined}
  },[dispatch,onObjectSelect,onNpcSelect,sceneKey])
  const venue=venueOf(state.location.venue),npc=venue&&state.currentZone!==5?cityNpc(state.currentZone,venue):null
  return <section className="room-card" aria-label="Interactive home">
    <div ref={host} className="room-canvas" role="group" aria-busy={loading} aria-label="Isometric home. Click the floor or use WASD to walk. Press E for nearby furniture. Accessible furniture controls follow below.">{loading&&<div className="room-loading"><span/><p>Opening your little world…</p></div>}</div>
    <CameraControls label="House camera controls" view={camera} onCommand={command=>scene.current?.cameraCommand(command)}/>
    <div className="room-caption">{message}</div>
    <QueueControls state={state} dispatch={dispatch} pending={pending}/>

    {npc&&<div className="place-people"><span>{npc.role} · {npc.name}</span><button onClick={()=>onNpcSelect(npc.id)}>Meet {npc.name}</button>{venue==='park'&&<span>Bring your Chog along · communal pet care available</span>}</div>}
    <details className="place-objects"><summary>Objects in this place</summary><div>{activeBlueprint(state).objects.filter(o=>!o.stored).map(o=><button key={o.id} onClick={()=>onObjectSelect(FURNITURE[o.type].family as FurnitureKind,o.id)}>{FURNITURE[o.type].label}</button>)}</div></details>
  </section>
})
export default WorldRoom
