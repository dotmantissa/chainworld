import {test,expect} from '@playwright/test'
test('partitions and a door form real rooms and survive reload',async({page})=>{
 await page.route('https://**/*',r=>r.abort());const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/');await page.getByRole('button',{name:'Explore a local preview'}).click();await page.getByRole('button',{name:'Build & buy',exact:true}).click()
 for(const item of await page.locator('.owned-item').all())await item.getByRole('button',{name:'Store',exact:true}).click()
 await page.getByRole('button',{name:'Walls & doors',exact:true}).click()
 for(let y=0;y<7;y++){
  await page.getByRole('checkbox',{name:'Door opening',exact:true}).setChecked(y===3)
  await page.getByRole('button',{name:`Build cell 4, ${y+1}`,exact:true}).click()
  await page.getByRole('button',{name:y===3?/Add door opening/:/Add partition/}).click()
 }
 await expect(page.locator('.room-summary')).toContainText('2 rooms');await expect(page.locator('.room-summary .detected-room')).toHaveCount(2)
 await page.reload();await page.getByRole('button',{name:'Explore a local preview'}).click();await page.getByRole('button',{name:'Build & buy',exact:true}).click()
 await expect(page.locator('.room-summary')).toContainText('2 rooms');expect(errors).toEqual([])
 await page.locator('.build-panel').screenshot({path:'/tmp/chainworld-detected-rooms.png'})
})
