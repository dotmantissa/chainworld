import { createHash } from 'node:crypto'
import { parseAbi } from 'viem'
import { sourceManifest } from './sourceManifest'
import type { ChogMetadata } from '../src/game/types'
import { chainClient, collection } from './chain'
export async function verifiedRank(tokenId:number,metadata:ChogMetadata):Promise<number|undefined> {
  const faucet=process.env.FAUCET_ADDRESS
  if(!faucet||collection().toLowerCase()!==faucet.toLowerCase())return undefined
  let cached
  try{cached=await sourceManifest()}catch{return undefined}
  const abi=parseAbi(['function manifestRoot() view returns (bytes32)','function sourceTokenId(uint256) view returns (uint256)'])
  const [root,original]=await Promise.all([
    chainClient.readContract({address:faucet as `0x${string}`,abi,functionName:'manifestRoot'}),
    chainClient.readContract({address:faucet as `0x${string}`,abi,functionName:'sourceTokenId',args:[BigInt(tokenId)]}),
  ])
  const claim=cached.claims[tokenId]
  if(root!==cached.root||!claim||original!==BigInt(claim.originalId)||createHash('sha256').update(JSON.stringify(metadata)).digest('hex')!==claim.metadataSha256)return undefined
  return claim.rank
}
