import {clickTile} from './buildTools'
import {test,expect} from './walletFixture'
test('partitions and a door form real rooms and survive reload',async({page})=>{
 test.setTimeout(150000);await page.route('https://**/*',r=>r.abort());const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/');await page.getByRole('button',{name:'Continue with my Chog'}).click();await page.getByRole('button',{name:'Play on testnet',exact:true}).click();await expect(page.locator('.room-canvas')).toHaveAttribute('aria-busy','false');await page.getByRole('button',{name:'Build & buy',exact:true}).click()
 await page.locator('.build-storage summary').click()
 for(const item of await page.locator('.owned-item').all())await item.getByRole('button',{name:'Store',exact:true}).click()
 await page.getByRole('button',{name:'Walls & doors',exact:true}).click()
 for(let y=0;y<7;y++){
  await page.getByRole('checkbox',{name:'Door opening',exact:true}).setChecked(y===3)
  await clickTile(page,3,y);await expect.poll(async()=>{const {saved}=await import('./buildTools');return (await saved(page)).household.blueprint.walls.length}).toBe(y+1)
 }
 await expect(page.locator('.room-summary')).toContainText('2 rooms');await page.locator('.room-summary summary').click();await expect(page.locator('.room-summary .detected-room')).toHaveCount(2)
 await page.reload();await page.getByRole('button',{name:'Continue with my Chog'}).click();await page.getByRole('button',{name:'Play on testnet',exact:true}).click();await expect(page.locator('.room-canvas')).toHaveAttribute('aria-busy','false');await expect(page.locator('.room-summary')).toContainText('2 rooms');expect(errors).toEqual([])
 await page.locator('.build-panel').screenshot({path:'/tmp/chainworld-detected-rooms.png'})
})
