import {test,expect} from '@playwright/test'
import {createNewGameState,reduceGame} from '../../src/game/gameEngine'
import {ensureHousehold} from '../../src/game/household'

test('slow authoritative saving does not block walking, object choices, queues or cancellation',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort())
 await page.route('**/api/neighborhood?*',route=>route.fulfill({json:{neighbors:[],parcels:[],offers:[],messages:[]}}))
 let state=ensureHousehold(createNewGameState('preview',0,[],0,{now:Date.now(),chainId:0,collection:'preview'})),revision=0
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r});const seen=new Set<string>(),requests:string[]=[]
 await page.route('**/api/game',async route=>{
  const body=route.request().postDataJSON();requests.push(body.command.type)
  if(requests.length===1)await gate
  if(!seen.has(body.requestId)){state=reduceGame(state,body.command,{now:Date.now(),gas:{}});revision++;seen.add(body.requestId)}
  await route.fulfill({json:{state,revision}})
 })
 await page.goto('/')
 await page.evaluate(async initial=>{
  const reactModule=await import('/node_modules/.vite/deps/react.js' as string),domModule=await import('/node_modules/.vite/deps/react-dom_client.js' as string),{default:GameHUD}=await import('/src/components/GameHUD.tsx' as string)
  const React=reactModule.default??reactModule,{createRoot}=domModule.default??domModule
  document.querySelector('#root')!.replaceChildren();const root=document.createElement('div');document.querySelector('#root')!.append(root)
  createRoot(root).render(React.createElement(GameHUD,{gameState:initial,revision:0,traits:[],preview:true,onExit:()=>{}}))
 },state)
 await expect(page.locator('.room-canvas')).toHaveAttribute('aria-busy','false')
 const canvas=page.locator('canvas');await canvas.focus();await page.keyboard.press('d')
 await expect(canvas).toHaveAttribute('data-destination',JSON.stringify({x:4,y:6}),{timeout:1200})
 await expect(page.locator('.save-note')).toHaveAttribute('data-sync','saving')
 await page.getByRole('region',{name:'Your needs'}).getByRole('button',{name:/Hygiene/}).click()
 await page.getByRole('dialog').getByRole('button',{name:/Wash at the sink/}).click()
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.getByRole('status')).toContainText('Wash at the sink',{timeout:8000})
 await page.getByRole('button',{name:'Cancel',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('canceled')
 expect(requests).toHaveLength(1)
 release();await expect(page.locator('.save-note')).toHaveAttribute('data-sync','saved',{timeout:15000})
 expect(requests).toContain('enqueueAction');expect(requests).toContain('cancel');expect(errors).toEqual([])
})
