import { buildLandManifest } from '../src/game/landManifest'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { decodeAbiParameters, parseAbiParameters } from 'viem'
import { serverFetch } from '../server/httpClient'
import { SOURCE_COLLECTION, buildFaucetManifest, validateSource } from '../src/game/faucetManifest'
import { validMetadata, type SourceManifest, type SourceToken } from '../src/game/rarity'

// Read-only, resumable collection acquisition. Never infer an original ID from a filename.
const directory = 'data/chog'
const rpc = process.env.MONAD_MAINNET_RPC_URL ?? 'https://rpc.monad.xyz'
const gateways = ['https://ipfs.filebase.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/']
interface Checkpoint { snapshotBlock:number; supply:number; uris:Record<string,string>; tokens:Record<string,SourceToken> }
await mkdir(directory, { recursive:true })
async function atomic(path:string, value:unknown) {
  await writeFile(`${path}.tmp`, JSON.stringify(value)); await rename(`${path}.tmp`, path)
}
async function retry<T>(run:()=>Promise<T>):Promise<T> {
  let last:unknown
  for(let attempt=0;attempt<4;attempt++) {
    try { return await run() } catch(error) { last=error; if(attempt<3)await new Promise(resolve=>setTimeout(resolve,1000*2**attempt)) }
  }
  throw last
}
interface RpcResult { id:number; result?:string; error?:{message:string} }
async function batch(requests:{id:number;method:string;params:unknown[]}[]):Promise<RpcResult[]> {
  return retry(async()=>{
    const response=await serverFetch(rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(requests.map(r=>({jsonrpc:'2.0',...r}))),signal:AbortSignal.timeout(30000)})
    if(!response.ok)throw new Error(`RPC HTTP ${response.status}`)
    const result:unknown=await response.json()
    if(!Array.isArray(result)||result.length!==requests.length)throw new Error('Incomplete RPC batch')
    return result as RpcResult[]
  })
}
function result(results:RpcResult[],id:number):string {
  const record=results.find(r=>r.id===id)
  if(!record?.result)throw new Error(`RPC ${id}: ${record?.error?.message??'missing result'}`)
  return record.result
}
let checkpoint:Checkpoint
try { checkpoint=JSON.parse(await readFile(`${directory}/checkpoint.json`,'utf8')) as Checkpoint }
catch(error) {
  if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error
  const head=await batch([{id:1,method:'eth_chainId',params:[]},{id:2,method:'eth_blockNumber',params:[]}])
  if(Number(BigInt(result(head,1)))!==143)throw new Error('Source must be Monad mainnet')
  const snapshotBlock=Number(BigInt(result(head,2)))-20
  const supplyResponse=await batch([{id:3,method:'eth_call',params:[{to:SOURCE_COLLECTION,data:'0x18160ddd'},`0x${snapshotBlock.toString(16)}`]}])
  const supply=Number(BigInt(result(supplyResponse,3)))
  if(supply!==1969)throw new Error(`Expected original collection supply 1969, received ${supply}`)
  // Verify the collection's contiguous range using both boundary ownerOf calls.
  const boundaries=await batch([0,1,supply,supply+1].map(id=>({id,method:'eth_call',params:[{to:SOURCE_COLLECTION,data:`0x6352211e${BigInt(id).toString(16).padStart(64,'0')}`},`0x${snapshotBlock.toString(16)}`]})))
  if(!boundaries.find(r=>r.id===0)?.error||!boundaries.find(r=>r.id===supply+1)?.error)throw new Error('Unexpected minted ID range; inspect Transfer events before proceeding')
  result(boundaries,1);result(boundaries,supply)
  checkpoint={snapshotBlock,supply,uris:{},tokens:{}}
  await atomic(`${directory}/checkpoint.json`,checkpoint)
}
if(!Number.isSafeInteger(checkpoint.snapshotBlock)||checkpoint.supply!==1969)throw new Error('Invalid source checkpoint')
const chain=await batch([{id:1,method:'eth_chainId',params:[]}])
if(Number(BigInt(result(chain,1)))!==143)throw new Error('Source must be Monad mainnet')
console.log(`Original Chog: ${checkpoint.supply} tokens; Monad block ${checkpoint.snapshotBlock}`)
const ids=Array.from({length:checkpoint.supply},(_,index)=>index+1)
// Sequential batches limit public RPC load; every token also proves existence at the snapshot.
for(let start=0;start<ids.length;start+=24) {
  const missing=ids.slice(start,start+24).filter(id=>!checkpoint.uris[id])
  if(!missing.length)continue
  const records=await batch(missing.flatMap(id=>[
    {id:id*2,method:'eth_call',params:[{to:SOURCE_COLLECTION,data:`0xc87b56dd${BigInt(id).toString(16).padStart(64,'0')}`},`0x${checkpoint.snapshotBlock.toString(16)}`]},
    {id:id*2+1,method:'eth_call',params:[{to:SOURCE_COLLECTION,data:`0x6352211e${BigInt(id).toString(16).padStart(64,'0')}`},`0x${checkpoint.snapshotBlock.toString(16)}`]},
  ]))
  for(const id of missing) {
    result(records,id*2+1)
    const [uri]=decodeAbiParameters(parseAbiParameters('string'),result(records,id*2) as `0x${string}`)
    if(!/^ipfs:\/\/[a-zA-Z0-9]+\/.+\.json$/.test(uri))throw new Error(`Unexpected tokenURI for ${id}`)
    checkpoint.uris[id]=uri
  }
  await atomic(`${directory}/checkpoint.json`,checkpoint)
  console.log(`Contract URIs: ${Object.keys(checkpoint.uris).length}/${checkpoint.supply}`)
}
for(const id of ids) {
  if(checkpoint.tokens[id])continue
  try {
    const cached=JSON.parse(await readFile(`${directory}/${id}.json`,'utf8')) as SourceToken
    if(cached.tokenId===id&&cached.uri===checkpoint.uris[id]&&validMetadata(cached.metadata)&&cached.sha256===createHash('sha256').update(JSON.stringify(cached.metadata)).digest('hex'))checkpoint.tokens[id]=cached
  }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
}
const missing=ids.filter(id=>!checkpoint.tokens[id])
const failures:number[]=[]
let next=0,completed=Object.keys(checkpoint.tokens).length
await Promise.all(Array.from({length:8},async()=>{
  while(next<missing.length) {
    const id=missing[next++],uri=checkpoint.uris[id]
    try {
    const metadata=await retry(async()=>{
      for(const gateway of gateways) {
        try {
          const response=await serverFetch(`${gateway}${uri.slice(7)}`,{signal:AbortSignal.timeout(25000),redirect:'error'})
          if(!response.ok)continue
          const body:unknown=await response.json()
          if(validMetadata(body))return body
        }catch{ /* Try the independent IPFS gateway before retrying. */ }
      }
      throw new Error(`Cannot retrieve original token ${id}`)
    })
    checkpoint.tokens[id]={tokenId:id,uri,metadata,sha256:createHash('sha256').update(JSON.stringify(metadata)).digest('hex')}
    // Per-token atomic cache avoids a large shared checkpoint write race between workers.
    await atomic(`${directory}/${id}.json`,checkpoint.tokens[id])
    completed++
    if(completed%50===0||completed===checkpoint.supply)console.log(`Authentic metadata: ${completed}/${checkpoint.supply}`)
    }catch{failures.push(id);console.log(`Deferred source token ${id}; continuing other records`)}
  }
})).catch(async error=>{
  await atomic(`${directory}/checkpoint.json`,checkpoint)
  throw error
})
await atomic(`${directory}/checkpoint.json`,checkpoint)
if(failures.length)throw new Error(`${failures.length} source records need retry. Rerun metadata:fetch; all successful records are cached.`)
const source:SourceManifest={version:1,chainId:143,collection:SOURCE_COLLECTION,snapshotBlock:checkpoint.snapshotBlock,scoring:'trait-frequency-v1',tokens:ids.map(id=>checkpoint.tokens[id])}
validateSource(source)
await atomic(`${directory}/source-manifest.json`,source)
await mkdir('public',{recursive:true})
const manifest=buildFaucetManifest(source,true)
await atomic('public/faucet-manifest.json',manifest)
await atomic('public/land-rarity-manifest.json',buildLandManifest(source))
const traits:Record<string,Record<string,number>>={}
for(const token of source.tokens)for(const attribute of token.metadata.attributes){const values=traits[attribute.trait_type]??={};values[attribute.value]=(values[attribute.value]??0)+1}
await atomic(`${directory}/trait-catalogue.json`,traits)
console.log(`Verified source manifest ready: ${source.tokens.length} tokens, ${Object.keys(traits).length} categories; root ${manifest.root}`)
