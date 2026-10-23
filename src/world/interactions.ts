import type { ActionKind, GameState } from '../game/types'
import {lifeActionReason} from '../game/life'
import { ACTIONS } from '../game/gameEngine'
export type FurnitureKind='eat'|'rest'|'work'|'socialize'|'pet'|'decor'
export const INTERACTIONS:Record<FurnitureKind,{title:string;description:string;image:string;actions:{kind:ActionKind;benefit:string}[]}>= {
  pet:{title:'Your Chog companion',description:'A little care goes a long way. Your pet and your household grow together.',image:'',actions:[]},
  decor:{title:'A little personality',description:'This furnishing belongs to your household. Move it, store it or change its place in Build & Buy.',image:'',actions:[]},
  eat:{title:'The kitchen',description:'Something good, made right here at home.',image:'/art/kitchen.webp',actions:[{kind:'eat',benefit:'+35 hunger'},{kind:'snack',benefit:'+15 hunger'},{kind:'wash',benefit:'+60 hygiene · use the sink'},{kind:'cookBreakfast',benefit:'Uses 1 oats + 1 fruit · +15 cooking XP · makes a meal'},{kind:'cookStew',benefit:'Uses 1 rice + 2 vegetables · cooking level 1 · makes a meal'},{kind:'eatLeftovers',benefit:'Eat your oldest fresh meal · restores hunger and comfort'}]},
  rest:{title:'Your bed',description:'Set the world aside for a while. Rest is always free.',image:'/art/bed.webp',actions:[{kind:'rest',benefit:'+40 energy, plus your home bonus'},{kind:'sleep',benefit:'Fully restore energy'}]},
  work:{title:'The workstation',description:'Pull up a chair and turn a little effort into a better life.',image:'/art/workstation.webp',actions:[{kind:'work',benefit:'100 base gCHOG · 10 energy'},{kind:'focus',benefit:'250 base gCHOG · 20 energy'},{kind:'practiceCoding',benefit:'+15 programming XP · 5 energy'},{kind:'hermit',benefit:'Passive income every full minute · 10 energy per minute'}]},
  socialize:{title:'The reading nook',description:'A comfortable seat, a familiar voice, a moment for yourself.',image:'/art/social.webp',actions:[{kind:'socialize',benefit:'Restore social using your charisma'},{kind:'unwind',benefit:'+20 energy · +35 fun · +15 comfort'},{kind:'relax',benefit:'+40 comfort · +15 fun'},{kind:'paint',benefit:'+30 fun · +15 creativity XP · 5 energy'}]},
}
export function furnitureFor(kind:ActionKind):FurnitureKind {
  if(kind==='eat'||kind==='snack'||kind==='wash'||kind==='cookBreakfast'||kind==='cookStew'||kind==='eatLeftovers')return'eat'
  if(kind==='rest'||kind==='sleep')return'rest'
  if(kind==='work'||kind==='focus'||kind==='hermit'||kind==='practiceCoding')return'work'
  return'socialize'
}
export function unavailableReason(s:GameState,kind:ActionKind,cost=ACTIONS[kind].cost):string|null {
  if(s.gChog<cost)return'Not enough gCHOG'
  if((s.cooldowns[kind]??0)>s.lastSaved)return'Cooling down'
  const energy=kind==='focus'?20:kind==='work'||kind==='hermit'?10:0
  if(s.meters.energy<energy)return`Needs ${energy} energy — rest first`
  return lifeActionReason(s,kind)
}
