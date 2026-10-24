import {Bone,Skeleton,SkinnedMesh,BufferGeometry,Float32BufferAttribute,Uint16BufferAttribute,MeshStandardMaterial,SphereGeometry,Vector3,Color,Group,Mesh,BoxGeometry} from 'three'
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
  const make=(name:string,parent:string|undefined,x:number,y:number,z:number)=>{const bone=new Bone();bone.name=name;bone.position.set(x,y,z);this.bones.push(bone);this.joints[name]=bone;this.rest.set(bone,bone.position.clone());if(parent)this.joints[parent].add(bone);return bone}
  make('hips',undefined,0,.91,0);make('spine','hips',0,.15,0);make('chest','spine',0,.22,0);make('neck','chest',0,.17,0);make('head','neck',0,.12,0);make('jaw','head',0,-.04,.025)
  for(const [side,sign]of [['Left',1],['Right',-1]] as const){
   make(`${side}Shoulder`,'chest',sign*.17,.04,0);make(`${side}Arm`,`${side}Shoulder`,sign*.055,-.025,0);make(`${side}ForeArm`,`${side}Arm`,0,-.27,0);make(`${side}Hand`,`${side}ForeArm`,0,-.25,0)
   make(`${side}Fingers`,`${side}Hand`,0,-.075,.012);make(`${side}Thumb`,`${side}Hand`,sign*-.035,-.02,.025)
   make(`${side}Thigh`,'hips',sign*.105,-.03,0);make(`${side}Shin`,`${side}Thigh`,0,-.40,0);make(`${side}Foot`,`${side}Shin`,0,-.40,0);make(`${side}Toe`,`${side}Foot`,0,-.035,.12)
  }
  const skin=['#e7b99c','#c98c69','#a66c4c','#784d36','#f0cdb7'][identity.seed%5],shirt=['#5a796b','#6b668d','#a8644f','#587c94','#c4a16a'][(identity.seed>>>8)%5],pants=['#394856','#4c4e47','#4c4052'][(identity.seed>>>5)%3],hair=['#302a25','#674531','#a77c4b','#24252a'][(identity.seed>>>12)%4]
  const positions:number[]=[],normals:number[]=[],colors:number[]=[],indices:number[]=[],weights:number[]=[],skinIndices:number[]=[]
  this.joints.hips.updateWorldMatrix(true,true)
  const ellipsoid=(joint:string,offset:Vector3,radius:Vector3,color:string)=>{
   const bone=this.joints[joint],index=this.bones.indexOf(bone),geometry=new SphereGeometry(1,12,10),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),origin=bone.getWorldPosition(new Vector3()).add(offset),base=positions.length/3,c=new Color(color)
   for(let i=0;i<p.count;i++){positions.push(origin.x+p.getX(i)*radius.x,origin.y+p.getY(i)*radius.y,origin.z+p.getZ(i)*radius.z);const normal=new Vector3(n.getX(i)/radius.x,n.getY(i)/radius.y,n.getZ(i)/radius.z).normalize();normals.push(normal.x,normal.y,normal.z);colors.push(c.r,c.g,c.b);const parent=bone.parent instanceof Bone?this.bones.indexOf(bone.parent):index,blend=parent===index?0:Math.max(0,p.getY(i))*.16;skinIndices.push(index,parent,0,0);weights.push(1-blend,blend,0,0)}
   for(const i of geometry.index!.array)indices.push(base+i);geometry.dispose()
  }
  const part=(joint:string,x:number,y:number,z:number,rx:number,ry:number,rz:number,color:string)=>ellipsoid(joint,new Vector3(x,y,z),new Vector3(rx,ry,rz),color)
  const female=identity.gender==='female'
  part('hips',0,0,0,female?.18:.17,.16,.105,pants);// A continuous shirt surface blends across the spine/chest bones.
  (()=>{const c=new Color(shirt),base=positions.length/3,rings=[[.96,.15,.10],[1.05,.155,.105],[1.19,female?.165:.18,.11],[1.33,female?.18:.20,.105],[1.41,.145,.085]];for(let r=0;r<rings.length;r++){const[y,rx,rz]=rings[r],blend=Math.max(0,Math.min(1,(y-1.1)/.25));for(let j=0;j<=16;j++){const theta=j/16*Math.PI*2;positions.push(Math.cos(theta)*rx,y,Math.sin(theta)*rz);normals.push(Math.cos(theta),0,Math.sin(theta));colors.push(c.r,c.g,c.b);skinIndices.push(this.bones.indexOf(this.joints.spine),this.bones.indexOf(this.joints.chest),0,0);weights.push(1-blend,blend,0,0);if(r&&j){const i=base+r*17+j;indices.push(i,i-18,i-1,i,i-17,i-18)}}}})()
  part('chest',0,.125,0,.145,.035,.085,shirt)
  part('neck',0,.035,0,.055,.07,.05,skin);part('head',0,.055,0,.108,.145,.105,skin);part('jaw',0,-.03,.005,.075,.06,.065,skin)
  part('head',0,.14,-.017,.114,.08,.112,hair);part('head',-.095,.05,-.01,.028,.085,.08,hair);part('head',.095,.05,-.01,.028,.085,.08,hair)
  if(female)part('head',0,.015,-.075,.115,.18,.07,hair)
  part('head',0,.03,.103,.023,.035,.03,skin)
  for(const sign of [-1,1]){part('head',sign*.043,.066,.093,.018,.009,.013,'#f6f3e8');part('head',sign*.043,.065,.105,.007,.007,.007,'#35443f');part('head',sign*.044,.09,.097,.029,.006,.01,hair);part('head',sign*.106,.045,0,.022,.035,.02,skin)}
  part('jaw',0,-.015,.067,.022,.004,.006,'#995e53')
  for(const side of ['Left','Right']){
   part(`${side}Arm`,0,-.07,0,.056,.11,.058,shirt);part(`${side}Arm`,0,-.18,0,.048,.10,.05,skin);part(`${side}ForeArm`,0,-.12,0,.044,.14,.045,skin)
   part(`${side}Hand`,0,-.032,.006,.037,.057,.025,skin);part(`${side}Fingers`,0,-.014,.004,.03,.035,.017,skin);part(`${side}Thumb`,0,-.012,0,.015,.03,.017,skin)
   part(`${side}Thigh`,0,-.18,0,.078,.23,.08,pants);part(`${side}Shin`,0,-.18,0,.055,.22,.06,pants);part(`${side}Foot`,0,-.015,.06,.058,.047,.108,'#e2dbcd');part(`${side}Toe`,0,-.005,.005,.058,.035,.055,'#e2dbcd')
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setAttribute('skinIndex',new Uint16BufferAttribute(skinIndices,4));geometry.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));geometry.setIndex(indices)
  this.mesh=new SkinnedMesh(geometry,new MeshStandardMaterial({vertexColors:true,roughness:.8}));this.mesh.add(this.joints.hips);this.mesh.bind(new Skeleton(this.bones));this.mesh.frustumCulled=false;this.root.add(this.mesh)
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
   this.root.rotation.x=-Math.PI/2;this.root.position.set(0,.2,.9);a('LeftThigh',-.12);a('RightThigh',-.22);a('RightShin',.32);hands(-.35,.15);a('head',0,-.18);a('spine',Math.sin(t*1.5)*.02)
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
