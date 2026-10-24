import {Scene,OrthographicCamera,WebGLRenderer,AmbientLight,DirectionalLight,SRGBColorSpace,Color,Vector3,Quaternion} from 'three'
import type Phaser from 'phaser'
import {HumanRig,type RigIdentity,type RigActivity} from './HumanRig'
/** One renderer per Phaser scene, shared by its residents and guests. */
export class RigRenderer {
 private renderer?:WebGLRenderer;private cpuCanvas?:HTMLCanvasElement;private scene=new Scene();private camera=new OrthographicCamera(-1.12,1.12,1.12,-1.12,.1,20);private actors=new Set<RigSprite>()
 constructor(private phaser:Phaser.Scene){
  try{this.renderer=new WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setSize(256,256);this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=SRGBColorSpace;this.renderer.setClearColor(new Color(0),0)}catch{this.cpuCanvas=document.createElement('canvas');this.cpuCanvas.width=this.cpuCanvas.height=256}
  this.camera.position.set(3,2.6,4);this.camera.lookAt(0,.9,0);this.scene.add(new AmbientLight(0xffffff,2));const light=new DirectionalLight(0xffeed7,3);light.position.set(-3,6,5);this.scene.add(light)
  phaser.game.canvas.dataset.animationBackend=this.renderer?'skinned-mesh':'skinned-mesh-cpu';phaser.events.once('shutdown',()=>this.destroy())
 }
 create(identity:RigIdentity,height=125){const actor=new RigSprite(this.phaser,this,identity,height);this.actors.add(actor);return actor}
 forget(actor:RigSprite){this.actors.delete(actor)}
 draw(actor:RigSprite){this.scene.add(actor.rig.root);if(this.renderer)this.renderer.render(this.scene,this.camera);else this.drawCpu(actor);const c=actor.context;c.clearRect(0,0,256,256);c.filter=actor.private?'blur(6px)':'none';c.drawImage(this.renderer?.domElement??this.cpuCanvas!,0,0);c.filter='none';actor.texture.refresh();this.scene.remove(actor.rig.root)}
 private drawCpu(actor:RigSprite){
  // WebGL2-free devices still animate the very same weighted mesh and bones.
  const c=this.cpuCanvas!.getContext('2d')!,mesh=actor.rig.mesh,g=mesh.geometry,color=g.getAttribute('color'),index=g.index!,points:Vector3[]=[]
  this.camera.updateMatrixWorld();actor.rig.root.updateMatrixWorld(true);c.clearRect(0,0,256,256)
  for(let i=0;i<g.getAttribute('position').count;i++)points.push(actor.rig.vertex(i).applyMatrix4(mesh.matrixWorld).project(this.camera))
  const faces=Array.from({length:index.count/3},(_,i)=>[index.getX(i*3),index.getX(i*3+1),index.getX(i*3+2)]).sort((a,b)=>(points[b[0]].z+points[b[1]].z+points[b[2]].z)-(points[a[0]].z+points[a[1]].z+points[a[2]].z))
  for(const face of faces){const p=face.map(i=>points[i]),shade=new Color(color.getX(face[0]),color.getY(face[0]),color.getZ(face[0])).convertLinearToSRGB();c.fillStyle=`#${shade.getHexString()}`;c.beginPath();c.moveTo((p[0].x+1)*128,(1-p[0].y)*128);c.lineTo((p[1].x+1)*128,(1-p[1].y)*128);c.lineTo((p[2].x+1)*128,(1-p[2].y)*128);c.closePath();c.fill()}
 }
 private destroy(){for(const actor of this.actors)actor.destroy();this.renderer?.dispose();this.renderer?.forceContextLoss()}
}
let nextId=0
export class RigSprite {
 readonly rig:HumanRig;readonly image:Phaser.GameObjects.Image;readonly texture:Phaser.Textures.CanvasTexture;readonly context:CanvasRenderingContext2D;private lastAt=-Infinity;private lastActivity:RigActivity='idle';private transitionAt=-Infinity;private previousRoot={rotation:new Quaternion(),position:new Vector3()};private previousPose:{rotation:import('three').Quaternion;position:Vector3}[]=[];private activity:RigActivity='idle';private facing=-1;private reduced=false;private disposed=false;private privacy=false
 get private(){return this.privacy}
 constructor(private scene:Phaser.Scene,private renderer:RigRenderer,identity:RigIdentity,height:number){
  this.rig=new HumanRig(identity);this.texture=scene.textures.createCanvas(`skeletal-${++nextId}`,256,256)!;this.context=this.texture.context;this.image=scene.add.image(0,0,this.texture.key).setDisplaySize(height,height).setOrigin(.5,.82);renderer.draw(this)
  scene.game.canvas.dataset.skeletonBones=String(this.rig.bones.length)
 }
 update(activity:RigActivity,time:number,facing=0,reduced=false,privacy=false,stance:'auto'|'seated'|'standing'='auto'){
  if(this.disposed)return
  if(time-this.lastAt<1000/(activity==='idle'?6:18)&&activity===this.activity&&facing===this.facing&&privacy===this.privacy)return
  if(activity!==this.lastActivity||facing!==this.facing){this.previousRoot={rotation:this.rig.root.quaternion.clone(),position:this.rig.root.position.clone()};this.previousPose=this.rig.bones.map(b=>({rotation:b.quaternion.clone(),position:b.position.clone()}));this.transitionAt=time;this.lastActivity=activity}
  this.lastAt=time;this.activity=activity;this.facing=facing;this.reduced=reduced;this.privacy=privacy;this.rig.pose(activity,time/1000,facing,this.reduced,stance);const blend=reduced?1:Math.min(1,(time-this.transitionAt)/180);if(blend<1){const target=this.rig.root.quaternion.clone();this.rig.root.quaternion.copy(this.previousRoot.rotation).slerp(target,blend);this.rig.root.position.lerp(this.previousRoot.position,1-blend);this.rig.bones.forEach((b,i)=>{const target=b.quaternion.clone();b.quaternion.copy(this.previousPose[i].rotation).slerp(target,blend);b.position.lerp(this.previousPose[i].position,1-blend)});this.rig.root.updateMatrixWorld(true);this.rig.mesh.skeleton.update()}this.renderer.draw(this)
 }
 destroy(){if(this.disposed)return;this.disposed=true;this.renderer.forget(this);this.rig.dispose();this.image.destroy();this.scene.textures.remove(this.texture.key)}
}
