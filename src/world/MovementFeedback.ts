import type Phaser from 'phaser'
import type {MotionJourney} from './motion'
import type {Tile} from './navigation'

/** Decorative route markers never intercept gestures or select game objects. */
export class MovementFeedback {
 private dots:Phaser.GameObjects.Graphics
 private marker:Phaser.GameObjects.Graphics
 constructor(scene:Phaser.Scene,private iso:(tile:Tile)=>Tile,private scale=1){this.dots=scene.add.graphics().setDepth(-190);this.marker=scene.add.graphics().setDepth(-189)}
 render(j:MotionJourney|null|undefined,index:number,time:number,reducedMotion:boolean){
  this.dots.clear();this.marker.clear()
  if(!j?.path.length||index>=j.path.length)return
  const z=this.scale
  for(const tile of j.path.slice(index)){const p=this.iso(tile);this.dots.fillStyle(0xfffbeb,.85).fillEllipse(p.x,p.y,4*z,2.5*z)}
  const p=this.iso(j.path[j.path.length-1]),pulse=reducedMotion?1:1+Math.sin(time/180)*.12
  this.marker.lineStyle(2*z,0xa075bf,.95).strokeEllipse(p.x,p.y,24*z*pulse,12*z*pulse)
  this.marker.fillStyle(0xc5a5d9,.22).fillEllipse(p.x,p.y,24*z,12*z)
 }
}
