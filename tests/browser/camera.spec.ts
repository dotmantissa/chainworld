import {world} from './playTools'
import {test,expect} from './walletFixture'
import type {Page,Locator} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {decodeFunctionData,encodeFunctionResult,type Hex} from 'viem'
import {CHAIN_WORLD_REGISTRY_ABI as abi} from '../../src/contracts/chainWorldRegistryAbi'
const realistic=JSON.parse(readFileSync('src/world/realism-manifest.json','utf8'))
test.use({hasTouch:true})
test.beforeEach(async({page})=>{await page.route('https://**/*',route=>route.abort());await page.goto('/');await page.getByRole('button',{name:'Continue with my Chog'}).click();await expect(page.locator('.room-canvas')).toHaveAttribute('aria-busy','false')})
const zoom=async(surface:Locator)=>Number(await surface.getAttribute('data-camera-zoom'))
async function saved(page:Page){return page.evaluate(()=>Object.values(localStorage).map(v=>{try{return JSON.parse(v)}catch{return null}}).find(s=>s?.version===2&&s?.walletAddress==='0x1111111111111111111111111111111111111111'))}
async function drag(page:Page,surface:Locator){const box=(await surface.boundingBox())!;await page.mouse.move(box.x+box.width*.5,box.y+box.height*.55);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.65,{steps:10});await page.mouse.up()}
test('house zoom, pan, reset and direct furniture selection keep simulation separate',async({page})=>{
 const canvas=page.locator('canvas'),controls=page.getByRole('group',{name:'House camera controls'}),before=await saved(page),initial=await zoom(canvas)
 await controls.getByRole('button',{name:'Zoom in',exact:true}).click();expect(await zoom(canvas)).toBeGreaterThan(initial)
 const x=await canvas.getAttribute('data-camera-x');await drag(page,canvas);expect(await canvas.getAttribute('data-camera-x')).not.toBe(x)
 expect((await saved(page)).household.humanTile).toEqual(before.household.humanTile);expect((await saved(page)).household.journey).toBeNull();await expect(page.getByRole('dialog')).toHaveCount(0)
 await controls.getByRole('button',{name:'Pan mode',exact:true}).click();await expect(controls.getByRole('button',{name:'Pan mode',exact:true})).toHaveAttribute('aria-pressed','true')
 await controls.getByRole('button',{name:'Reset view',exact:true}).click();expect(await zoom(canvas)).toBeCloseTo(initial,2)
 await canvas.hover();await page.mouse.wheel(0,-180);await expect.poll(()=>zoom(canvas)).toBeGreaterThan(initial)
 await controls.getByRole('button',{name:'Reset view',exact:true}).click()
 // Click the actual painted bed after a drag/reset, not its accessible proxy button.
 const b=before.household.blueprint,o=b.objects.find((o:{type:string})=>o.type==='bed'),asset=realistic.bed,w=o.rotation?3:2,h=o.rotation?2:3,wx=400+(o.x+(w-1)/2-o.y-(h-1)/2)*25,wy=115+(o.x+(w-1)/2+o.y+(h-1)/2)*13+(w+h)*6.5+2-144*asset.height/asset.width*.65
 const box=(await canvas.boundingBox())!,z=await zoom(canvas),sx=Number(await canvas.getAttribute('data-camera-x')),sy=Number(await canvas.getAttribute('data-camera-y'))
 await page.mouse.click(box.x+((wx-sx-400)*z+400)*box.width/800,box.y+((wy-sy-250)*z+250)*box.height/500)
 await expect(page.getByRole('heading',{name:'Your bed',exact:true})).toBeVisible();expect((await saved(page)).gChog).toBe(before.gChog)
})
test('neighborhood and world directory both support zoom/pan without a walk command',async({page})=>{
 await page.route('https://testnet-rpc.monad.xyz/**',async route=>{
  const requests=JSON.parse(route.request().postData()??'{}'),reply=(r:{id:number;method:string;params:{data:Hex}[]})=>{
   if(r.method==='eth_chainId')return {jsonrpc:'2.0',id:r.id,result:'0x279f'}
   try{const call=decodeFunctionData({abi,data:r.params[0].data}),result=call.functionName==='getLots'?[Array.from({length:36},(_,i)=>i?'0x0000000000000000000000000000000000000000':'0x1111111111111111111111111111111111111111'),Array.from({length:36},(_,i)=>i?0n:42n)]:call.functionName==='totalRegistered'?1n:[true,42n,0,[100,100,100,100,50,1],0n];return {jsonrpc:'2.0',id:r.id,result:encodeFunctionResult({abi,functionName:call.functionName,result} as never)}}catch{return {jsonrpc:'2.0',id:r.id,result:'0x0'}}
  };await route.fulfill({json:Array.isArray(requests)?requests.map(reply):reply(requests)})
 })
 await page.getByRole('button',{name:'Leave home & explore'}).click();const canvas=page.locator('canvas'),controls=page.getByRole('group',{name:'Neighborhood camera controls'})
 await expect(canvas).toHaveAttribute('data-camera-zoom','1.300');const before=await saved(page)
 await controls.getByRole('button',{name:'Zoom out',exact:true}).click();expect(await zoom(canvas)).toBeLessThan(1.3)
 const x=await canvas.getAttribute('data-camera-x');await drag(page,canvas);expect(await canvas.getAttribute('data-camera-x')).not.toBe(x);expect((await saved(page)).location.tile).toEqual(before.location.tile);expect((await saved(page)).location.journey).toBeNull()
 await page.locator('.room-card').screenshot({path:'/tmp/chainworld-camera-neighborhood.png'})
 await controls.getByRole('button',{name:'Reset view',exact:true}).click();expect(await zoom(canvas)).toBe(1.3)
 await world(page);await page.getByRole('button',{name:'Neighbors',exact:true}).click();const map=page.getByLabel('Zoomable world map'),mapControls=page.getByRole('group',{name:'World map controls'})
 await mapControls.getByRole('button',{name:'Zoom in',exact:true}).click();expect(await zoom(map)).toBeGreaterThan(1)
 await drag(page,map);expect(Number(await map.getAttribute('data-camera-x'))).not.toBe(0)
 await mapControls.getByRole('button',{name:'Reset view',exact:true}).click();expect(await zoom(map)).toBe(1);expect(await map.getAttribute('data-camera-x')).toBe('0.00')
 await map.hover();await page.mouse.wheel(0,-150);await expect.poll(()=>zoom(map)).toBeGreaterThan(1)
 await mapControls.getByRole('button',{name:'Reset view',exact:true}).click();await page.getByRole('button',{name:'View Chog 42',exact:true}).click();await expect(page.getByRole('heading',{name:'Chog #42',exact:true})).toBeVisible()
})
test('touch pinch zoom does not select furniture or move the character',async({page})=>{
 const canvas=page.locator('canvas'),box=(await canvas.boundingBox())!,before=await saved(page),initial=await zoom(canvas),session=await page.context().newCDPSession(page),x=box.x+box.width*.5,y=box.y+box.height*.5
 const point=(px:number,id:number)=>({x:px,y,id,radiusX:2,radiusY:2})
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(x-35,1),point(x+35,2)]})
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x-85,1),point(x+85,2)]})
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 await expect.poll(()=>zoom(canvas)).toBeGreaterThan(initial*1.4);expect((await saved(page)).household.humanTile).toEqual(before.household.humanTile);expect((await saved(page)).household.journey).toBeNull();await expect(page.getByRole('dialog')).toHaveCount(0)
})
