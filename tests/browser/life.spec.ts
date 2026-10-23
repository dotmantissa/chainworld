import {pantry,closeTools} from './playTools'
import {test,expect} from '@playwright/test'
test('orders groceries, cooks physically and resumes pantry and project on reload',async({page})=>{
 await page.route('https://**/*',r=>r.abort());const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/');await page.getByRole('button',{name:'Explore a local preview'}).click()
 await pantry(page)
 await page.getByRole('button',{name:'Start your first recipe book',exact:true}).click()
 await page.getByRole('button',{name:/Order breakfast groceries/}).click();await expect(page.getByRole('status')).toContainText('delivered')
 await closeTools(page);await page.getByText('Objects in this place',{exact:true}).click();await page.locator('.place-objects').getByRole('button',{name:'Little kitchen',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:/Cook fruit porridge/}).click()
 await expect(page.getByRole('status')).toContainText('Fruit porridge cooked',{timeout:30000})
 await page.reload();await page.getByRole('button',{name:'Explore a local preview'}).click();await pantry(page)
 await expect(page.locator('.meal-row')).toContainText('Fruit porridge');await expect(page.locator('.skill-row').filter({hasText:'Cooking'})).toContainText('15 XP')
 await expect(page.locator('.project-card').filter({hasText:'Your first recipe book'})).toContainText('1/3 sessions');expect(errors).toEqual([])
})
