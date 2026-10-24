import {residentGeometry} from './characterAssets'
import {createHumanSkeleton} from './structure'
import {Bone,Skeleton,SkinnedMesh,MeshStandardMaterial,Vector3,Group,Mesh,BoxGeometry} from 'three'
import {seedOf} from '../../game/housing'
import type {ActionKind,GameState} from '../../game/types'
export type RigActivity=ActionKind|'idle'|'walking'|'validator'|'grifter'|'pet'|'feed'|'play'
export const RIG_ACTIVITIES:RigActivity[]=['idle','walking','eat','snack','rest','sleep','socialize','unwind','work','focus','hermit','wash','shower','relax','cookBreakfast','cookStew','eatLeftovers','practiceCoding','paint','npcHangout','validator','grifter','pet','feed','play']
export interface RigIdentity {seed:number;gender:string}
export const rigIdentity=(s:Pick<GameState,'collection'|'tokenId'|'appearance'|'profile'>):RigIdentity=>({seed:seedOf(`${s.collection}:${s.tokenId}:${s.appearance.sourceImage??''}:${s.appearance.headTrait}:${s.appearance.bodyTrait}:${s.appearance.eyeTrait}`),gender:s.profile.gender})
/** A genuine weighted humanoid mesh. All body surfaces share a bound skeleton, including fingers and face. */
export class HumanRig {
 readonly root=new Group();readonly bones:Bone[]=[];readonly joints:Record<string,Bone>={};readonly mesh:SkinnedMesh
 private rest=new Map<Bone,Vector3>();private props:Mesh[]=[]
 constructor(identity:RigIdentity){
  const skeleton=createHumanSkeleton();this.bones.push(...skeleton.bones);Object.assign(this.joints,skeleton.joints);for(const bone of this.bones)this.rest.set(bone,bone.position.clone())
  this.mesh=new SkinnedMesh(residentGeometry(identity),new MeshStandardMaterial({vertexColors:true,roughness:.72}));this.mesh.add(this.joints.hips);this.mesh.bind(new Skeleton(this.bones));this.mesh.frustumCulled=false;this.root.add(this.mesh)
  const prop=(bone:string,dimensions:number[],color:string,offset:number[])=>{const item=new Mesh(new BoxGeometry(...dimensions as [number,number,number]),new MeshStandardMaterial({color,roughness:.7}));item.position.set(...offset as [number,number,number]);this.joints[bone].add(item);this.props.push(item)}
  prop('LeftHand',[.15,.025,.21],'#d6c4a0',[0,-.03,.055]);prop('RightHand',[.065,.12,.025],'#35495c',[0,-.02,.03]);prop('RightHand',[.018,.22,.018],'#b49663',[0,-.02,.065])
  this.pose('idle',0)
 }
 pose(activity:RigActivity,seconds:number,facing=0,reduced=false,stance:'auto'|'seated'|'standing'='auto'){
  const t=reduced?1:seconds,s=Math.sin(t*3),fast=Math.sin(t*9),a=(name:string,x=0,y=0,z=0)=>this.joints[name].rotation.set(x,y,z)
  this.root.position.set(0,0,0);this.root.rotation.set(0,[0,Math.PI/2,Math.PI,-Math.PI/2][facing%4],0)
  for(const bone of this.bones){bone.rotation.set(0,0,0);bone.position.copy(this.rest.get(bone)!)}
  for(const p of this.props)p.visible=false
  a('LeftArm',0,0,.08);a('RightArm',0,0,-.08);a('chest',Math.sin(t*1.6)*.012);a('head',0,Math.sin(t*.8)*.04)
  const seated=()=>{a('LeftThigh',-1.45);a('RightThigh',-1.45);a('LeftShin',1.45);a('RightShin',1.45);this.joints.hips.position.y=.58}
  const hands=(x:number,z=0)=>{a('LeftArm',x,0,z+.12);a('RightArm',x,0,-z-.12);a('LeftForeArm',-.9);a('RightForeArm',-.9)}
  if(activity==='walking'){
   const stride=Math.sin(t*8);a('LeftThigh',stride*.58);a('RightThigh',-stride*.58);a('LeftShin',Math.max(0,-stride)*.95);a('RightShin',Math.max(0,stride)*.95);a('LeftFoot',-stride*.18);a('RightFoot',stride*.18);a('LeftArm',-stride*.4,0,.07);a('RightArm',stride*.4,0,-.07);a('LeftForeArm',-.2);a('RightForeArm',-.2);this.joints.hips.position.y+=Math.abs(Math.cos(t*8))*.025;a('hips',0,stride*.05)
  }else if(activity==='sleep'||activity==='rest'){
   this.root.rotation.x=-Math.PI/2;this.root.position.set(0,.2,.9);a('LeftThigh',-.12);a('RightThigh',-.22);a('RightShin',.32);a('LeftArm',-.10,0,.13);a('RightArm',-.16,0,-.13);a('LeftForeArm',-.18);a('RightForeArm',-.24);a('head',0,-.18);a('spine',Math.sin(t*1.5)*.02)
  }else if(['work','focus','hermit','practiceCoding','validator','grifter'].includes(activity)){
   seated();a('spine',.10);hands(-.65);a('LeftForeArm',-.95+fast*.1);a('RightForeArm',-1+Math.cos(t*10)*.12);a('LeftHand',fast*.15);a('RightHand',-fast*.15);a('LeftFingers',.2+fast*.25);a('RightFingers',.2-fast*.25);a('head',.12,s*.05)
  }else if(['eat','snack','eatLeftovers'].includes(activity)){
   hands(-.45);a('LeftForeArm',-1.35);a('RightArm',-.75-s*.22);a('RightForeArm',-1.15-s*.5);a('RightHand',0,0,s*.13);a('head',s*.06);a('jaw',Math.max(0,fast)*.1);this.props[0].visible=true
  }else if(activity==='wash'){
   a('spine',.25);hands(-.7);a('LeftForeArm',-.7+s*.18);a('RightForeArm',-.7-s*.18);a('LeftHand',0,s*.4,.1);a('RightHand',0,-s*.4,-.1);a('head',.2)
  }else if(activity==='shower'){
   const scrub=(Math.sin(t*1.3)+1)/2;hands(-1.2-scrub*.5,.2);a('LeftForeArm',-1.1-scrub*.4);a('RightForeArm',-1.25-scrub*.3);a('LeftHand',fast*.2);a('RightHand',-fast*.2);a('chest',.05,s*.12);a('head',-.12,s*.2);a('LeftThigh',s*.06);a('RightShin',Math.max(0,s)*.12)
  }else if(activity==='cookBreakfast'||activity==='cookStew'){
   hands(-.6);a('RightForeArm',-.8+s*.25,Math.cos(t*3)*.2);a('RightHand',s*.2,0,Math.cos(t*3)*.25);a('LeftForeArm',-.85);a('head',.22);a('chest',.08,s*.04);this.props[2].visible=true
  }else if(activity==='socialize'){
   a('RightArm',-.65,0,-.2);a('RightForeArm',-2.1);a('RightHand',0,.4);a('LeftArm',-.2+s*.15,0,.25);a('LeftForeArm',-1+s*.3);a('head',0,s*.09);a('jaw',Math.max(0,fast)*.05);this.props[1].visible=true
  }else if(activity==='unwind'||activity==='relax'){
   seated();hands(-.5);a('LeftForeArm',-1.2);a('RightForeArm',-1.2+s*.1);a('head',.22,s*.04);a('spine',activity==='relax'?-.16:.05);this.props[0].visible=activity==='unwind'
  }else if(activity==='paint'){
   seated();hands(-.65);a('LeftForeArm',-1.2);a('RightForeArm',-1+s*.15);a('RightHand',Math.cos(t*4)*.2,s*.2);a('head',.23);this.props[0].visible=true;this.props[2].visible=true
  }else if(['pet','feed','play'].includes(activity)){
   a('hips',.55);a('LeftThigh',-.5);a('RightThigh',-.35);a('LeftShin',.7);a('RightShin',.45);this.joints.hips.position.y=.72;hands(-.7+s*.2);a('RightForeArm',-.3+s*.2);a('head',.3);if(activity==='play')a('RightArm',-1.2+s*.7)
  }else if(activity==='npcHangout'){
   a('LeftArm',-.4+s*.18,0,.35);a('RightArm',-.2-s*.15,0,-.25);a('LeftForeArm',-1.1+s*.35);a('RightForeArm',-.8-s*.3);a('head',s*.08,Math.sin(t*2)*.15);a('jaw',Math.max(0,fast)*.06);a('hips',0,s*.04)
  }
  if(stance==='seated'&&activity!=='sleep'&&activity!=='rest')seated()
  if(stance==='standing'&&['work','focus','hermit','practiceCoding','validator','grifter','unwind','relax','paint'].includes(activity)){this.joints.hips.position.y=.91;for(const side of ['Left','Right']){a(`${side}Thigh`);a(`${side}Shin`)}}
  this.root.updateMatrixWorld(true);this.mesh.skeleton.update()
 }
 dispose(){this.mesh.skeleton.dispose();this.mesh.geometry.dispose();(this.mesh.material as MeshStandardMaterial).dispose();for(const prop of this.props){prop.geometry.dispose();(prop.material as MeshStandardMaterial).dispose()}}
 /** CPU skinning diagnostic also works without a WebGL context. */
 vertex(index:number){return this.mesh.applyBoneTransform(index,new Vector3().fromBufferAttribute(this.mesh.geometry.getAttribute('position'),index))}
}
