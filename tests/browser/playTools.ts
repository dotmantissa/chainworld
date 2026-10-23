import type {Page} from '@playwright/test'
export async function household(page:Page){await page.getByRole('button',{name:'Household',exact:true}).click()}
export async function closeTools(page:Page){await page.getByRole('button',{name:'Close game tools',exact:true}).click()}
export async function goals(page:Page){await household(page);await page.getByRole('button',{name:/^Goals & rewards/}).click()}
export async function pantry(page:Page){await household(page);await page.getByRole('button',{name:'Skills & pantry',exact:true}).click()}
export async function world(page:Page){await page.getByRole('button',{name:'Travel & neighbors',exact:true}).click()}
export async function quick(page:Page,name:string){const controls=page.locator('.quick-actions');if(!await controls.getAttribute('open').then(v=>v!==null))await controls.getByText('Quick actions & controls',{exact:true}).click();await controls.getByRole('button',{name}).click()}
export async function jobs(page:Page){await quick(page,'Work a shift');await page.getByRole('button',{name:'Other jobs & challenges'}).click()}
