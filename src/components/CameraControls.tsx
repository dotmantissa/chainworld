import type {CameraCommand,CameraView} from '../world/cameraControls'
export default function CameraControls({label,view,onCommand}:{label:string;view:CameraView;onCommand(command:CameraCommand):void}){
 return <div className="camera-controls" role="group" aria-label={label}>
  <div><button aria-label="Zoom out" title="Zoom out (−)" onClick={()=>onCommand('zoomOut')}>−</button><span className="camera-zoom" aria-label="Zoom level">{Math.round(view.zoom*100)}%</span><button aria-label="Zoom in" title="Zoom in (+)" onClick={()=>onCommand('zoomIn')}>+</button></div>
  <button aria-label="Pan mode" aria-pressed={view.panMode} onClick={()=>onCommand('panMode')}>✥ Pan</button>
  <div className="camera-arrows"><button aria-label="Pan left" onClick={()=>onCommand('left')}>←</button><button aria-label="Pan up" onClick={()=>onCommand('up')}>↑</button><button aria-label="Pan down" onClick={()=>onCommand('down')}>↓</button><button aria-label="Pan right" onClick={()=>onCommand('right')}>→</button></div>
  <button aria-label="Reset view" title="Fit view / follow resident (0)" onClick={()=>onCommand('reset')}>Center view</button>
  <small>Scroll or pinch to zoom · drag to pan · tap to interact</small>
 </div>
}
