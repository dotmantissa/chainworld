import { forwardRef, useEffect, useLayoutEffect, useImperativeHandle, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ActionKind, GameState } from '../game/types'
import type { Command } from '../game/gameEngine'
import ChogAvatar from './ChogAvatar'
import type { RoomScene, JobRequest } from '../world/RoomScene'
import type { FurnitureKind } from '../world/interactions'
export interface RoomHandle { request(kind: ActionKind,id?:string): void; requestJob(command:JobRequest):void; cancel(): void }
interface Props { state: GameState; dispatch(c: Command): void; pending:boolean; dialogOpen:boolean; onObjectSelect(kind:FurnitureKind,id?:string):void }
const WorldRoom = forwardRef<RoomHandle, Props>(function WorldRoom({ state, dispatch, pending, dialogOpen, onObjectSelect }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(state); useLayoutEffect(()=>{latest.current=state},[state])
  const scene = useRef<RoomScene>()
  const pendingRef=useRef(pending);useLayoutEffect(()=>{pendingRef.current=pending},[pending])
  const dialogRef=useRef(dialogOpen)
  useLayoutEffect(()=>{dialogRef.current=dialogOpen;if(scene.current?.input)scene.current.input.enabled=!dialogOpen},[dialogOpen])
  const [queue,setQueue] = useState<string[]>([])
  const [message,setMessage]=useState('Tap a floor tile to walk. Tap furniture to interact.')
  useImperativeHandle(ref,()=>({request:(kind,id)=>scene.current?.request(kind,id),requestJob:command=>scene.current?.requestJob(command),cancel:()=>scene.current?.cancel()}),[])
  useEffect(()=>{
    let disposed=false
    let game: import('phaser').Game | undefined
    void Promise.all([import('phaser'),import('../world/RoomScene')]).then(([{default:Phaser},{RoomScene}])=>{
      if(disposed || !host.current) return
      const markup=renderToStaticMarkup(<ChogAvatar appearance={latest.current.appearance} tier={latest.current.rarityTier} size={96} portrait={false}/> )
      const svg=markup.slice(markup.indexOf('<svg'),markup.indexOf('</svg>')+6).replace(/<circle cx="50" cy="50" r="50"[^>]*><\/circle>/,'')
      scene.current=new RoomScene({state:()=>latest.current,pending:()=>pendingRef.current,dialogOpen:()=>dialogRef.current,onObjectSelect,dispatch,onQueue:setQueue,onMessage:setMessage,avatarSvg:svg})
      game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:800,height:500,backgroundColor:'#b1a595',scene:scene.current,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},fps:{target:30},input:{activePointers:2}})
    }).catch(()=>setMessage('The room could not load. Use the care controls below.'))
    return()=>{disposed=true;game?.destroy(true);scene.current=undefined}
  },[dispatch,onObjectSelect,state.profile.gender])
  return <section className="room-card" aria-label="Interactive home">
    <div ref={host} className="room-canvas" role="img" aria-label="Isometric Chog home. Accessible furniture controls follow below." />
    <div className="room-caption">{queue.length ? `Queued: ${queue.join(' → ')}` : message}{queue.length>0&&<button className="queue-cancel" onClick={()=>scene.current?.cancel()}>Cancel queue</button>}</div>
  </section>
})
export default WorldRoom
