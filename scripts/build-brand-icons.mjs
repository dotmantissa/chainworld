// Rasterize the original vector with Chromium so browser/OS icon variants share one source.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {chromium} from '@playwright/test'

const mark=await readFile('public/brand/chainworld-mark.svg','utf8')
const shapes=mark.match(/<path\b[^>]*\/>/g)?.join('\n')
if(!shapes)throw new Error('The ChainWorld vector mark has no paths.')
const icon=(maskable=false)=>`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><title>ChainWorld</title><rect width="64" height="64" rx="${maskable?0:14}" fill="#F6F1E6"/><g transform="translate(32 32) scale(${maskable ? 0.86 : 1}) translate(-32 -32)">${shapes}</g></svg>\n`
await mkdir('public/brand',{recursive:true})
await writeFile('public/brand/chainworld-icon.svg',icon())
const browser=await chromium.launch()
try{
 const page=await browser.newPage()
 const render=async(size,maskable=false,opaque=false)=>Buffer.from(await page.evaluate(async({svg,size,opaque})=>{
  const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(svg);await image.decode()
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size
  const context=canvas.getContext('2d');if(!context)throw new Error('Icon rendering unavailable.')
  if(opaque){context.fillStyle='#F6F1E6';context.fillRect(0,0,size,size)}
  context.drawImage(image,0,0,size,size)
  return canvas.toDataURL('image/png').split(',')[1]
 },{svg:icon(maskable),size,opaque}),'base64')
 for(const size of [180,192,512])await writeFile(`public/brand/chainworld-${size}.png`,await render(size,false,size===180))
 await writeFile('public/brand/chainworld-maskable-512.png',await render(512,true))
 const sizes=[16,24,32,48,64,128,256],images=[]
 for(const size of sizes)images.push(await render(size))
 const directory=Buffer.alloc(6+16*sizes.length);directory.writeUInt16LE(1,2);directory.writeUInt16LE(sizes.length,4)
 let offset=directory.length
 images.forEach((bytes,i)=>{const at=6+16*i;directory[at]=directory[at+1]=sizes[i]===256?0:sizes[i];directory.writeUInt16LE(1,at+4);directory.writeUInt16LE(32,at+6);directory.writeUInt32LE(bytes.length,at+8);directory.writeUInt32LE(offset,at+12);offset+=bytes.length})
 await writeFile('public/favicon.ico',Buffer.concat([directory,...images]))
 console.log('Generated SVG, seven-size ICO, touch and app icons from the ChainWorld mark.')
}finally{await browser.close()}
