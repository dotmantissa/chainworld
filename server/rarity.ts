import { createHash } from 'node:crypto'
import { parseAbi } from 'viem'
import { sourceManifest } from './sourceManifest'
import type { ChogMetadata } from '../src/game/types'
import { clientFor, collection } from './chain'
import {MONAD_TESTNET_ID,MONAD_MAINNET_ID,type PlayChainId} from '../src/game/networks'
export async function verifiedRank(tokenId:number,metadata:ChogMetadata,chainId:PlayChainId=MONAD_TESTNET_ID):Promise<number|undefined> {
  const faucet=process.env.FAUCET_ADDRESS,client=clientFor(chainId)
  if(chainId===MONAD_TESTNET_ID&&(!faucet||collection(chainId).toLowerCase()!==faucet.toLowerCase()))return undefined
  let cached
  try{cached=await sourceManifest()}catch{return undefined}
  if(chainId===MONAD_MAINNET_ID){const i=cached.source.tokens.findIndex(t=>t.tokenId===tokenId),source=cached.source.tokens[i];if(!source)return undefined;const uri=await client.readContract({address:collection(chainId),abi:parseAbi(['function tokenURI(uint256) view returns(string)']),functionName:'tokenURI',args:[BigInt(tokenId)]});return uri===source.uri&&createHash('sha256').update(JSON.stringify(metadata)).digest('hex')===source.sha256?cached.claims[i].rank:undefined}
  const abi=parseAbi(['function manifestRoot() view returns (bytes32)','function sourceTokenId(uint256) view returns (uint256)'])
  const [root,original]=await Promise.all([
    client.readContract({address:faucet as `0x${string}`,abi,functionName:'manifestRoot'}),
    client.readContract({address:faucet as `0x${string}`,abi,functionName:'sourceTokenId',args:[BigInt(tokenId)]}),
  ])
  const claim=cached.claims[tokenId]
  if(root!==cached.root||!claim||original!==BigInt(claim.originalId)||createHash('sha256').update(JSON.stringify(metadata)).digest('hex')!==claim.metadataSha256)return undefined
  return claim.rank
}
