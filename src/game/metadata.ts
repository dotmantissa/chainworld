import { validMetadata } from './rarity'
import type { ChogMetadata } from './types'
export const IPFS_GATEWAYS=['https://ipfs.filebase.io/ipfs/','https://gateway.pinata.cloud/ipfs/','https://ipfs.io/ipfs/']
export function metadataUrls(uri:string):string[] {
  if(uri.startsWith('ipfs://')) {
    const path=uri.slice(7).replace(/^ipfs\//,'')
    if(!/^[a-zA-Z0-9]+(?:\/[^?#\s]*)?$/.test(path)||path.split('/').some(part=>part==='..'||part==='.'))throw new Error('Invalid IPFS address')
    return IPFS_GATEWAYS.map(gateway=>`${gateway}${path}`)
  }
  if(/^https:\/\//.test(uri)||/^data:application\/json[;,]/.test(uri))return [uri]
  throw new Error('Unsupported metadata URI')
}
export async function fetchMetadata(uri:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<ChogMetadata> {
  for(const url of metadataUrls(uri)) {
    if(signal.aborted)throw signal.reason
    try {
      const response=await fetcher(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(12000)]),redirect:'error'})
      if(!response.ok)continue
      const data:unknown=await response.json()
      if(validMetadata(data))return data
    }catch(error){if(signal.aborted)throw error}
  }
  throw new Error('Original NFT metadata could not be retrieved from the available gateways. Retry NFT loading.')
}
