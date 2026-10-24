import {it,expect} from 'vitest'
import {openPreview} from '../src/game/entryState'
import {reduceGame} from '../src/game/gameEngine'
import {saveGameState} from '../src/game/persistence'
it('reopens the latest local world after exit instead of the landing page’s cached initial home',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)}}
 const first=openPreview(null,storage).state,outside=reduceGame(first,{type:'leaveHome'},{now:first.lastSaved,gas:{}});outside.gChog=321;saveGameState(outside,storage);const resumed=openPreview(null,storage).state;expect(resumed.location.kind).toBe('street');expect(resumed.gChog).toBe(321);expect(resumed.household!.blueprint).toEqual(first.household!.blueprint)
})
