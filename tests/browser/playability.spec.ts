import {test,expect} from './walletFixture'

test.beforeEach(async({page})=>{await page.route('https://**/*',r=>r.abort());await page.goto('/');await page.getByRole('button',{name:'Continue with my Chog'}).click();await page.getByRole('button',{name:'Play on testnet',exact:true}).click();await expect(page.locator('.room-canvas')).toHaveAttribute('aria-busy','false')})

test('first screen puts the world, needs and one suggested action before optional settings',async({page})=>{
 await expect(page.getByRole('navigation',{name:'Game tools'}).getByRole('button')).toHaveCount(3)
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.locator('.build-panel')).toHaveCount(0)
 await expect(page.getByRole('region',{name:'Suggested next step'})).toContainText('Make your first little living')
 await page.getByRole('button',{name:'Try a work shift'}).click()
 await expect(page.getByRole('dialog')).toHaveAccessibleName('The workstation')
 await page.getByRole('dialog').getByRole('button',{name:/^Work a shift/}).click()
 await expect(page.getByRole('status')).toContainText('Work a shift',{timeout:15000})
 await expect(page.locator('.current-activity')).toContainText('Work a shift')
 await expect(page.getByRole('progressbar',{name:'Current activity progress'})).toBeVisible()
 await page.getByRole('button',{name:'Cancel',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('canceled')
})

test('optional tools close with Escape and restore focus; kitchen links to actual pantry',async({page})=>{
 const household=page.getByRole('button',{name:/Household/});await household.click()
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Your household')
 await expect(page.getByRole('button',{name:'Customize resident'})).toBeVisible()
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(household).toBeFocused()
 await page.getByRole('region',{name:'Your needs'}).getByRole('button',{name:/Hunger/}).click()
 await page.getByRole('button',{name:'Groceries, recipes & skills'}).click()
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Skills & pantry')
 await expect(page.getByRole('button',{name:/Order breakfast groceries/})).toBeVisible()
})

test('mobile keeps the play surface and tools in reach without horizontal scrolling',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 const tools=page.getByRole('navigation',{name:'Game tools'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await expect(tools).toBeInViewport()
 await page.getByRole('button',{name:/Build & buy/}).click()
 await expect(page.locator('.build-panel')).toBeVisible();await expect(page.locator('canvas')).toHaveAttribute('data-build-mode','true');await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.getByRole('button',{name:'Buy furniture',exact:true}).click();await expect(page.locator('.build-catalogue')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.locator('.build-panel').getByRole('button',{name:'Finish building',exact:true}).click();await expect(page.locator('canvas')).toHaveAttribute('data-build-mode','false');await page.screenshot({path:'/tmp/chainworld-play-mobile.png',fullPage:true})
})

test('keyboard walking shows its destination, nearby actions open with E, and dialogs isolate movement',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 const canvas=page.locator('canvas');await canvas.focus();await page.keyboard.press('d')
 await expect(canvas).toHaveAttribute('data-destination',JSON.stringify({x:4,y:6}))
 await expect(page.getByRole('status')).toContainText('Walking through your home')
 await expect(canvas).toHaveAttribute('data-human-frame','1')
 await expect(canvas).toHaveAttribute('data-walking','false',{timeout:5000})
 await canvas.focus();await page.keyboard.press('e');await expect(page.getByRole('dialog')).toBeVisible()
 // The projected walk can finish before the server's next clock checkpoint.
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cw_test_snapshot')!).household.humanTile)).toEqual({x:4,y:6})
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('cw_test_snapshot')!).household.humanTile)
 await page.keyboard.press('w');await page.keyboard.press('d');await page.keyboard.press('s')
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('cw_test_snapshot')!).household.humanTile)).toEqual(before)
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(canvas).toBeFocused();expect(errors).toEqual([])
})

test('a floor click redirects an ordinary walk and keeps route feedback aligned with saved state',async({page})=>{
 const canvas=page.locator('canvas')
 async function clickFloor(x:number,y:number){
  const box=(await canvas.boundingBox())!,z=Number(await canvas.getAttribute('data-camera-zoom')),sx=Number(await canvas.getAttribute('data-camera-x')),sy=Number(await canvas.getAttribute('data-camera-y')),wx=400+(x-y)*25,wy=115+(x+y)*13
  await page.mouse.click(box.x+((wx-sx-400)*z+400)*box.width/800,box.y+((wy-sy-250)*z+250)*box.height/500)
 }
 await clickFloor(6,6)
 await expect(canvas).toHaveAttribute('data-destination',JSON.stringify({x:6,y:6}))
 await clickFloor(6,4)
 await expect(canvas).toHaveAttribute('data-destination',JSON.stringify({x:6,y:4}))
 await expect(canvas).toHaveAttribute('data-walking','false',{timeout:5000})
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cw_test_snapshot')!).household.humanTile)).toEqual({x:6,y:4})
 await page.locator('.room-card').screenshot({path:'/tmp/chainworld-play-movement.png'})
})

test('liquidity from advanced jobs approaches a real desk and can be stopped',async({page})=>{
 await page.getByRole('button',{name:'Try a work shift'}).click();await page.getByRole('button',{name:'Other jobs & challenges'}).click()
 await page.getByRole('dialog').getByRole('button',{name:'Provide liquidity',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.getByRole('status')).toContainText('Provide liquidity',{timeout:15000})
 await expect(page.locator('.current-activity')).toContainText('Provide liquidity')
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cw_test_snapshot')!).action?.objectId)).toBe('starter-2-desk');await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('status')).toContainText('canceled')
})

test('outdoor care offers usable park recovery and routes sink washing to a cafe',async({page})=>{
 await page.getByRole('button',{name:'Leave home & explore'}).click();await expect(page.locator('canvas')).toHaveAttribute('data-camera-zoom','1.300')
 await page.getByRole('region',{name:'Your needs'}).getByRole('button',{name:/Energy/}).click()
 await expect(page.getByRole('dialog').getByRole('button',{name:/Unwind with a book/})).toBeEnabled()
 await page.keyboard.press('Escape')
 await page.getByRole('region',{name:'Your needs'}).getByRole('button',{name:/Hygiene/}).click()
 await expect(page.getByRole('dialog')).toContainText('Use a café kitchen to wash')
 await page.getByRole('button',{name:'Find the café',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Parallel Perk Café',exact:true})).toBeVisible({timeout:25000})
 await expect(page.locator('.room-canvas')).toHaveAttribute('aria-busy','false')
 await page.getByRole('region',{name:'Your needs'}).getByRole('button',{name:/Hygiene/}).click()
 await page.getByRole('dialog').getByRole('button',{name:/Wash at the sink/}).click()
 await expect(page.getByRole('status')).toContainText('Wash at the sink',{timeout:15000})
 // A short wash may finish before Playwright can click a transient Cancel button.
 await expect(page.getByRole('status')).toContainText('Wash at the sink complete.',{timeout:20000})
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cw_test_snapshot')!).meters.hygiene)).toBeGreaterThan(99)
})
