import type {ActionKind,GameState} from './types'
import {QUESTS} from './gameEngine'
import {HUMAN_NEEDS} from './needs'

export type PlaySuggestion={title:string;description:string;label:string;action?:ActionKind;tool?:'home'|'life'|'goals';ration?:boolean;explore?:boolean}
/** Suggestions are navigation only; commands still pass through the normal game rules. */
export function playSuggestion(s:GameState):PlaySuggestion{
 if(s.location.trip)return {title:'Enjoy the ride',description:'You and your Chog are on the tram. Your new city is just ahead.',label:'See destinations',tool:'home'}
 if(s.action||s.job||s.household?.journey||s.location.journey)return {title:s.action||s.job?'A little moment in progress':'On your way',description:'Watch your resident, or choose another furniture action to queue it. Cancel stops the activity and clears the queue.',label:'View household',tool:'home'}
 const needs=[...HUMAN_NEEDS].sort((a,b)=>s.meters[a]-s.meters[b])
 const lowest=needs[0]
 if(s.meters[lowest]<30){
  if(lowest==='hunger'&&s.gChog<20&&s.meters.hunger<20)return {title:'A little help with food',description:'Community rations are free when food and funds are critically low.',label:'Get a community ration',ration:true}
  const options={hunger:['Time for a bite','Have a meal at the kitchen or café.','Eat a meal','eat'],energy:['Take a breather','A bed restores energy for your next adventure.','Rest','rest'],hygiene:['Freshen up','Use the kitchen sink to feel like yourself again.','Wash at the sink','wash'],fun:['Make time for yourself','A book or a little playtime will brighten the day.','Read a book','unwind'],comfort:['Get comfortable','Take a quiet seat on the sofa.','Relax on the sofa','relax'],social:['A friendly voice','Call a friend from a sofa or meet someone in town.','Call a friend','socialize']} as const
  const [title,description,label,action]=options[lowest]
  return {title,description,label,action}
 }
 if(QUESTS.some(q=>q.ready(s)&&!s.quests.includes(q.id)))return {title:'You earned a little something',description:'A completed milestone is ready. Collect your reward whenever you like.',label:'Collect rewards',tool:'goals'}
 if(s.completedWork===0)return {title:'Make your first little living',description:'Select the desk and work a shift. You earn gCHOG to spend on your home and daily life.',label:'Try a work shift',action:'work'}
 return {title:'Your day is yours',description:'Select furniture to care for yourself, spend time with your Chog, or meet someone in town.',label:s.location.kind==='street'?'Explore the city':'Step outside',explore:true}
}
