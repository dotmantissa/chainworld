import type {GameState} from './types'
import {npcById,venueOf,type CityNpc} from './places'
import {distance} from './neighborhood'
import {recordDaily} from './dailyGoals'

export function relationshipLabel(friendship:number):string{return friendship>=90?'Best friend':friendship>=60?'Close friend':friendship>=24?'Friend':'Acquaintance'}
export function npcRoutine(npc:CityNpc,now:number):string {
 const hour=Math.floor(now/360000)%24
 if(hour<6||hour>=22)return 'Taking a quiet break'
 if(npc.venue==='cafe')return hour<12?'Sharing breakfast stories':hour<18?'Trying local recipes':'Catching up over dinner'
 if(npc.venue==='work')return hour<12?'Planning a new project':hour<18?'Working on a project':'Sharing what they learned'
 if(npc.venue==='library')return hour<12?'Shelving new arrivals':hour<18?'Helping readers find a book':'Preparing a reading circle'
 return hour<12?'Tending the garden':hour<18?'Welcoming Chog companions':'Enjoying the evening air'
}
export function hangoutReason(s:GameState,id:string,now=s.lastSaved):string|null {
 if((s.household?.relationships[id]?.friendship??0)<16)return 'Get to know them first · 16 friendship needed'
 if((s.cooldowns[`hangout:${id}`]??0)>now)return 'Enjoy another activity before the next hangout'
 return null
}
export function completeHangout(s:GameState,id:string,now:number):GameState {
 const npc=npcById(id),h=s.household
 if(!npc||!h||s.currentZone!==npc.city||venueOf(s.location.venue)!==npc.venue||distance(h.humanTile,npc)>2)return {...s,lastMessage:'Your shared activity ended when you left the venue.'}
 const previous=h.relationships[id]
 const friendship=Math.min(100,(previous?.friendship??0)+12)
 return recordDaily({...s,xp:s.xp+5,cooldowns:{...s.cooldowns,[`hangout:${id}`]:now+60000},meters:{...s.meters,social:Math.min(100,s.meters.social+18),fun:Math.min(100,s.meters.fun+25)},household:{...h,relationships:{...h.relationships,[id]:{friendship,meetings:(previous?.meetings??0)+1,lastMet:now,memory:`hangout-${npc.venue}`}}},lastMessage:`A lovely moment with ${npc.name}. Friendship ${friendship}/100 · ${relationshipLabel(friendship)}.`},'social',now)
}
