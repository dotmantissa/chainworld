import type {ActionKind,GameState} from './types'
import {DAY_MS} from './dailyGoals'
import {identityOf} from './neighborhood'
import {seedOf} from './housing'
import {venueOf} from './places'
export const CHOG_GOODS={code:{label:'Tiny apps',action:'practiceCoding',venue:'work',service:1,price:64},art:{label:'Original prints',action:'paint',venue:'library',service:4,price:52},food:{label:'Picnic boxes',action:'cookBreakfast',venue:'cafe',service:0,price:58}} as const
export type ChogGood=keyof typeof CHOG_GOODS
export interface ChogEconomy {schema:1;materials:number;stock:Record<ChogGood,number>;level:number;producing:boolean;day:number;delivered:ChogGood[];earned:number;made:number}
export const newChogEconomy=(now:number):ChogEconomy=>({schema:1,materials:0,stock:{code:0,art:0,food:0},level:0,producing:false,day:Math.floor(now/DAY_MS),delivered:[],earned:0,made:0})
export function ensureChogEconomy(s:GameState,now=s.lastSaved):GameState{const e=s.chogEconomy??newChogEconomy(s.lastSaved);return {...s,chogEconomy:Math.floor(now/DAY_MS)>e.day?{...e,day:Math.floor(now/DAY_MS),delivered:[]}:e}}
export function chogSpecialty(s:GameState):ChogGood{const p=s.appearance.profession;return p==='dev'||p==='validator'?'code':p==='banker'?'food':p==='degen'?'art':(['code','art','food'] as const)[seedOf(`${identityOf(s)}:${s.appearance.headTrait??''}:${s.appearance.bodyTrait??''}`)%3]}
export function partnerBonus(s:GameState):number{const pet=s.household?.pet;if(!pet||pet.hunger<40||pet.energy<30||pet.affection<40||!pet.following)return 0;return Math.min(.2,Math.floor(pet.bond/10)*.02+(s.chogEconomy?.level??0)*.02)}
export function chogOrder(s:GameState,good:ChogGood){const e=s.chogEconomy??newChogEconomy(s.lastSaved),specialty=chogSpecialty(s)===good,quantity=1+seedOf(`${identityOf(s)}:${e.day}:${good}`)%2,unit=Math.round(CHOG_GOODS[good].price*(1+(specialty?.2:0)+partnerBonus(s)+e.level*.05));return {quantity,reward:quantity*unit,specialty,claimed:e.delivered.includes(good)}}
export const materialPrice=(s:GameState)=>40-(s.chogEconomy?.level??0)*4
export const workshopPrice=(s:GameState)=>120*((s.chogEconomy?.level??0)+1)
const fail=(s:GameState,lastMessage:string)=>({...s,lastMessage})
function canManage(s:GameState){return !s.buildMode&&!s.location.trip&&!s.action&&!s.job&&!s.location.journey&&!s.household?.journey&&!s.household?.pendingUse&&s.location.kind!=='visit'}
export function manageChogEconomy(s:GameState,command:{type:'buyChogMaterials'|'upgradeChogWorkshop'|'setChogProduction'|'deliverChogGoods';enabled?:boolean;good?:ChogGood},price:(n:number)=>number,now:number):GameState{
 s=ensureChogEconomy(s,now);const e=s.chogEconomy!
 if(!canManage(s))return fail(s,'Finish your activity or building before managing your Chog workshop.')
 if(command.type==='setChogProduction')return {...s,chogEconomy:{...e,producing:command.enabled===true},lastMessage:command.enabled?'Chog workshop on. Coding, sketching and breakfast cooking use one material to make a saleable good.':'Workshop paused. Ordinary practice and cooking use no workshop materials.'}
 if(command.type==='buyChogMaterials'||command.type==='upgradeChogWorkshop'){
  if(s.location.kind!=='home'||s.location.venue)return fail(s,'Return to your own home to order materials or improve the workshop.')
  const upgrade=command.type==='upgradeChogWorkshop',cost=price(upgrade?workshopPrice(s):materialPrice(s))
  if(upgrade&&e.level>=3)return fail(s,'Your Chog workshop is fully improved.')
  if(!upgrade&&e.materials>74)return fail(s,'Use some workshop materials first. Storage holds 80.')
  if(s.gChog<cost)return fail(s,'Not enough gCHOG for your Chog workshop.')
  return {...s,gChog:s.gChog-cost,chogEconomy:{...e,materials:e.materials+(upgrade?0:6),level:e.level+(upgrade?1:0),producing:upgrade?e.producing:true},lastMessage:upgrade?'Chog workshop improved. Better commissions and cheaper materials.':'Six workshop materials delivered. Make goods with your Chog at a desk, sofa or kitchen.'}
 }
 const good=command.good;if(!good||!Object.prototype.hasOwnProperty.call(CHOG_GOODS,good))return fail(s,'Choose an available Chog order.')
 const order=chogOrder(s,good),pet=s.household?.pet
 if(order.claimed)return fail(s,'This Chog household already fulfilled that order today. New orders arrive at midnight UTC.')
 if(venueOf(s.location.venue)!==CHOG_GOODS[good].venue)return fail(s,`Bring your goods to the ${CHOG_GOODS[good].venue==='work'?'workplace':CHOG_GOODS[good].venue}.`)
 if(!pet?.following)return fail(s,'Bring your Chog along to deliver your partnership order.')
 if(e.stock[good]<order.quantity)return fail(s,`Make ${order.quantity} ${CHOG_GOODS[good].label.toLowerCase()} before delivering this order.`)
 return {...s,gChog:s.gChog+order.reward,xp:s.xp+10,chogEconomy:{...e,stock:{...e.stock,[good]:e.stock[good]-order.quantity},delivered:[...e.delivered,good],earned:e.earned+order.reward},household:{...s.household!,pet:{...pet,bond:Math.min(100,pet.bond+2)}},lastMessage:`Chog order delivered: +${order.reward} gCHOG. Your goods were sold; your partnership grew.`}
}
export function productionGood(kind:ActionKind):ChogGood|undefined{return kind==='practiceCoding'?'code':kind==='paint'?'art':kind==='cookBreakfast'?'food':undefined}
/** Materials and companion stamina are consumed at real action start; cancellation never creates stock. */
export function beginChogProduction(s:GameState,kind:ActionKind):{state:GameState;good?:ChogGood}{
 const e=s.chogEconomy,good=productionGood(kind),pet=s.household?.pet
 if(!e?.producing||!good||!pet?.following||pet.hunger<40||pet.energy<30||pet.affection<40||e.materials<1||e.stock[good]>=40)return {state:s}
 return {good,state:{...s,chogEconomy:{...e,materials:e.materials-1},household:{...s.household!,pet:{...pet,energy:pet.energy-4}}}}
}
export function finishChogProduction(s:GameState,good:ChogGood|undefined,kind:ActionKind,actionId:number):GameState{
 if(!good||productionGood(kind)!==good)return s
 s=ensureChogEconomy(s);const e=s.chogEconomy!
 // A picnic box packages the cooked meal instead of duplicating it into two inventories.
 if(good==='food')s={...s,life:{...s.life!,meals:s.life!.meals.filter(m=>m.id!==`meal-${actionId}`)}}
 return {...s,chogEconomy:{...e,stock:{...e.stock,[good]:Math.min(40,e.stock[good]+1)},made:e.made+1},lastMessage:`You and your Chog made ${CHOG_GOODS[good].label.toLowerCase()}. Deliver an order to earn gCHOG.`}
}
export function parseChogEconomy(value:unknown,lastSaved:number):ChogEconomy|null{
 if(!value||typeof value!=='object')return null;const e=value as ChogEconomy,int=(n:unknown,max:number)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=max
 if(e.schema!==1||!int(e.materials,80)||!int(e.level,3)||typeof e.producing!=='boolean'||!int(e.day,Math.floor(lastSaved/DAY_MS))||!int(e.earned,1e9)||!int(e.made,1e9)||!e.stock||!(['code','art','food'] as const).every(k=>int(e.stock[k],40))||!Array.isArray(e.delivered)||e.delivered.length>3||new Set(e.delivered).size!==e.delivered.length||e.delivered.some(k=>!Object.prototype.hasOwnProperty.call(CHOG_GOODS,k)))return null
 return {schema:1,materials:e.materials,stock:{code:e.stock.code,art:e.stock.art,food:e.stock.food},level:e.level,producing:e.producing,day:e.day,delivered:[...e.delivered],earned:e.earned,made:e.made}
}
