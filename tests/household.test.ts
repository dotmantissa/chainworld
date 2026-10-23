import {describe,it,expect} from 'vitest'
import {createNewGameState,reduceGame,settle} from '../src/game/gameEngine'
import {ensureHousehold,freshHousehold,SOURCE_PACKAGES} from '../src/game/household'
import {validBlueprint,housePath,entryTile,FURNITURE,starterBlueprint} from '../src/game/housing'
import {humanArtwork} from '../src/world/artwork'
import {restoreSave} from '../src/game/persistence'
const initial=(tier='Common',id=1)=>createNewGameState('wallet',id,[{trait_type:'Tier',value:tier},{trait_type:'Skin',value:'Pink'}],0,{rank:169,now:0})
describe('NFT household identity, source-tier grants and pet care',()=>{
 it('uses source Tier rather than computed rank and shares the furniture/cash budget',()=>{
  for(const tier of Object.keys(SOURCE_PACKAGES) as (keyof typeof SOURCE_PACKAGES)[]){const s=freshHousehold(initial(tier)),h=s.household!;expect(h.sourceTier).toBe(tier);expect(s.meters.housingTier).toBe(SOURCE_PACKAGES[tier].level);expect(s.gChog+h.blueprint.objects.reduce((n,o)=>n+FURNITURE[o.type].price,0)).toBe(SOURCE_PACKAGES[tier].funds)}
 })
 it('migrates once without regranting money or changing owned land',()=>{
  const old=initial();old.gChog=73;const s=ensureHousehold(old);expect(s.gChog).toBe(73);expect(s.home).toBe(old.home);expect(s.household?.grant).toBe('legacy-rank-v1');expect(ensureHousehold(s)).toBe(s)
 })
 it('keeps new parcel entitlements tied to source Tier and never repeats the move-in grant',()=>{
  const common=freshHousehold(initial('Common')),legendary=freshHousehold(initial('Legendary'))
  expect(common.home.plots).toHaveLength(1);expect(legendary.home.plots).toHaveLength(3)
  const spent={...common,gChog:17};expect(freshHousehold(spent).gChog).toBe(17);expect(freshHousehold(spent).home).toBe(spent.home)
 })
 it('generates stable valid houses independent of the wallet and character sex',()=>{
  const s=freshHousehold(initial('Rare'));expect(freshHousehold({...initial('Rare'),walletAddress:'other',profile:{name:'Alex',gender:'female',genderLabel:'',pronouns:''}}).household?.blueprint).toEqual(s.household?.blueprint)
  for(let i=0;i<16;i++){const b=starterBlueprint(i,i%5);expect(validBlueprint(b)).toBe(true);for(const o of b.objects)expect(o.id).toBeTruthy()}
  const b=s.household!.blueprint;expect(housePath(b,entryTile(b),{x:-1,y:0})).toBeNull()
 })
 it('changes human presentation without changing the pet or household assets',()=>{
  const s=freshHousehold(initial('Uncommon'));const other={...s,profile:{...s.profile,gender:'female' as const}}
  expect(humanArtwork(s)[0].url).not.toBe(humanArtwork(other)[0].url);expect(other.appearance).toBe(s.appearance);expect(other.household).toBe(s.household)
 })
 it('persists validated household state and rejects impossible furniture layouts',()=>{
  const s=freshHousehold(initial('Rare'));expect(restoreSave(JSON.stringify(s),s)?.household?.blueprint).toEqual(s.household?.blueprint)
  const bad=structuredClone(s);bad.household!.blueprint.objects[0].x=-4;expect(restoreSave(JSON.stringify(bad),s)?.household).toBeUndefined()
 })
 it('pet care spends from the household once and honors a cooldown',()=>{
  let s=ensureHousehold(initial());s=reduceGame(s,{type:'carePet',kind:'feed'},{now:1000,gas:{}});expect(s.gChog).toBe(1592)
  const repeat=reduceGame(s,{type:'carePet',kind:'feed'},{now:1001,gas:{}});expect(repeat.gChog).toBe(s.gChog);expect(repeat.household?.pet.bond).toBe(3)
  const later=settle(s,{now:3600000,gas:{}});expect(later.household!.pet.hunger).toBeLessThan(s.household!.pet.hunger);expect(later.household!.pet.hunger).toBeGreaterThanOrEqual(20)
 })
})
