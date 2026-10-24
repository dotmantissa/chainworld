import {describe,it,expect} from 'vitest'
import {ACTIONS,createNewGameState,reduceGame,settle} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import {ensureChogEconomy,chogOrder,chogSpecialty,partnerBonus,parseChogEconomy} from '../src/game/chogEconomy'
import {parseCommand} from '../server/commands'
import {restoreSave} from '../src/game/persistence'
const ctx=(now:number)=>({now,gas:{}})
const initial=()=>ensureChogEconomy(ensureHousehold(createNewGameState('preview',0,[],0,{now:1000,chainId:0,collection:'preview'})))
const act=(s:ReturnType<typeof initial>,c:Parameters<typeof reduceGame>[1],now=s.lastSaved)=>reduceGame(s,c,ctx(now))
describe('NFT household commerce',()=>{
 it('buys bounded material bundles at server prices and refuses building/remote purchases and client quotes',()=>{
  const s=initial(),bought=act(s,{type:'buyChogMaterials'});expect(bought.gChog).toBe(60);expect(bought.chogEconomy!.materials).toBe(6);expect(bought.chogEconomy!.producing).toBe(true)
  expect(act({...s,buildMode:true},{type:'buyChogMaterials'}).gChog).toBe(100);expect(act({...s,location:{kind:'street',tile:{x:3,y:7},journey:null}},{type:'buyChogMaterials'}).chogEconomy!.materials).toBe(0)
  expect(act({...s,gChog:0},{type:'buyChogMaterials'}).gChog).toBe(0);expect(parseCommand({type:'buyChogMaterials',price:-1000,materials:999})).toEqual({type:'buyChogMaterials'});expect(()=>parseCommand({type:'deliverChogGoods',good:'constructor',reward:999})).toThrow()
 })
 it('consumes supplies only at physical start, keeps no stock on cancel, and creates one product on completion',()=>{
  let s=act(initial(),{type:'buyChogMaterials'});const desk=s.household!.blueprint.objects.find(o=>o.type==='desk')!
  s=act(s,{type:'useObject',objectId:desk.id,kind:'practiceCoding'});expect(s.chogEconomy!.materials).toBe(6);s=settle(s,ctx(s.household!.pendingUse!.arrivesAt));expect(s.action!.chogGood).toBe('code');expect(s.chogEconomy!.materials).toBe(5)
  s=act(s,{type:'cancel'});expect(s.chogEconomy!.stock.code).toBe(0);s=act(s,{type:'useObject',objectId:desk.id,kind:'practiceCoding'});if(s.household!.pendingUse)s=settle(s,ctx(s.household!.pendingUse!.arrivesAt));const end=s.action!.endsAt;s=settle(s,ctx(end));expect(s.chogEconomy!.stock.code).toBe(1);expect(s.chogEconomy!.materials).toBe(4);expect(settle(s,ctx(end)).chogEconomy).toEqual(s.chogEconomy)
 })
 it('packages the actual cooked meal into a picnic box instead of duplicating food',()=>{
  let s=act(initial(),{type:'buyChogMaterials'});s.life!.pantry={oats:1,fruit:1,rice:0,vegetables:0};const kitchen=s.household!.blueprint.objects.find(o=>o.type==='kitchen')!
  s=act(s,{type:'useObject',objectId:kitchen.id,kind:'cookBreakfast'});s=settle(s,ctx(s.household!.pendingUse!.arrivesAt));s=settle(s,ctx(s.action!.endsAt));expect(s.chogEconomy!.stock.food).toBe(1);expect(s.life!.meals).toHaveLength(0);expect(s.life!.pantry.oats).toBe(0)
 })
 it('requires the correct city venue and companion, consumes inventory, and pays once per NFT/day',()=>{
  let s=initial();s.chogEconomy!.stock.code=4;const order=chogOrder(s,'code');expect(act(s,{type:'deliverChogGoods',good:'code'}).gChog).toBe(100)
  s.location={kind:'street',tile:{x:13,y:3},journey:null};s=act(s,{type:'enterVenue',venue:'work'});const absent={...s,household:{...s.household!,pet:{...s.household!.pet,following:false}}};expect(act(absent,{type:'deliverChogGoods',good:'code'}).gChog).toBe(100)
  s=act(s,{type:'deliverChogGoods',good:'code'});expect(s.gChog).toBe(100+order.reward);expect(s.chogEconomy!.stock.code).toBe(4-order.quantity);expect(act(s,{type:'deliverChogGoods',good:'code'}).gChog).toBe(s.gChog)
  const restored=restoreSave(JSON.stringify(s),{...initial(),walletAddress:'another-owner'})!;expect(restored.chogEconomy).toEqual(s.chogEconomy);expect(chogSpecialty(restored)).toBe(chogSpecialty(s));expect(act(restored,{type:'deliverChogGoods',good:'code'}).gChog).toBe(s.gChog)
  const tomorrow=settle(s,ctx(86401000));expect(tomorrow.chogEconomy!.delivered).toHaveLength(0);expect(tomorrow.chogEconomy!.stock.code).toBe(s.chogEconomy!.stock.code)
 })
 it('makes care/bond and reinvestment affect real earnings without regranting balances',()=>{
  let s=initial();s.gChog=1000;s.household!.pet.bond=50;expect(partnerBonus(s)).toBe(.1);s=act(s,{type:'upgradeChogWorkshop'});expect(s.gChog).toBe(880);expect(partnerBonus(s)).toBeCloseTo(.12)
  expect(act(s,{type:'buyChogMaterials'}).gChog).toBe(844);s.household!.pet.hunger=10;expect(partnerBonus(s)).toBe(0)
  const corrupt=structuredClone(s.chogEconomy!);corrupt.materials=81;expect(parseChogEconomy(corrupt,s.lastSaved)).toBeNull();const old=initial();delete old.chogEconomy;expect(restoreSave(JSON.stringify(old),initial())!.gChog).toBe(old.gChog)
 })
 it('honors paused production and an exhausted companion while preserving ordinary practice',()=>{
  let s=act(initial(),{type:'buyChogMaterials'});s=act(s,{type:'setChogProduction',enabled:false});const desk=s.household!.blueprint.objects.find(o=>o.type==='desk')!;s=act(s,{type:'useObject',objectId:desk.id,kind:'practiceCoding'});s=settle(s,ctx(s.household!.pendingUse!.arrivesAt));expect(s.action!.chogGood).toBeUndefined();s=settle(s,ctx(s.action!.startedAt+ACTIONS.practiceCoding.duration));expect(s.chogEconomy!.materials).toBe(6);expect(s.life!.skills.programming).toBe(15);let tired=act(initial(),{type:'buyChogMaterials'});tired.household!.pet.energy=29;tired=act(tired,{type:'useObject',objectId:desk.id,kind:'practiceCoding'});tired=settle(tired,ctx(tired.household!.pendingUse!.arrivesAt));expect(tired.action!.chogGood).toBeUndefined();expect(tired.chogEconomy!.materials).toBe(6)
 })
})
