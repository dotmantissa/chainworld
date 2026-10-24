import {test,expect} from './walletFixture'

test('slow authoritative saving does not block walking, object choices, queues or cancellation',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort())
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r}),requests:string[]=[]
 await page.route('**/api/game',async route=>{requests.push(route.request().postDataJSON().command.type);if(requests.length===1)await gate;await route.fallback()})
 await page.goto('/');await page.getByRole('button',{name:'Continue with my Chog'}).click()
 await expect(page.locator('.room-canvas')).toHaveAttribute('aria-busy','false')
 const canvas=page.locator('canvas');await canvas.focus();await page.keyboard.press('d')
 await expect(canvas).toHaveAttribute('data-destination',JSON.stringify({x:4,y:6}),{timeout:1200})
 await expect(page.locator('.save-note')).toHaveAttribute('data-sync','saving')
 await page.getByRole('region',{name:'Your needs'}).getByRole('button',{name:/Hygiene/}).click()
 await page.getByRole('dialog').getByRole('button',{name:/Take a shower/}).click()
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.getByRole('status')).toContainText('Take a shower',{timeout:8000})
 await page.getByRole('button',{name:'Cancel',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('canceled')
 expect(requests).toHaveLength(1)
 release();await expect(page.locator('.save-note')).toHaveAttribute('data-sync','saved',{timeout:15000})
 expect(requests).toContain('enqueueAction');expect(requests).toContain('cancel');expect(errors).toEqual([])
})
