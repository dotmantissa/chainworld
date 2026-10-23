import { decodeEventLog, type Address, type Hex } from 'viem'
import { FAUCET_ABI } from '../contracts/chainWorldRegistryAbi'
import { SOURCE_COLLECTION, verifySourceProof, type FaucetManifest } from './faucetManifest'

let cached:Promise<FaucetManifest>|undefined
export function loadFaucetManifest(refresh=false):Promise<FaucetManifest> {
  if(refresh)cached=undefined
  return cached??=fetch('/faucet-manifest.json',{signal:AbortSignal.timeout(15000)}).then(async response=>{
    if(!response.ok)throw new Error('The verified NFT catalogue could not be loaded.')
    const manifest=await response.json() as FaucetManifest
    if(manifest.verifiedOnChain!==true||!/^0x[0-9a-f]{64}$/i.test(manifest.root)||manifest.source?.chainId!==143||manifest.source.collection.toLowerCase()!==SOURCE_COLLECTION||manifest.claims?.length!==1969||manifest.source.tokens?.length!==1969)throw new Error('The NFT catalogue is not a verified source manifest.')
    return manifest
  }).catch(error=>{cached=undefined;throw error})
}
export function faucetEntry(manifest:FaucetManifest,index:number) {
  const claim=manifest.claims[index],source=manifest.source.tokens[index]
  if(!Number.isSafeInteger(index)||index<0||!claim||!source||source.tokenId!==claim.originalId||source.uri!==claim.uri||!verifySourceProof(manifest.root,index,claim.originalId,claim.uri,claim.proof))throw new Error('This claim does not match the source proof. Refresh the faucet.')
  return {claim,source}
}
export function claimedToken(logs:readonly {address:Address;data:Hex;topics:readonly Hex[]}[],collection:Address,player:Address):number|null {
  for(const log of logs) {
    if(log.address.toLowerCase()!==collection.toLowerCase())continue
    try {
      const event=decodeEventLog({abi:FAUCET_ABI,eventName:'Claimed',data:log.data,topics:[...log.topics] as [Hex,...Hex[]],strict:true})
      if(event.args.player.toLowerCase()===player.toLowerCase()&&event.args.tokenId<=BigInt(Number.MAX_SAFE_INTEGER))return Number(event.args.tokenId)
    }catch{/* Ignore unrelated or malformed receipt events. */}
  }
  return null
}
