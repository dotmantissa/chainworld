import type {GameState} from './types'

export const HUMAN_NEEDS = ['hunger','energy','hygiene','fun','comfort','social'] as const
export const NEED_LABELS = {hunger:'Hunger',energy:'Energy',hygiene:'Hygiene',fun:'Fun',comfort:'Comfort',social:'Social'} as const
export const ADDED_NEEDS = {hygiene:85,fun:70,comfort:80} as const

/** Migration supplies care meters, never money, inventory or economic grants. */
export function ensureNeeds(s:GameState):GameState {
  if(Object.keys(ADDED_NEEDS).every(key=>Number.isFinite(s.meters[key as keyof typeof ADDED_NEEDS])))return s
  return {...s,meters:{...ADDED_NEEDS,...s.meters}}
}

export function needAdvice(s:GameState):string[] {
  const advice:string[]=[]
  if(s.meters.hunger<30)advice.push('Have a meal at a kitchen or café.')
  if(s.meters.energy<30)advice.push('Rest in a bed before working.')
  if(s.meters.hygiene<30)advice.push('Wash at a kitchen sink.')
  if(s.meters.fun<30)advice.push('Read a book or play with your Chog.')
  if(s.meters.comfort<30)advice.push('Relax on a sofa or get some sleep.')
  if(s.meters.social<30)advice.push('Call a friend or meet a city resident.')
  return advice
}
