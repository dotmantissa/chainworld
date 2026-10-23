import {readFile,writeFile,rename,chmod,lstat,mkdir} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {isAddress,type Address,type Hex,type PublicClient} from 'viem'
import {FAUCET_ABI,CHAIN_WORLD_REGISTRY_ABI} from '../../src/contracts/chainWorldRegistryAbi'
import {SOURCE_COLLECTION,type FaucetManifest} from '../../src/game/faucetManifest'
export class SetupError extends Error {}
export interface FaucetDeployment {version:1;chainId:10143;manifestRoot:Hex;supply:number;collection:Address;registry:Address;deployer?:Address;collectionTransaction?:Hex;registryTransaction?:Hex}
export const ADDRESS_SETTINGS=['CHOG_ADDRESS','VITE_CHOG_ADDRESS','FAUCET_ADDRESS','VITE_FAUCET_ADDRESS','REGISTRY_V2_ADDRESS','VITE_REGISTRY_V2_ADDRESS'] as const
export function applySettings(content:string,deployment:FaucetDeployment):string {
  const values:Record<string,string>={CHOG_ADDRESS:deployment.collection,VITE_CHOG_ADDRESS:deployment.collection,FAUCET_ADDRESS:deployment.collection,VITE_FAUCET_ADDRESS:deployment.collection,REGISTRY_V2_ADDRESS:deployment.registry,VITE_REGISTRY_V2_ADDRESS:deployment.registry}
  const seen=new Set<string>(),lines:string[]=[]
  for(const line of content.split(/\r?\n/)) {
    const match=line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/)
    if(match&&match[1]in values){if(!seen.has(match[1]))lines.push(`${match[1]}=${values[match[1]]}`);seen.add(match[1])}else lines.push(line)
  }
  for(const key of ADDRESS_SETTINGS)if(!seen.has(key))lines.push(`${key}=${values[key]}`)
  return lines.join('\n').replace(/\n*$/,'\n')
}
export async function atomicPrivateJson(path:string,data:unknown) {
  const temporary=`${path}.${randomUUID()}.tmp`
  await writeFile(temporary,JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});await rename(temporary,path);await chmod(path,0o600)
}
export async function configureDeployment(deployment:FaucetDeployment,paths={env:'.env',record:'data/deployments/faucet-monad-testnet.json'}) {
  if(deployment.chainId!==10143||!isAddress(deployment.collection)||!isAddress(deployment.registry))throw new SetupError('Invalid testnet deployment configuration')
  const info=await lstat(paths.env)
  if(!info.isFile()||info.isSymbolicLink())throw new SetupError('The local .env must be a regular file')
  const previous=await readFile(paths.env,'utf8'),updated=applySettings(previous,deployment),temporary=`${paths.env}.${randomUUID()}.tmp`
  await writeFile(temporary,updated,{mode:0o600,flag:'wx'});await rename(temporary,paths.env);await chmod(paths.env,0o600)
  await mkdir(paths.record.slice(0,paths.record.lastIndexOf('/'))||'.',{recursive:true})
  // Re-enabling an existing deployment keeps its original public transaction evidence.
  let record=deployment
  try{
    const previous=JSON.parse(await readFile(paths.record,'utf8')) as FaucetDeployment
    if(previous.chainId===deployment.chainId&&previous.manifestRoot===deployment.manifestRoot&&previous.collection.toLowerCase()===deployment.collection.toLowerCase()&&previous.registry.toLowerCase()===deployment.registry.toLowerCase())record={...previous,...deployment}
  }catch{/* A first deployment has no public record yet. */}
  await writeFile(paths.record,JSON.stringify(record,null,2)+'\n')
}
export async function verifyDeployment(client:Pick<PublicClient,'getChainId'|'getCode'|'readContract'>,manifest:FaucetManifest,collection:Address,registry:Address):Promise<void> {
  if(await client.getChainId()!==10143)throw new SetupError('Deployment RPC must be Monad Testnet (10143)')
  const [nftCode,registryCode]=await Promise.all([client.getCode({address:collection}),client.getCode({address:registry})])
  if(!nftCode||nftCode==='0x'||!registryCode||registryCode==='0x')throw new SetupError('Both NFT faucet and registry must have deployed contract code')
  const [root,supply,source,sourceChain,linked]=await Promise.all([
    client.readContract({address:collection,abi:FAUCET_ABI,functionName:'manifestRoot'}),
    client.readContract({address:collection,abi:FAUCET_ABI,functionName:'maxSupply'}),
    client.readContract({address:collection,abi:FAUCET_ABI,functionName:'sourceCollection'}),
    client.readContract({address:collection,abi:FAUCET_ABI,functionName:'sourceChainId'}),
    client.readContract({address:registry,abi:CHAIN_WORLD_REGISTRY_ABI,functionName:'chogContract'}),
  ])
  if(root!==manifest.root||supply!==BigInt(manifest.claims.length)||String(source).toLowerCase()!==SOURCE_COLLECTION||sourceChain!==143n||String(linked).toLowerCase()!==collection.toLowerCase())throw new SetupError('Deployed source root, supply, source collection or registry linkage does not match the verified game configuration')
}
