import { forwardRef,useEffect,useImperativeHandle,useLayoutEffect,useRef,useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ACTIONS,actionCost,type Command } from '../game/gameEngine'
import { adjacent,distance,frontDoor,identityOf,SERVICES,serviceName,streetPath,type Neighbor,type NeighborhoodSnapshot } from '../game/neighborhood'
import type { ActionKind,GameState,ZoneId } from '../game/types'
import type { Tile } from '../world/navigation'
import type { StreetScene } from '../world/StreetScene'
import ChogAvatar from './ChogAvatar'
import { cityPrice } from '../game/zones'
import {humanFor} from '../world/human'
export interface NeighborhoodHandle {requestAction(kind:ActionKind):void;requestJob(command:Command):void;requestTravel(zone:ZoneId):void}
interface Props {state:GameState;snapshot:NeighborhoodSnapshot;dispatch(command:Command):void;pending:boolean;blocked:boolean;gas:Partial<Record<ZoneId,number|null>>;onTravel():void}
type Selection={type:'plot';tile:Tile}|{type:'service';index:number}|{type:'neighbor';neighbor:Neighbor}
const WorldNeighborhood=forwardRef<NeighborhoodHandle,Props>(function WorldNeighborhood(props,ref){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props),scene=useRef<StreetScene>(),selectionRef=useRef<Selection|null>(null)
 const [selection,setSelection]=useState<Selection|null>(null),[error,setError]=useState(''),[amount,setAmount]=useState('100')
 const [goal,setGoal]=useState<{tile:Tile;command:Command}|null>(null)
 useLayoutEffect(()=>{latest.current=props},[props]);useLayoutEffect(()=>{selectionRef.current=selection},[selection])
 const request=(tile:Tile,command:Command)=>{
  const s=latest.current.state
  if(s.action||s.job||s.location.journey||s.location.trip||latest.current.pending){setError('Finish your current activity or walk first.');return}
  if(distance(s.location.tile,tile)<=1){props.dispatch(command);setSelection(null);return}
  if(streetPath(s.location.tile,tile)===null){setError('There is no walkable route to that spot.');return}
  setGoal({tile,command});props.dispatch({type:'walk',target:tile});setSelection(null);setError('')
 }
 const requestAction=(kind:ActionKind)=>{const service=SERVICES.find(s=>s.actions.includes(kind));if(service)request(service.approach,{type:'startAction',kind})}
 useImperativeHandle(ref,()=>({requestAction,requestJob:command=>request(SERVICES[1].approach,command),requestTravel:zone=>request(SERVICES[3].approach,{type:'travel',zone})}))
 const {state:currentState,pending:currentPending,dispatch:sendCommand}=props
 useEffect(()=>{
  if(!goal||currentPending||currentState.location.journey)return
  let active=true
  if(distance(currentState.location.tile,goal.tile)<=1)queueMicrotask(()=>{if(active){setGoal(null);sendCommand(goal.command)}})
  else if(!currentState.lastMessage.startsWith('Walking'))queueMicrotask(()=>{if(active)setGoal(null)})
  return()=>{active=false}
 },[goal,currentPending,currentState.location,currentState.lastSaved,currentState.lastMessage,sendCommand])
 useEffect(()=>{
  let disposed=false,game:import('phaser').Game|undefined
  void Promise.all([import('phaser'),import('../world/StreetScene')]).then(([{default:Phaser},{StreetScene}])=>{
   if(disposed||!host.current)return
   scene.current=new StreetScene({state:()=>latest.current.state,snapshot:()=>latest.current.snapshot,blocked:()=>latest.current.pending||latest.current.blocked||selectionRef.current!==null,
    walk:tile=>{setGoal(null);latest.current.dispatch({type:'walk',target:tile})},selectPlot:tile=>{setSelection({type:'plot',tile});setError('')},selectService:index=>{setSelection({type:'service',index});setError('')},selectNeighbor:neighbor=>{setSelection({type:'neighbor',neighbor});setError('')},
    avatarSvg:neighbor=>{const s=latest.current.state;const html=renderToStaticMarkup(<ChogAvatar appearance={neighbor?.appearance??s.appearance} tier={s.rarityTier} size={128} portrait={false}/>);return html.slice(html.indexOf('<svg'),html.indexOf('</svg>')+6)},
    humanSvg:neighbor=>{const s=latest.current.state;return humanFor(neighbor?{appearance:neighbor.appearance,profile:neighbor.profile,collection:neighbor.identity.split(':')[1],tokenId:neighbor.tokenId}:s)},
   })
   game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:800,height:500,scene:scene.current,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},fps:{target:30},render:{antialias:true}})
  }).catch(()=>setError('The street could not load. Refresh to try again.'))
  return()=>{disposed=true;game?.destroy(true);scene.current=undefined}
 },[props.state.currentZone])
 const s=props.state,myIdentity=identityOf(s)
 const parcel=selection?.type==='plot'?props.snapshot.parcels.find(p=>p.x===selection.tile.x&&p.y===selection.tile.y):undefined
 const neighbor=parcel?props.snapshot.neighbors.find(n=>n.identity===parcel.identity):undefined
 const canExpand=selection?.type==='plot'&&s.home.city===s.currentZone&&s.home.plots.some(p=>adjacent(p,selection.tile))
 return <section className="room-card" aria-label="Interactive neighborhood"><div ref={host} className="room-canvas" role="img" aria-label="Walkable city with homes, parks, cafe, coworking club and tram station"/><div className="room-caption">{goal?'Walking to your selected interaction…':'Tap the pavement to walk. Select a building, parcel or resident to interact.'}{s.location.journey&&<button onClick={()=>{setGoal(null);props.dispatch({type:'cancel'})}}>Stop walking</button>}</div>
  <div className="street-controls"><button onClick={()=>request(frontDoor(s.home),{type:'enterHome'})} disabled={s.currentZone!==s.home.city||props.pending}>Walk home</button>{SERVICES.slice(0,3).map((service,index)=><button key={service.id} onClick={()=>setSelection({type:'service',index})}>{serviceName(s.currentZone,index)}</button>)}<button onClick={props.onTravel}>Tram & city travel</button></div>
  {error&&<p role="alert" className="notice">{error}</p>}
  {selection&&<StreetDialog onClose={()=>setSelection(null)}><>
   {selection.type==='service'&&<><p className="eyebrow">AROUND THE NEIGHBORHOOD</p><h2>{serviceName(s.currentZone,selection.index)}</h2><p className="muted">Walk to the entrance, explore inside, meet someone, or use a service.</p>{selection.index<3&&<button className="primary" onClick={()=>request(SERVICES[selection.index].approach,{type:'enterVenue',venue:(['cafe','work','park']as const)[selection.index]})}>{selection.index===2?'Enter the park':'Go inside'}</button>}{SERVICES[selection.index].actions.map(kind=><button key={kind} disabled={s.gChog<actionCost(s,kind,props.gas)} onClick={()=>requestAction(kind)}>{ACTIONS[kind].label} · {actionCost(s,kind,props.gas)?`${actionCost(s,kind,props.gas)} gCHOG`:'Free'}</button>)}{selection.index===1&&<button onClick={()=>request(SERVICES[1].approach,{type:'startJob',kind:'validator'})}>Play Block Validator</button>}{selection.index===3&&<button onClick={()=>{setSelection(null);props.onTravel()}}>Choose a city</button>}</>}
   {selection.type==='plot'&&<><p className="eyebrow">PARCEL {selection.tile.x+1}, {selection.tile.y+1}</p><h2>{parcel?.identity===myIdentity?'Your estate':neighbor?`${neighbor.name}’s property`:'A little room to grow'}</h2><p className="muted">{parcel?'Owned land follows its resident NFT.':'This fenced parcel is available. Add land next to any parcel in your estate.'}</p>
    {parcel?.identity===myIdentity&&<button onClick={()=>request(frontDoor(s.home),{type:'enterHome'})}>Walk home & enter</button>}
    {neighbor&&parcel?.identity!==myIdentity&&<button disabled={!neighbor.home.open} onClick={()=>request(frontDoor(neighbor.home),{type:'enterHome',host:neighbor.identity})}>{neighbor.home.open?'Visit this home':'Home closed to visitors'}</button>}
    {!parcel&&<button disabled={!canExpand||props.pending||s.gChog<cityPrice(250,s.home.city,props.gas[s.home.city])} onClick={()=>{props.dispatch({type:'buyLand',...selection.tile});setSelection(null)}}>Buy surrounding land · {cityPrice(250,s.home.city,props.gas[s.home.city])} gCHOG</button>}
    {parcel&&parcel.identity!==myIdentity&&<form onSubmit={e=>{e.preventDefault();if(canExpand){props.dispatch({type:'offerLand',...selection.tile,amount:Number(amount)});setSelection(null)}}}><label>Offer in gCHOG<input type="number" min={1} max={s.gChog} step={1} value={amount} onChange={e=>setAmount(e.target.value)}/></label><button disabled={!canExpand||props.pending||!Number.isSafeInteger(Number(amount))||Number(amount)<=0||Number(amount)>s.gChog}>Make an offer</button><p className="muted">The amount is held until acceptance, rejection or cancellation. Offers expire after 24 hours; cancel to reclaim held funds.</p></form>}
    {!canExpand&&parcel?.identity!==myIdentity&&<p className="muted">Only land touching your existing estate can be purchased or offered on.</p>}
   </>}
   {selection.type==='neighbor'&&<><ChogAvatar appearance={selection.neighbor.appearance} tier="common"/><h2>{selection.neighbor.name}</h2><p className="muted">Walk close enough to connect. Both residents gain social, with a short cooldown.</p>{(['wave','chat','high-five']as const).map(gesture=><button key={gesture} onClick={()=>{const target=selection.neighbor.location.tile;const approach=[{x:target.x+1,y:target.y},{x:target.x-1,y:target.y},{x:target.x,y:target.y+1},{x:target.x,y:target.y-1}].find(t=>streetPath(s.location.tile,t)!==null);if(approach)request(approach,{type:'gesture',recipient:selection.neighbor.identity,gesture})}}> {gesture==='wave'?'Wave hello':gesture==='chat'?'Have a chat':'High five'}</button>)}</>}
  </></StreetDialog>}
 </section>
})
function StreetDialog({onClose,children}:{onClose():void;children:React.ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[])
 return <dialog className="street-dialog" ref={dialog} aria-label="Neighborhood actions" onCancel={onClose}><button className="dialog-close" aria-label="Close neighborhood actions" onClick={onClose}>×</button>{children}<button onClick={onClose}>Close</button></dialog>
}
export default WorldNeighborhood
