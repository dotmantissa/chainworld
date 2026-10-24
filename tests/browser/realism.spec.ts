import {test,expect} from './walletFixture'
import {place} from './buildTools'
test.beforeEach(async({page})=>{await page.route('https://**/*',r=>r.abort());await page.goto('/');await page.getByRole('button',{name:'Continue with my Chog'}).click();await page.getByRole('button',{name:'Play on testnet',exact:true}).click();await expect(page.locator('.room-canvas')).toHaveAttribute('aria-busy','false')})
test('buys bathroom fixtures, uses them physically and preserves them across reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.getByRole('button',{name:'Build & buy',exact:true}).click();await place(page,'Oak washbasin');await place(page,'Rain shower');await page.locator('.build-panel').getByRole('button',{name:'Finish building',exact:true}).click()
 await page.getByText('Objects in this place',{exact:true}).click();await page.locator('.place-objects').getByRole('button',{name:'Oak washbasin',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveAccessibleName('The washbasin');await expect(page.getByRole('dialog').getByRole('button',{name:/Cook/})).toHaveCount(0)
 await page.getByRole('dialog').getByRole('button',{name:/Wash at the sink/}).click();await expect(page.getByRole('status')).toContainText('Wash at the sink complete',{timeout:18000})
 await page.locator('.place-objects').getByRole('button',{name:'Rain shower',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:/Take a shower/}).click()
 await expect(page.locator('canvas')).toHaveAttribute('data-activity','shower',{timeout:15000});await expect(page.locator('canvas')).toHaveAttribute('data-privacy','blurred');await expect(page.locator('canvas')).toHaveAttribute('data-animation-backend','skinned-mesh');await page.locator('.room-card').screenshot({path:'/tmp/chainworld-realism-shower.png'})
 await expect(page.getByRole('status')).toContainText('Take a shower complete',{timeout:10000})
 await page.reload();await page.getByRole('button',{name:'Continue with my Chog'}).click();await page.getByRole('button',{name:'Play on testnet',exact:true}).click();await page.getByRole('button',{name:'Build & buy',exact:true}).click()
 await page.locator('.build-storage summary').click();await expect(page.locator('.owned-item').filter({hasText:'Rain shower'})).toBeVisible();await expect(page.locator('.owned-item').filter({hasText:'Oak washbasin'})).toBeVisible();expect(errors).toEqual([])
})
test('sleep uses a lying pose and a quiet activity marker, without a network wait bubble',async({page})=>{
 await page.getByRole('region',{name:'Your needs'}).getByRole('button',{name:/Energy/}).click();await page.getByRole('dialog').getByRole('button',{name:/^Sleep/}).click()
 await expect(page.locator('canvas')).toHaveAttribute('data-activity','sleep',{timeout:15000});await page.locator('.room-card').screenshot({path:'/tmp/chainworld-realism-sleep.png'})
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('status')).toContainText('canceled')
})
