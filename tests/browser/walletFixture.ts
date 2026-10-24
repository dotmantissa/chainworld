import {test as base,expect,type Page} from '@playwright/test'
import {createNewGameState,reduceGame,settle} from '../../src/game/gameEngine'
import {ensureHousehold} from '../../src/game/household'
import {identityOf} from '../../src/game/neighborhood'
import type {GameState} from '../../src/game/types'
import {parseCommand} from '../../server/commands'

export const TEST_WALLET='0x1111111111111111111111111111111111111111'
export function fixtureHousehold(){
 // Stable furnished geometry for interaction tests, with an authenticated wallet controller.
 const state=ensureHousehold(createNewGameState(TEST_WALLET,0,[],0,{now:Date.now(),chainId:0,collection:'preview'}))
 return {...state,chainId:10143,collection:'0x9fcc2fb7487a3530809f45dfd9bb419ea2e0af17'}
}
export async function updateNFT(page:Page,patch:Record<string,unknown>){await page.evaluate(p=>{const w=window as unknown as {nftFixture:object;nftVersion:number};w.nftFixture={...w.nftFixture,...p};w.nftVersion++;window.dispatchEvent(new Event('nft-fixture'))},patch)}
export async function installWalletSession(page:Page,initial=fixtureHousehold(),additional:GameState[]=[]){
 let state=initial,revision=0
 const states=new Map([initial,...additional].map(s=>[s.chainId,s])),revisions=new Map<number,number>()
 const stats={sessions:0,games:0,commands:0,signatures:0},seen=new Set<string>()
 await page.addInitScript(({wallet,tokenId})=>{const w=window as unknown as {nftFixture:unknown;nftVersion:number};w.nftFixture={address:wallet,isCorrectChain:true,ownershipLost:false,balance:1,ownsChog:true,tokenId,metadata:{name:'Test Chog #0',image:'/art/chog/source-1.webp',attributes:[]},selected:'',needsTokenId:false,isLoading:false,error:null};w.nftVersion=0;(w as unknown as {nftNetworks:object}).nftNetworks={};const original=window.fetch;window.fetch=async(...args)=>{const response=await original(...args);if(new URL(String(args[0]),location.href).pathname==='/api/game'&&response.ok){const snapshot=await response.clone().json();if(snapshot.state)localStorage.setItem('cw_test_snapshot',JSON.stringify(snapshot.state))}return response}},{wallet:TEST_WALLET,tokenId:initial.tokenId})
 await page.route('**/src/hooks/useChogNFT.ts*',r=>r.fulfill({contentType:'application/javascript',body:`import React from '/node_modules/.vite/deps/react.js';const {useSyncExternalStore}=React;const subscribe=cb=>{window.addEventListener('nft-fixture',cb);return()=>window.removeEventListener('nft-fixture',cb)};export function useChogNFT(chainId=10143){useSyncExternalStore(subscribe,()=>window.nftVersion);return {...window.nftFixture,...window.nftNetworks?.[chainId],chainId,collectionAddress:chainId===143?'0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763':'0x9fcc2fb7487a3530809f45dfd9bb419ea2e0af17',setSelected:selected=>{window.nftFixture={...window.nftFixture,selected};window.nftVersion++;window.dispatchEvent(new Event('nft-fixture'))},retry:()=>{}}}`}))
 await page.route('**/api/session**',r=>{if(r.request().method()==='POST')stats.signatures++;else stats.sessions++;const chainId=Number(new URL(r.request().url()).searchParams.get('chainId')??10143);return r.fulfill({json:{address:TEST_WALLET,chainId}})})
 // The init script mirrors successful mock responses for test diagnostics only.
 await page.route('**/api/game**',async route=>{
  const chainId=Number(route.request().method()==='GET'?new URL(route.request().url()).searchParams.get('chainId')??10143:route.request().postDataJSON().chainId??10143),next=states.get(chainId);if(!next){await route.fulfill({status:403,json:{error:'No owned household on this network'}});return}state=next;revision=revisions.get(chainId)??0
  const now=Date.now(),ctx={now,gas:{}}
  if(route.request().method()==='GET'){stats.games++;state=settle(state,ctx)}
  else{
   stats.commands++;const input=route.request().postDataJSON()
   if(!seen.has(`${chainId}:${input.requestId}`)){
    if(input.revision!==revision){await route.fulfill({status:409,json:{state,revision}});return}
    let command=parseCommand(input.command)
    if(command.type==='startJob'&&command.kind==='grifter')command={...command,openingWei:'1000000000',openingAt:now}
    if(state.job?.kind==='grifter'&&now>=state.job.endsAt)state=reduceGame(state,{type:'resolveGrifter',sessionId:state.job.id,wei:'1100000000',fetchedAt:now,stale:false},ctx)
    state=reduceGame(state,command,ctx);revision++;seen.add(`${chainId}:${input.requestId}`)
   }
  }
  states.set(chainId,state);revisions.set(chainId,revision);await route.fulfill({json:{state,revision}})
 })
 await page.route('**/api/neighborhood?*',r=>{const identity=identityOf(state);return r.fulfill({json:{neighbors:state.currentZone===state.home.city?[{identity,tokenId:state.tokenId,name:state.profile.name||'Your Chog',appearance:state.appearance,profile:state.profile,home:state.home,housingTier:state.meters.housingTier,location:state.location,online:true}]:[],parcels:state.home.plots.map(p=>({...p,identity})),offers:[],messages:[]}})})
 return {stats,state:(chainId=initial.chainId)=>states.get(chainId)!,setState:(next:GameState)=>{state=next;states.set(next.chainId,next)}}
}
export const test=base.extend<{walletSession:Awaited<ReturnType<typeof installWalletSession>>}>({walletSession:[async({page},use)=>{const session=await installWalletSession(page);await use(session);await page.unrouteAll({behavior:'ignoreErrors'})},{auto:true}]})
export {expect}
