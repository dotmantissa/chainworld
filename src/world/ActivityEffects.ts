import type Phaser from 'phaser'
import type {ActionKind} from '../game/types'
import type {Furniture} from '../game/housing'
import {furnitureView} from './furnitureView'

const GLYPHS:Partial<Record<ActionKind,string>>={sleep:'Z z z',rest:'Z z z',socialize:'♡',unwind:'♪',relax:'♪',wash:'≈',shower:'≈',eat:'◒',snack:'◒',eatLeftovers:'◒',cookBreakfast:'♨',cookStew:'♨',work:'⌘',focus:'⌘',practiceCoding:'⌘',hermit:'⌘',paint:'✎',npcHangout:'♡'}
export const activityGlyph=(kind:ActionKind)=>GLYPHS[kind]??''
/** Physical props are attached to the selected object, never to a save/network state. */
export class ActivityEffects {
 private graphics:Phaser.GameObjects.Graphics
 constructor(scene:Phaser.Scene){this.graphics=scene.add.graphics()}
 render(kind:ActionKind|undefined,object:Furniture|undefined,human:{x:number;y:number},time:number,reduced:boolean){
  const g=this.graphics;g.clear().setDepth(human.y+7);if(!kind)return
  const phase=reduced?0:time/800
  if(['eat','snack','eatLeftovers'].includes(kind)){
   const x=human.x+7,y=human.y-43;g.fillStyle(0xfff7e5).fillEllipse(x,y,15,6).lineStyle(1,0xc8b9a1).strokeEllipse(x,y,15,6)
   g.fillStyle(0xbb8355).fillEllipse(x,y-1,8,3);g.lineStyle(1.5,0x8a837a).lineBetween(x+5,y-2,x+8+(reduced?0:Math.sin(phase*3)*2),y-11)
  }
  if(!object)return
  const v=furnitureView(object),sign=v.flipX?-1:1
  const washing=kind==='wash',showering=kind==='shower',cooking=kind==='cookBreakfast'||kind==='cookStew'
  if(washing||cooking){
   const x=v.x+sign*v.width*(washing?-.2:.2),y=v.y+v.baseY-v.height*.55
   if(washing)g.lineStyle(2,0x9fcbd6,.75).lineBetween(x,y-13,x,y-3)
   if(!reduced)for(let i=0;i<4;i++){const p=(phase+i/4)%1;g.fillStyle(washing?0xa7d7e1:0xfff6dd,(1-p)*.8).fillEllipse(x+Math.sin(p*5+i)*4,y+(washing?p*8:-p*26),washing?1.6:3,washing?3:5)}
  }
  if(showering){
   // Warm vapor rises beyond the enclosure and drifts across the bathroom opening.
   for(let i=0;i<14;i++){const p=reduced?.45:(phase*.35+i/14)%1;g.fillStyle(0xf2f2ed,(1-p)*.13).fillEllipse(human.x-18+Math.sin(i*2+p*3)*20+p*30,human.y-38-p*115,18+p*32,13+p*23)}
   g.fillStyle(0xe4eeea,.2).fillRoundedRect(human.x-23,human.y-88,46,88,5)
  }
  if(showering&&!reduced)for(let i=0;i<12;i++){const p=(phase*1.6+i/12)%1;g.lineStyle(1.2,0xb7dae5,(1-p)*.65).lineBetween(human.x-12+i%5*6,human.y-92+p*70,human.x-12+i%5*6,human.y-87+p*70)}
  if(['work','focus','practiceCoding','hermit'].includes(kind)){
   g.fillStyle(0xffe7aa,reduced?.06:.06+Math.sin(phase*2)*.025).fillEllipse(v.x-sign*12,v.y-29,23,17)
  }
 }
}
