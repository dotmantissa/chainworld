import type Phaser from 'phaser'
import {CameraGestures,type CameraView,type CameraCommand} from './cameraControls'
export class WorldCamera {
 private panMode=false
 private gestures:CameraGestures
 constructor(private scene:Phaser.Scene,private resetView:()=>void,private onChange:(view:CameraView)=>void,private min=.35,private max=3.5){
  const canvas=scene.game.canvas;canvas.tabIndex=0
  this.gestures=new CameraGestures(canvas,{
   zoomBy:(factor,x,y)=>{
    const camera=scene.cameras.main,old=camera.zoom,zoom=Math.max(this.min,Math.min(this.max,old*factor)),rect=canvas.getBoundingClientRect()
    camera.stopFollow();camera.setZoom(zoom)
    camera.scrollX+=(x*camera.width/rect.width-camera.width/2)*(1/old-1/zoom)
    camera.scrollY+=(y*camera.height/rect.height-camera.height/2)*(1/old-1/zoom)
    this.publish()
   },
   panBy:(dx,dy)=>{const camera=scene.cameras.main,rect=canvas.getBoundingClientRect();camera.stopFollow();camera.scrollX+=dx*camera.width/rect.width/camera.zoom;camera.scrollY+=dy*camera.height/rect.height/camera.zoom;this.publish()},
   reset:()=>{this.panMode=false;resetView();this.publish()},
   setPanMode:value=>{this.panMode=value;this.publish()},view:()=>({zoom:scene.cameras.main.zoom,panMode:this.panMode}),
  })
  resetView();this.publish();scene.events.once('shutdown',()=>this.gestures.destroy())
 }
 private publish(){const canvas=this.scene.game.canvas,camera=this.scene.cameras.main;canvas.style.cursor=this.panMode?'grab':'default';canvas.dataset.cameraZoom=camera.zoom.toFixed(3);canvas.dataset.cameraX=camera.scrollX.toFixed(2);canvas.dataset.cameraY=camera.scrollY.toFixed(2);canvas.dataset.panMode=String(this.panMode);this.onChange({zoom:camera.zoom,panMode:this.panMode})}
 canSelect(){return this.gestures.canSelect()}
 command(command:CameraCommand){this.gestures.command(command)}
}
