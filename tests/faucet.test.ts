import {describe,it,expect} from 'vitest'
import {encodeEventTopics, type Address,type PublicClient} from 'viem'
import {mkdtemp,writeFile,readFile,stat,rm,symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {FAUCET_ABI} from '../src/contracts/chainWorldRegistryAbi'
import {claimedToken,faucetEntry} from '../src/game/faucet'
import {buildFaucetManifest,SOURCE_COLLECTION} from '../src/game/faucetManifest'
import {applySettings,configureDeployment,verifyDeployment,type FaucetDeployment} from '../scripts/lib/faucetSetup'
const nft='0x1111111111111111111111111111111111111111' as Address,registry='0x2222222222222222222222222222222222222222' as Address,player='0x3333333333333333333333333333333333333333' as Address
const manifest=buildFaucetManifest({version:1,chainId:143,collection:SOURCE_COLLECTION,snapshotBlock:115722652,scoring:'trait-frequency-v1',tokens:[1,2,3].map(id=>({tokenId:id,uri:`ipfs://source/${100+id}.json`,sha256:'0'.repeat(64),metadata:{name:`Source ${id}`,image:`ipfs://art/${id}.webp`,attributes:[{trait_type:'Skin',value:id===1?'Pink':'Origin'}]}}))},true)
const deployment:FaucetDeployment={version:1,chainId:10143,manifestRoot:manifest.root,supply:3,collection:nft,registry}
describe('NFT faucet receipts and activation',()=>{
 it('selects minted token zero only from the configured collection and connected wallet',()=>{
  const topics=encodeEventTopics({abi:FAUCET_ABI,eventName:'Claimed',args:{player,tokenId:0n,originalTokenId:1n}}) as readonly `0x${string}`[]
  expect(claimedToken([{address:nft,topics,data:'0x'}],nft,player)).toBe(0)
  expect(claimedToken([{address:registry,topics,data:'0x'}],nft,player)).toBeNull()
  expect(claimedToken([{address:nft,topics,data:'0x'}],nft,registry)).toBeNull()
  expect(claimedToken([{address:nft,topics:[],data:'0xdead'}],nft,player)).toBeNull()
 })
 it('binds the next copy index to its original ID and URI rather than the filename',()=>{
  expect(faucetEntry(manifest,0).claim.originalId).toBe(1)
  expect(faucetEntry(manifest,0).claim.uri).toBe('ipfs://source/101.json')
  const altered=structuredClone(manifest);altered.claims[0].originalId=101
  expect(()=>faucetEntry(altered,0)).toThrow()
  expect(()=>faucetEntry(manifest,3)).toThrow()
 })
 it('updates all server/browser addresses without altering other local configuration',()=>{
  const original='DATABASE_URL=keep-private\nDEPLOYER_PRIVATE_KEY=keep-private-too\nVITE_CHOG_ADDRESS=old\nCHOG_ADDRESS=old\nCHOG_ADDRESS=duplicate\n# a note\n'
  const updated=applySettings(original,deployment)
  expect(updated).toContain('DATABASE_URL=keep-private\n')
  expect(updated).toContain('DEPLOYER_PRIVATE_KEY=keep-private-too\n')
  expect(updated.match(/^CHOG_ADDRESS=/gm)).toHaveLength(1)
  for(const key of ['CHOG_ADDRESS','VITE_CHOG_ADDRESS','FAUCET_ADDRESS','VITE_FAUCET_ADDRESS'])expect(updated).toContain(`${key}=${nft}`)
  expect(updated).toContain(`REGISTRY_V2_ADDRESS=${registry}`);expect(updated).toContain(`VITE_REGISTRY_V2_ADDRESS=${registry}`)
 })
 it('writes activation atomically with private file permissions and refuses symlinked environments',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'chainworld-faucet-'))
  try{
   const env=join(dir,'.env'),record=join(dir,'records/deployment.json')
   await writeFile(env,'DATABASE_URL=private-fixture\n')
   await configureDeployment(deployment,{env,record})
   expect((await stat(env)).mode&0o777).toBe(0o600)
   expect(await readFile(env,'utf8')).toContain('DATABASE_URL=private-fixture')
   expect(JSON.parse(await readFile(record,'utf8')).collection).toBe(nft)
   await configureDeployment({...deployment,deployer:player,collectionTransaction:`0x${'1'.repeat(64)}`},{env,record})
   await configureDeployment(deployment,{env,record})
   expect(JSON.parse(await readFile(record,'utf8')).deployer).toBe(player)
   expect(JSON.parse(await readFile(record,'utf8')).collectionTransaction).toBe(`0x${'1'.repeat(64)}`)
   const link=join(dir,'.env.link');await symlink(env,link)
   await expect(configureDeployment(deployment,{env:link,record})).rejects.toThrow('regular file')
  }finally{await rm(dir,{recursive:true,force:true})}
 })
 it('rejects wrong network, unverified roots and registry linkage before activation',async()=>{
  const createClient=(override:Record<string,unknown>={})=>({getChainId:async()=>10143,getCode:async()=>'0x6000',readContract:async({functionName}:{functionName:string})=>({manifestRoot:manifest.root,maxSupply:3n,sourceCollection:SOURCE_COLLECTION,sourceChainId:143n,chogContract:nft,...override})[functionName]}) as unknown as Pick<PublicClient,'getChainId'|'getCode'|'readContract'>
  await expect(verifyDeployment(createClient(),manifest,nft,registry)).resolves.toBeUndefined()
  await expect(verifyDeployment({...createClient(),getChainId:async()=>143},manifest,nft,registry)).rejects.toThrow('Monad Testnet')
  await expect(verifyDeployment(createClient({manifestRoot:'0x'+'0'.repeat(64)}),manifest,nft,registry)).rejects.toThrow('does not match')
  await expect(verifyDeployment(createClient({chogContract:registry}),manifest,nft,registry)).rejects.toThrow('does not match')
  await expect(verifyDeployment({...createClient(),getCode:async()=>'0x'},manifest,nft,registry)).rejects.toThrow('deployed contract code')
 })
})
