import {Bone} from 'three'
export function createHumanSkeleton(){
 const bones:Bone[]=[],joints:Record<string,Bone>={}
 const make=(name:string,parent:string|undefined,x:number,y:number,z:number)=>{const bone=new Bone();bone.name=name;bone.position.set(x,y,z);bones.push(bone);joints[name]=bone;if(parent)joints[parent].add(bone);return bone}
 make('hips',undefined,0,.91,0);make('spine','hips',0,.15,0);make('chest','spine',0,.22,0);make('neck','chest',0,.17,0);make('head','neck',0,.12,0);make('jaw','head',0,-.04,.025)
 for(const [side,sign]of [['Left',1],['Right',-1]] as const){
  make(`${side}Shoulder`,'chest',sign*.14,.15,0);make(`${side}Arm`,`${side}Shoulder`,sign*.065,-.005,0);make(`${side}ForeArm`,`${side}Arm`,0,-.27,0);make(`${side}Hand`,`${side}ForeArm`,0,-.25,0);make(`${side}Fingers`,`${side}Hand`,0,-.075,.012);make(`${side}Thumb`,`${side}Hand`,sign*-.035,-.02,.025)
  make(`${side}Thigh`,'hips',sign*.105,.02,0);make(`${side}Shin`,`${side}Thigh`,0,-.40,0);make(`${side}Foot`,`${side}Shin`,0,-.45,0);make(`${side}Toe`,`${side}Foot`,0,-.035,.12)
 }joints.hips.updateWorldMatrix(true,true);return {bones,joints}
}
