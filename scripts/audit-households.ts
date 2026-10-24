import {createHash} from 'node:crypto'
import residentMeshes from '../src/world/skeleton/character-manifest.json'
import assert from 'node:assert/strict'
import {readFile,access} from 'node:fs/promises'
import {createNewGameState} from '../src/game/gameEngine'
import {freshHousehold,SOURCE_PACKAGES} from '../src/game/household'
import {FURNITURE,validBlueprint} from '../src/game/housing'
import {calculateRarity,type SourceManifest} from '../src/game/rarity'
import {humanArtwork,furnitureArtwork,cityArtwork,materialArtwork,humanPortraitArtwork,outdoorArtwork,architectureArtwork} from '../src/world/artwork'
const source=JSON.parse(await readFile('data/chog/source-manifest.json','utf8')) as SourceManifest
const deployment=JSON.parse(await readFile('data/deployments/faucet-monad-testnet.json','utf8')) as {collection:string}
const ranks=calculateRarity(source.tokens),assets=new Set<string>(),tiers:Record<string,number>={},layouts=new Set<string>()
for(const[tokenId,token]of source.tokens.entries()){
 let state=createNewGameState('audit',tokenId,token.metadata.attributes,0,{collection:deployment.collection,rank:ranks.get(token.tokenId)!.rank,now:0})
 state.appearance={...state.appearance,sourceImage:token.metadata.image,sourceName:token.metadata.name};state=freshHousehold(state)
 const h=state.household!,pack=SOURCE_PACKAGES[h.sourceTier as keyof typeof SOURCE_PACKAGES]
 assert(pack,`Unknown source tier for ${token.tokenId}`);assert(validBlueprint(h.blueprint),`Invalid house for ${token.tokenId}`)
 assert(h.blueprint.objects.some(o=>!o.stored&&(FURNITURE[o.type].actions as readonly string[]).includes('shower')),`Missing essential shower for ${token.tokenId}`)
 assert.equal(state.gChog+h.blueprint.objects.reduce((sum,o)=>sum+FURNITURE[o.type].price,0),pack.funds)
 assert(h.blueprint.width*h.blueprint.height<=64*state.home.plots.length)
 assert.equal(state.home.plots.length,1+Math.floor(pack.level/2));assert(state.gChog>=0)
 const migrated=freshHousehold({...state,gChog:13});assert.equal(migrated.gChog,13);assert.equal(migrated.household,h)
 tiers[h.sourceTier]=(tiers[h.sourceTier]??0)+1;layouts.add(JSON.stringify(h.blueprint.objects))
 for(const gender of ['female','male','nonbinary']as const)for(const asset of humanArtwork({...state,profile:{...state.profile,gender}}))assets.add(asset.url)
}
for(const type of Object.keys(FURNITURE)as(keyof typeof FURNITURE)[])for(const r of[0,1])assets.add(furnitureArtwork(type,r).url)
for(let city=0;city<5;city++)for(const asset of cityArtwork(city))assets.add(asset.url)
for(const asset of[...materialArtwork,...humanPortraitArtwork,...outdoorArtwork,...architectureArtwork])assets.add(asset.url)
await Promise.all([...assets].map(url=>access('public'+url)))
for(const file of Object.values(residentMeshes)){const bytes=await readFile('public'+file.url);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256)}
console.log(JSON.stringify({residentMeshesVerified:Object.keys(residentMeshes).length,households:source.tokens.length,tiers,distinctFurnitureLayouts:layouts.size,assetsVerified:assets.size,checks:'Every source household has a reachable shower; source-tier cash plus furniture conserved; legal accessible layouts; usable floor fits granted land; migration never regrants; NFT-seeded human assets exist for every presentation.'},null,2))
