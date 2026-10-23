import type {GameState} from './types'
import {seedOf} from './housing'
import {identityOf} from './neighborhood'
export const DAY_MS=86400000
export const DAILY_GOALS={
 cook:{name:'A home-cooked day',description:'Cook one meal from pantry ingredients.',target:1,reward:20},
 practice:{name:'Keep learning',description:'Complete two reading, coding or sketching sessions.',target:2,reward:25},
 social:{name:'Make time for people',description:'Share two NPC conversations, gifts or hangouts.',target:2,reward:20},
 pet:{name:'A happy companion',description:'Complete two Chog care activities.',target:2,reward:15},
 travel:{name:'A change of scenery',description:'Complete a tram journey to another city.',target:1,reward:25},
} as const
export type DailyGoal=keyof typeof DAILY_GOALS
export interface DailyState {schema:1;day:number;counts:Record<DailyGoal,number>;claimed:DailyGoal[];earned:number}
export function newDaily(now:number,earned=0):DailyState{return {schema:1,day:Math.floor(now/DAY_MS),counts:{cook:0,practice:0,social:0,pet:0,travel:0},claimed:[],earned}}
export function ensureDaily(s:GameState,now:number):GameState {
 const daily=s.daily??newDaily(s.lastSaved)
 return {...s,daily:Math.floor(now/DAY_MS)>daily.day?newDaily(now,daily.earned):daily}
}
export function todaysGoals(s:GameState):DailyGoal[]{const day=s.daily?.day??Math.floor(s.lastSaved/DAY_MS);return (Object.keys(DAILY_GOALS) as DailyGoal[]).sort((a,b)=>seedOf(`${identityOf(s)}:${day}:${a}`)-seedOf(`${identityOf(s)}:${day}:${b}`)).slice(0,3)}
export function recordDaily(s:GameState,goal:DailyGoal,now:number):GameState {
 s=ensureDaily(s,now);if(Math.floor(now/DAY_MS)!==s.daily!.day)return s
 return {...s,daily:{...s.daily!,counts:{...s.daily!.counts,[goal]:Math.min(100,s.daily!.counts[goal]+1)}}}
}
export function claimDaily(s:GameState,id:DailyGoal,now:number):GameState {
 s=ensureDaily(s,now);const daily=s.daily!,goal=DAILY_GOALS[id]
 if(!todaysGoals(s).includes(id)||daily.claimed.includes(id)||daily.counts[id]<goal.target)return {...s,lastMessage:'Complete today’s selected goal before claiming its reward.'}
 return {...s,gChog:s.gChog+goal.reward,xp:s.xp+5,daily:{...daily,claimed:[...daily.claimed,id],earned:daily.earned+goal.reward},lastMessage:`${goal.name}: +${goal.reward} gCHOG and +5 XP.`}
}
export function parseDaily(value:unknown):DailyState|null {
 if(!value||typeof value!=='object')return null
 const d=value as DailyState
 if(d.schema!==1||!Number.isSafeInteger(d.day)||d.day<0||!Number.isSafeInteger(d.earned)||d.earned<0||d.earned>1e9||!d.counts||!Array.isArray(d.claimed)||d.claimed.length>3||new Set(d.claimed).size!==d.claimed.length)return null
 if(!(Object.keys(DAILY_GOALS) as DailyGoal[]).every(k=>Number.isInteger(d.counts[k])&&d.counts[k]>=0&&d.counts[k]<=100)||d.claimed.some(k=>!Object.prototype.hasOwnProperty.call(DAILY_GOALS,k)||d.counts[k]<DAILY_GOALS[k].target))return null
 return {schema:1,day:d.day,earned:d.earned,claimed:[...d.claimed],counts:{cook:d.counts.cook,practice:d.counts.practice,social:d.counts.social,pet:d.counts.pet,travel:d.counts.travel}}
}
