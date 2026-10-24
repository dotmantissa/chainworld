import {validBlueprint,FURNITURE,type FurnitureType} from '../../src/game/housing'
import {expect,type Page} from '@playwright/test'
import {readFileSync} from 'node:fs'
const assets={...JSON.parse(readFileSync('src/world/art-manifest.json','utf8')).furniture,...JSON.parse(readFileSync('src/world/realism-manifest.json','utf8')),...JSON.parse(readFileSync('src/world/venue-manifest.json','utf8'))}
export async function saved(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('cw_test_snapshot')!))}
export async function worldPoint(page:Page,x:number,y:number){const canvas=page.locator('canvas'),box=(await canvas.boundingBox())!,z=Number(await canvas.getAttribute('data-camera-zoom')),sx=Number(await canvas.getAttribute('data-camera-x')),sy=Number(await canvas.getAttribute('data-camera-y'));return{x:box.x+((x-sx-400)*z+400)*box.width/800,y:box.y+((y-sy-250)*z+250)*box.height/500}}
export async function tilePoint(page:Page,x:number,y:number){return worldPoint(page,400+(x-y)*25,115+(x+y)*13)}
export async function clickTile(page:Page,x:number,y:number){const p=await tilePoint(page,x,y);await page.mouse.click(p.x,p.y)}
export async function place(page:Page,name:string,touch=false){
 const catalog=page.getByRole('button',{name:'Buy furniture',exact:true});if(await catalog.getAttribute('aria-expanded')!=='true')await catalog.click();await page.locator('.build-catalogue').getByRole('button',{name:new RegExp(name)}).click()
 const b=(await saved(page)).household.blueprint,type=(Object.keys(FURNITURE) as FurnitureType[]).find(k=>FURNITURE[k].label===name)!
 for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++)if(validBlueprint({...b,objects:[...b.objects,{id:'test-placement',type,x,y,rotation:0,stored:false}]})){
  const p=await tilePoint(page,x,y);await page.mouse.move(p.x,p.y);await expect.poll(async()=>{const target=await page.locator('canvas').getAttribute('data-build-target');return target?JSON.parse(target):null}).toMatchObject({x,y,valid:true,type});if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await expect(page.getByRole('status')).toContainText('Furniture purchased and placed');await expect.poll(async()=>(await saved(page)).household.blueprint.objects.length).toBe(b.objects.length+1);return
 }
 throw new Error(`No legal scene tile for ${name}`)
}
export function objectGeometry(o:{type:string;x:number;y:number;rotation:number}){const dimensions:Record<string,[number,number,number]>={bed:[2,3,144],kitchen:[2,1,110],desk:[2,1,116],sofa:[2,1,110],shower:[2,2,120],showerStall:[1,1,78],plant:[1,1,44],basin:[1,1,52],bowl:[1,1,28],lamp:[1,1,24],shelf:[2,1,75]},[w0,h0,width]=dimensions[o.type],w=o.rotation?h0:w0,h=o.rotation?w0:h0,asset=assets[o.type==='showerStall'?'shower':o.type],actual=Array.isArray(asset)?asset[o.rotation]:asset,height=o.type==='showerStall'?116:width*actual.height/actual.width;return{x:400+(o.x+(w-1)/2-o.y-(h-1)/2)*25,y:115+(o.x+(w-1)/2+o.y+(h-1)/2)*13+(w+h)*6.5+2-height*.5}}
