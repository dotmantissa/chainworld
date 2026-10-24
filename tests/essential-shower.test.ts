import {describe,it,expect} from 'vitest'
import {createNewGameState} from '../src/game/gameEngine'
import {ensureHousehold,ensureEssentialShower} from '../src/game/household'
import {starterBlueprint,validBlueprint} from '../src/game/housing'
const initial=()=>ensureHousehold(createNewGameState('preview',0,[],0,{now:1000,chainId:0,collection:'preview'}))
describe('essential shower grant',()=>{
 it('provides a reachable shower at every source tier across varied seeds',()=>{
  for(let level=0;level<=5;level++)for(let seed=0;seed<100;seed++){
   const b=starterBlueprint(seed,level);expect(validBlueprint(b)).toBe(true);expect(b.objects.filter(o=>o.type==='showerStall'&&!o.stored)).toHaveLength(1)
  }
 })
 it('upgrades a legacy home once without changing owned furniture or funds',()=>{
  const s=initial(),h=s.household!;delete h.amenitiesVersion;h.blueprint.objects=h.blueprint.objects.filter(o=>o.type!=='showerStall')
  const owned=structuredClone(h.blueprint.objects),next=ensureEssentialShower(s)
  expect(next.gChog).toBe(s.gChog);expect(next.household!.blueprint.objects.slice(0,owned.length)).toEqual(owned)
  expect(validBlueprint(next.household!.blueprint)).toBe(true);expect(ensureEssentialShower(next)).toBe(next)
 })
 it('waits for an active interaction to finish before migrating geometry',()=>{
  const s=initial();delete s.household!.amenitiesVersion;s.household!.blueprint.objects=s.household!.blueprint.objects.filter(o=>o.type!=='showerStall');s.action={id:1,kind:'rest',startedAt:1000,endsAt:5000}
  expect(ensureEssentialShower(s)).toBe(s)
 })
})
