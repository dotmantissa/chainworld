import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react'
import {CameraGestures} from '../world/cameraControls'
import CameraControls from './CameraControls'
interface MapView {zoom:number;panMode:boolean;x:number;y:number}
const initial:MapView={zoom:1,panMode:false,x:0,y:0}
export default function PanZoomMap({children}:{children:ReactNode}){
 const host=useRef<HTMLDivElement>(null),gestures=useRef<CameraGestures>()
 const [view,setView]=useState(initial),current=useRef(view)
 useEffect(()=>{
  const element=host.current;if(!element)return
  const update=(next:MapView)=>{const maxX=element.clientWidth*Math.max(.5,next.zoom/2),maxY=element.clientHeight*Math.max(.5,next.zoom/2);next={...next,x:Math.max(-maxX,Math.min(maxX,next.x)),y:Math.max(-maxY,Math.min(maxY,next.y))};current.current=next;setView(next)}
  gestures.current=new CameraGestures(element,{
   zoomBy:(factor,x,y)=>{const s=current.current,z=Math.max(.6,Math.min(3.5,s.zoom*factor)),cx=x-element.clientWidth/2,cy=y-element.clientHeight/2;update({...s,zoom:z,x:cx+(s.x-cx)*z/s.zoom,y:cy+(s.y-cy)*z/s.zoom})},
   panBy:(dx,dy)=>update({...current.current,x:current.current.x-dx,y:current.current.y-dy}),
   reset:()=>update(initial),setPanMode:panMode=>update({...current.current,panMode}),view:()=>current.current,
  })
  return()=>{gestures.current?.destroy();gestures.current=undefined}
 },[])
 return <><CameraControls label="World map controls" view={view} onCommand={command=>gestures.current?.command(command)}/><div ref={host} className="map-viewport" tabIndex={0} aria-label="Zoomable world map" data-camera-zoom={view.zoom.toFixed(3)} data-camera-x={view.x.toFixed(2)} data-camera-y={view.y.toFixed(2)} style={{cursor:view.panMode?'grab':undefined,'--map-zoom':view.zoom} as CSSProperties} onClickCapture={event=>{if(event.detail!==0&&!gestures.current?.canSelect()){event.preventDefault();event.stopPropagation()}}}><div className="map-board" style={{transform:`translate(${view.x}px,${view.y}px) scale(${view.zoom})`}}>{children}</div></div></>
}
