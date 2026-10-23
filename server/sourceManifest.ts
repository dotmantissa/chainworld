import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { buildFaucetManifest, validateSource, type FaucetManifest } from '../src/game/faucetManifest'

let cached:Promise<FaucetManifest>|undefined
export function sourceManifest():Promise<FaucetManifest> {
  return cached??=loadManifest().catch(error=>{cached=undefined;throw error})
}
async function loadManifest():Promise<FaucetManifest> {
  const parsed=JSON.parse(await readFile(`${process.cwd()}/public/faucet-manifest.json`,'utf8')) as FaucetManifest
  if(parsed.verifiedOnChain!==true)throw new Error('The source manifest has not been verified against mainnet')
  validateSource(parsed.source)
  for(const token of parsed.source.tokens) {
    if(createHash('sha256').update(JSON.stringify(token.metadata)).digest('hex')!==token.sha256)throw new Error('Source metadata hash mismatch')
  }
  const computed=buildFaucetManifest(parsed.source,true)
  if(computed.root!==parsed.root||JSON.stringify(computed.claims)!==JSON.stringify(parsed.claims))throw new Error('Source proof manifest mismatch')
  return computed
}
