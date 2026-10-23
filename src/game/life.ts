import type {ActionKind,GameState} from './types'
import {venueOf} from './places'

export const INGREDIENTS=['oats','fruit','rice','vegetables'] as const
export type Ingredient=typeof INGREDIENTS[number]
export const SKILLS={cooking:'Cooking',programming:'Programming',creativity:'Creativity'} as const
export type Skill=keyof typeof SKILLS
export const GROCERIES={
 breakfast:{label:'Breakfast groceries',price:18,items:{oats:2,fruit:2}},
 garden:{label:'Garden groceries',price:30,items:{rice:2,vegetables:4}},
} as const
export const RECIPES={
 cookBreakfast:{label:'Fruit porridge',duration:15000,ingredients:{oats:1,fruit:1},level:0,hunger:45},
 cookStew:{label:'Garden stew',duration:20000,ingredients:{rice:1,vegetables:2},level:1,hunger:60},
} as const
export type Recipe=keyof typeof RECIPES
export const PROJECTS={
 helloChain:{name:'Build a tiny app',description:'Practice coding at a desk three times.',skill:'programming',target:3,reward:80},
 citySketch:{name:'A city sketchbook',description:'Sketch on a sofa three times.',skill:'creativity',target:3,reward:60},
 recipeBook:{name:'Your first recipe book',description:'Cook three meals at a kitchen.',skill:'cooking',target:3,reward:90},
} as const
export type Project=keyof typeof PROJECTS
export interface Meal {id:string;recipe:Recipe;expiresAt:number}
export interface LifeState {
 schema:1;pantry:Record<Ingredient,number>;skills:Record<Skill,number>;meals:Meal[]
 activeProject:Project|null;progress:Record<Project,number>;claimed:Project[]
}
export function newLife():LifeState{return {schema:1,pantry:{oats:0,fruit:0,rice:0,vegetables:0},skills:{cooking:0,programming:0,creativity:0},meals:[],activeProject:null,progress:{helloChain:0,citySketch:0,recipeBook:0},claimed:[]}}
export function ensureLife(s:GameState):GameState{return s.life?.schema===1?s:{...s,life:newLife()}}
export function skillLevel(xp:number):number{return Math.min(10,Math.floor(xp/30))}
export function settleMeals(s:GameState,now:number):GameState{
 s=ensureLife(s);const meals=s.life!.meals.filter(m=>m.expiresAt>now)
 return meals.length===s.life!.meals.length?s:{...s,life:{...s.life!,meals}}
}
export function lifeActionReason(s:GameState,kind:ActionKind,now=s.lastSaved):string|null {
 const l=s.life??newLife()
 if(kind==='cookBreakfast'||kind==='cookStew'){
  const recipe=RECIPES[kind]
  if(skillLevel(l.skills.cooking)<recipe.level)return `Needs cooking level ${recipe.level}`
  if(l.meals.filter(m=>m.expiresAt>now).length>=12)return 'Your meal shelf is full'
  for(const [item,count]of Object.entries(recipe.ingredients))if(l.pantry[item as Ingredient]<count)return `Needs ${count} ${item} in your pantry`
 }
 if(kind==='eatLeftovers'&&!l.meals.some(m=>m.expiresAt>now))return 'Cook a meal first; no fresh leftovers'
 if((kind==='practiceCoding'||kind==='paint')&&s.meters.energy<5)return 'Needs 5 energy — rest first'
 return null
}
/** Called only after physical arrival and resource validation. Cancellation never refunds consumed ingredients. */
export function consumeLifeAction(s:GameState,kind:ActionKind,now:number):{state:GameState;mealRecipe?:Recipe}{
 s=settleMeals(s,now);const l=structuredClone(s.life!)
 if(kind==='cookBreakfast'||kind==='cookStew')for(const[item,count]of Object.entries(RECIPES[kind].ingredients))l.pantry[item as Ingredient]-=count
 let mealRecipe:Recipe|undefined
 if(kind==='eatLeftovers'){const meal=[...l.meals].sort((a,b)=>a.expiresAt-b.expiresAt)[0];mealRecipe=meal?.recipe;l.meals=l.meals.filter(m=>m.id!==meal?.id)}
 return {state:{...s,life:l},mealRecipe}
}
export function completeLifeAction(s:GameState,kind:ActionKind,actionId:number,now:number,mealRecipe?:Recipe):GameState {
 s=settleMeals(s,now);const l=structuredClone(s.life!)
 const gain:Partial<Record<Skill,number>>={}
 if(kind==='cookBreakfast'||kind==='cookStew'){
  if(l.meals.length<12)l.meals.push({id:`meal-${actionId}`,recipe:kind,expiresAt:now+30*60000})
  gain.cooking=15;s={...s,meters:{...s.meters,hygiene:Math.max(0,s.meters.hygiene-3),fun:Math.min(100,s.meters.fun+8)},lastMessage:`${RECIPES[kind].label} cooked. A fresh meal is waiting in your pantry.`}
 }
 if(kind==='eatLeftovers'&&mealRecipe)s={...s,meters:{...s.meters,hunger:Math.min(100,s.meters.hunger+RECIPES[mealRecipe].hunger),comfort:Math.min(100,s.meters.comfort+10)}}
 if(kind==='practiceCoding')gain.programming=15
 if(kind==='focus')gain.programming=10
 if(kind==='work')gain.programming=4
 if(kind==='paint'){gain.creativity=15;s={...s,meters:{...s.meters,fun:Math.min(100,s.meters.fun+30)}}}
 if(kind==='unwind')gain.creativity=4
 for(const[skill,xp]of Object.entries(gain))l.skills[skill as Skill]=Math.min(3000,l.skills[skill as Skill]+xp!)
 const project=l.activeProject
 if(project&&gain[PROJECTS[project].skill]){
  l.progress[project]=Math.min(PROJECTS[project].target,l.progress[project]+1)
  if(l.progress[project]===PROJECTS[project].target)s={...s,lastMessage:`${PROJECTS[project].name} finished. Claim its reward in Skills & pantry.`}
 }
 return {...s,life:l}
}
export function canShop(s:GameState):boolean{return !s.location.trip&&!s.action&&!s.job&&!s.household?.journey&&(s.location.kind==='home'&&!s.location.venue||venueOf(s.location.venue)==='cafe')}
export function buyGroceries(s:GameState,pack:keyof typeof GROCERIES,price:number):GameState {
 s=ensureLife(s);const goods=GROCERIES[pack],l=s.life!
 if(!canShop(s))return {...s,lastMessage:'Order groceries at your own home or a café after your activity.'}
 if(s.gChog<price)return {...s,lastMessage:'Not enough gCHOG for these groceries.'}
 if(Object.entries(goods.items).some(([key,count])=>l.pantry[key as Ingredient]+count>40))return {...s,lastMessage:'Your pantry is full. Cook with your supplies first.'}
 const pantry={...l.pantry};for(const[key,count]of Object.entries(goods.items))pantry[key as Ingredient]+=count
 return {...s,gChog:s.gChog-price,life:{...l,pantry},lastMessage:`${goods.label} delivered to your pantry.`}
}
export function projectCommand(s:GameState,id:Project,claim:boolean):GameState {
 s=ensureLife(s);const l=s.life!,p=PROJECTS[id]
 if(l.claimed.includes(id))return {...s,lastMessage:'This household has already claimed that project.'}
 if(claim){
  if(l.progress[id]<p.target)return {...s,lastMessage:'Finish the project before claiming its reward.'}
  return {...s,gChog:s.gChog+p.reward,xp:s.xp+25,life:{...l,activeProject:l.activeProject===id?null:l.activeProject,claimed:[...l.claimed,id]},lastMessage:`${p.name}: +${p.reward} gCHOG and +25 XP.`}
 }
 if(l.activeProject&&l.activeProject!==id)return {...s,lastMessage:'Finish and claim your current project first.'}
 return {...s,life:{...l,activeProject:id},lastMessage:`Project started: ${p.name}. ${p.description}`}
}
export function parseLife(value:unknown):LifeState|null {
 if(!value||typeof value!=='object')return null
 const p=value as LifeState,integer=(n:unknown,max:number)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=max
 if(p.schema!==1||!p.pantry||!p.skills||!p.progress||!Array.isArray(p.meals)||p.meals.length>12||!Array.isArray(p.claimed)||p.claimed.length>3)return null
 if(!INGREDIENTS.every(k=>integer(p.pantry[k],40))||!(Object.keys(SKILLS) as Skill[]).every(k=>integer(p.skills[k],3000)))return null
 if(!(Object.keys(PROJECTS) as Project[]).every(k=>integer(p.progress[k],PROJECTS[k].target)))return null
 if(p.activeProject!==null&&!Object.prototype.hasOwnProperty.call(PROJECTS,p.activeProject))return null
 if(p.claimed.some(id=>!Object.prototype.hasOwnProperty.call(PROJECTS,id)||p.progress[id]<PROJECTS[id].target)||new Set(p.claimed).size!==p.claimed.length)return null
 const ids=new Set<string>();for(const m of p.meals){if(!m||typeof m.id!=='string'||!/^meal-\d{1,16}$/.test(m.id)||ids.has(m.id)||!Object.prototype.hasOwnProperty.call(RECIPES,m.recipe)||!Number.isSafeInteger(m.expiresAt)||m.expiresAt<0)return null;ids.add(m.id)}
 return {schema:1,pantry:Object.fromEntries(INGREDIENTS.map(k=>[k,p.pantry[k]])) as LifeState['pantry'],skills:Object.fromEntries(Object.keys(SKILLS).map(k=>[k,p.skills[k as Skill]])) as LifeState['skills'],meals:p.meals.map(m=>({id:m.id,recipe:m.recipe,expiresAt:m.expiresAt})),activeProject:p.activeProject,progress:{helloChain:p.progress.helloChain,citySketch:p.progress.citySketch,recipeBook:p.progress.recipeBook},claimed:[...p.claimed]}
}
