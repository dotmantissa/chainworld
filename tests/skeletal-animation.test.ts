import {readFileSync} from 'node:fs'
import {installCharacterMesh} from '../src/world/skeleton/characterAssets'
import manifest from '../src/world/skeleton/character-manifest.json'
import {describe,it,expect} from 'vitest'
import {HumanRig,RIG_ACTIVITIES} from '../src/world/skeleton/HumanRig'
import {ACTIONS} from '../src/game/gameEngine'
for(const[name,file]of Object.entries(manifest)){const data=readFileSync('public'+file.url);installCharacterMesh(name,data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer)}
describe('weighted skeletal animation',()=>{
 it('binds the full body, hands and face to a real hierarchical skeleton',()=>{
  const rig=new HumanRig({seed:21,gender:'female'});expect(rig.mesh.isSkinnedMesh).toBe(true);expect(rig.bones.length).toBe(26)
  expect(rig.joints.LeftHand.parent).toBe(rig.joints.LeftForeArm);expect(rig.joints.LeftShin.parent).toBe(rig.joints.LeftThigh)
  const g=rig.mesh.geometry;expect(g.getAttribute('skinWeight').count).toBe(g.getAttribute('position').count)
  const used=new Set(Array.from(g.getAttribute('skinIndex').array).filter((_,i)=>i%4===0));expect(used.size).toBeGreaterThan(22);rig.dispose()
 })
 it('covers every game action and changes actual bone transforms and skinned vertices through its cycle',()=>{
  const rig=new HumanRig({seed:2,gender:'male'});for(const kind of Object.keys(ACTIONS))expect(RIG_ACTIVITIES).toContain(kind)
  for(const activity of RIG_ACTIVITIES){
   rig.pose(activity,.2);const before=rig.bones.map(b=>b.quaternion.toArray()),vertices=Array.from({length:50},(_,i)=>rig.vertex(Math.floor(i*rig.mesh.geometry.getAttribute('position').count/50)).toArray())
   rig.pose(activity,.8);expect(rig.bones.filter((b,i)=>b.quaternion.toArray().some((n,j)=>Math.abs(n-before[i][j])>1e-5)).length,activity).toBeGreaterThan(1)
   const after=Array.from({length:50},(_,i)=>rig.vertex(Math.floor(i*rig.mesh.geometry.getAttribute('position').count/50)).toArray());expect(after.some((p,i)=>p.some((n,j)=>Math.abs(n-vertices[i][j])>1e-5)),activity).toBe(true);expect(after.flat().every(Number.isFinite)).toBe(true)
  }rig.dispose()
 })
 it('holds readable action poses with reduced motion while keeping walk and seated anatomy distinct',()=>{
  const rig=new HumanRig({seed:0,gender:'neutral'});rig.pose('shower',1,0,true);const before=rig.bones.map(b=>b.quaternion.toArray());rig.pose('shower',20,0,true);expect(rig.bones.map(b=>b.quaternion.toArray())).toEqual(before)
  rig.pose('work',1);expect(rig.joints.LeftThigh.rotation.x).toBeLessThan(-1);rig.pose('idle',1);expect(rig.joints.LeftThigh.rotation.x).toBe(0);rig.dispose()
 })
})
