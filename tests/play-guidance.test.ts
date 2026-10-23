import {describe,it,expect} from 'vitest'
import {createNewGameState} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {playSuggestion} from '../src/game/playGuidance'
const initial=()=>ensureHousehold(createNewGameState('player',0,[],0,{now:1000}))
describe('player guidance',()=>{
 it('suggests an uncomplicated first earning loop without requiring settings',()=>{expect(playSuggestion(initial()).action).toBe('work')})
 it('prioritizes the most urgent need and free emergency food over work and rewards',()=>{const s=initial();s.meters.energy=5;s.meters.hunger=15;s.gChog=0;expect(playSuggestion(s).action).toBe('rest');s.meters.hunger=2;expect(playSuggestion(s).ration).toBe(true)})
 it('suggests collecting an earned reward before a new excursion',()=>{const s=initial();s.completedWork=1;expect(playSuggestion(s).tool).toBe('goals')})
 it('keeps a running activity visible instead of suggesting another work start',()=>{const s=initial();s.action={id:1,kind:'rest',startedAt:1000,endsAt:11000};expect(playSuggestion(s).title).toBe('A little moment in progress');expect(playSuggestion(s).action).toBeUndefined()})
})
