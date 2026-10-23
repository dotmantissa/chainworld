import { buildLandManifest } from '../src/game/landManifest'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createPublicClient, http, parseAbi } from 'viem'
import { mainnet } from 'viem/chains'
import { buildFaucetManifest, validateSource } from '../src/game/faucetManifest'
import type { SourceManifest } from '../src/game/rarity'
import { serverFetch } from '../server/httpClient'
import { fetchMetadata } from '../src/game/metadata'
const path=process.argv[2]
if(!path)throw new Error('Usage: npm run metadata:validate -- path/to/source-manifest.json [--offline]')
const source=JSON.parse(await readFile(path,'utf8')) as SourceManifest
validateSource(source)
for(const token of source.tokens){const actual=createHash('sha256').update(JSON.stringify(token.metadata)).digest('hex');if(actual!==token.sha256)throw new Error(`Metadata hash mismatch for original token ${token.tokenId}`)}
const offline=process.argv.includes('--offline')
if(!offline){
  const client=createPublicClient({chain:mainnet,transport:http(process.env.MONAD_MAINNET_RPC_URL??'https://rpc.monad.xyz',{fetchFn:serverFetch})})
  if(await client.getChainId()!==143)throw new Error('Source RPC is not Monad mainnet')
  const abi=parseAbi(['function tokenURI(uint256) view returns (string)'])
  for(let i=0;i<source.tokens.length;i+=4){
    await Promise.all(source.tokens.slice(i,i+4).map(async token=>{
      const uri=await client.readContract({address:source.collection as `0x${string}`,abi,functionName:'tokenURI',args:[BigInt(token.tokenId)],blockNumber:BigInt(source.snapshotBlock)})
      if(uri!==token.uri)throw new Error(`Original token ${token.tokenId} has a different URI at the snapshot block`)
      const metadata=await fetchMetadata(uri,AbortSignal.timeout(45000),serverFetch)
      if(createHash('sha256').update(JSON.stringify(metadata)).digest('hex')!==token.sha256)throw new Error(`Original metadata differs for ${token.tokenId}`)
    }))
    console.log(`Verified ${Math.min(i+4,source.tokens.length)}/${source.tokens.length} source tokens`)
  }
}
const artifact=buildFaucetManifest(source,!offline)
await mkdir('public',{recursive:true})
await writeFile('public/faucet-manifest.json',JSON.stringify(artifact))
await writeFile('public/land-rarity-manifest.json',JSON.stringify(buildLandManifest(source)))
console.log(`Manifest ready: root ${artifact.root}; ${source.tokens.length} tokens; on-chain verified: ${!offline}`)
