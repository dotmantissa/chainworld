import {BufferGeometry,Float32BufferAttribute,Uint16BufferAttribute,Color} from 'three'
import manifest from './character-manifest.json'
import type {RigIdentity} from './HumanRig'
interface MeshData {positions:Float32Array;normals:Float32Array;colors:Uint8Array;tags:Uint8Array;joints:Uint16Array;weights:Float32Array;indices:Uint16Array}
const meshes=new Map<string,MeshData>();let preparation:Promise<void>|undefined
export function installCharacterMesh(name:string,buffer:ArrayBuffer){
 const v=new DataView(buffer);if(v.byteLength<12||v.getUint32(0,true)!==0x43484f47)throw new Error('Invalid resident mesh')
 const count=v.getUint32(4,true),faces=v.getUint32(8,true);if(count>65535||v.byteLength!==12+count*21+faces*2)throw new Error('Incomplete resident mesh')
 const data:MeshData={positions:new Float32Array(count*3),normals:new Float32Array(count*3),colors:new Uint8Array(count*3),tags:new Uint8Array(count),joints:new Uint16Array(count*4),weights:new Float32Array(count*4),indices:new Uint16Array(faces)}
 for(let i=0;i<count;i++){let at=12+i*21;for(let k=0;k<3;k++){data.positions[i*3+k]=v.getInt16(at,true)/10000;at+=2}for(let k=0;k<3;k++)data.normals[i*3+k]=v.getInt8(at++)/127;data.tags[i]=v.getUint8(at++);for(let k=0;k<3;k++)data.colors[i*3+k]=v.getUint8(at++);for(let k=0;k<4;k++)data.joints[i*4+k]=v.getUint8(at++);for(let k=0;k<4;k++)data.weights[i*4+k]=v.getUint8(at++)/255}
 for(let i=0;i<faces;i++)data.indices[i]=v.getUint16(12+count*21+i*2,true);meshes.set(name,data)
}
export function prepareCharacterArt(){if(!preparation)preparation=Promise.all(Object.entries(manifest).map(async([name,file])=>{if(meshes.has(name))return;const r=await fetch(file.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('The resident artwork could not load. Please retry.');installCharacterMesh(name,await r.arrayBuffer())})).then(()=>{}).catch(error=>{preparation=undefined;throw error});return preparation}
export function residentGeometry(identity:RigIdentity){
 const {seed,gender}=identity,female=gender==='female'||gender==='nonbinary'&&seed%2===0,body=meshes.get(female?'female':'male'),hairName=(female?['long','buns','parted','buzzed']:['parted','buzzed','long','parted'])[(seed>>>14)%4],hair=meshes.get(hairName)
 if(!body||!hair)throw new Error('Prepare resident artwork before creating a character')
 const positions=new Float32Array(body.positions.length+hair.positions.length),normals=new Float32Array(positions.length),colors=new Float32Array(positions.length),skinIndex=new Uint16Array((positions.length/3)*4),weights=new Float32Array(skinIndex.length),indices=new Uint16Array(body.indices.length+hair.indices.length)
 const skin=['#ecc2a4','#c98d69','#a66a4e','#74472f','#f0d1b9'][seed%5],shirt=['#66816b','#74738e','#b27056','#5c8094','#b6a27e'][(seed>>>8)%5],pants=['#354958','#4f5349','#4c4354'][(seed>>>5)%3],hairColor=['#2e2521','#66412b','#b08c5d','#29282b','#8a4a32'][(seed>>>12)%5],palette=[skin,shirt,pants,'#d2ccbf',hairColor,'#ffffff','#aa6b64','#ece5d5'].map(c=>new Color(c)),faceWidth=.95+(seed%11)*.01
 let vertexOffset=0,indexOffset=0
 for(const data of [body,hair]){
  positions.set(data.positions,vertexOffset*3);normals.set(data.normals,vertexOffset*3);skinIndex.set(data.joints,vertexOffset*4);weights.set(data.weights,vertexOffset*4)
  for(let i=0;i<data.tags.length;i++){
   const tag=data.tags[i],p=(vertexOffset+i)*3,x=data.positions[i*3],y=data.positions[i*3+1],color=palette[tag]??palette[0]
   if(tag===0&&y>1.5)positions[p]=x*faceWidth
   // Short styles authored for the male source need the female scalp's wider crown.
   if(data===hair&&female&&(hairName==='parted'||hairName==='buzzed')){positions[p]*=1.10;positions[p+1]=1.57+(y-1.57)*1.06+.007;positions[p+2]*=1.15}
   let detail=tag===1?1+Math.sin(y*350)*.018:tag===2?.96+Math.sin(y*90)*.018:1
   if(tag===1&&y>1.39&&Math.abs(x)<.085)detail*=.7
   for(let k=0;k<3;k++){const base=data.colors[i*3+k]/255;colors[p+k]=tag===5?[...new Color().setRGB(data.colors[i*3]/255,data.colors[i*3+1]/255,data.colors[i*3+2]/255,'srgb').toArray()][k]:[color.r,color.g,color.b][k]*base*detail}
  }
  for(let i=0;i<data.indices.length;i++)indices[indexOffset+i]=data.indices[i]+vertexOffset
  vertexOffset+=data.positions.length/3;indexOffset+=data.indices.length
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setAttribute('skinIndex',new Uint16BufferAttribute(skinIndex,4));geometry.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));geometry.setIndex(new Uint16BufferAttribute(indices,1));return geometry
}
