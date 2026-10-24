import {MAINNET_CHOG,MONAD_MAINNET_ID,MONAD_TESTNET_ID,type PlayChainId} from '../src/game/networks'
import { serverFetch } from './httpClient'
import { createPublicClient, defineChain, http, isAddress, parseAbi } from 'viem'
import { validMetadata } from '../src/game/rarity'
import { sourceManifest } from './sourceManifest'
export const nftAbi=parseAbi(['function ownerOf(uint256) view returns (address)','function tokenURI(uint256) view returns (string)'])
const makeClient=(id:PlayChainId,rpc:string)=>createPublicClient({chain:defineChain({id,name:id===143?'Monad Mainnet':'Monad Testnet',nativeCurrency:{name:'MON',symbol:'MON',decimals:18},rpcUrls:{default:{http:[rpc]}}}),transport:http(rpc,{timeout:10000,fetchFn:serverFetch,batch:{wait:10}})})
export const chainClient=makeClient(MONAD_TESTNET_ID,process.env.MONAD_TESTNET_RPC_URL??'https://testnet-rpc.monad.xyz')
const mainnetClient=makeClient(MONAD_MAINNET_ID,process.env.MONAD_MAINNET_RPC_URL??'https://rpc.monad.xyz')
export const clientFor=(chainId:PlayChainId=MONAD_TESTNET_ID)=>chainId===MONAD_MAINNET_ID?mainnetClient:chainClient
export function collection(chainId:PlayChainId=MONAD_TESTNET_ID) {
  if(chainId===MONAD_MAINNET_ID)return MAINNET_CHOG
  const address=process.env.CHOG_ADDRESS??process.env.VITE_CHOG_ADDRESS??'0x32A325b0640594377D0708Ca9081c93da95e1908'
  if(!isAddress(address))throw new Error('Invalid CHOG_ADDRESS')
  return address
}
export async function tokenMetadata(tokenId:number,chainId:PlayChainId=MONAD_TESTNET_ID) {
  const client=clientFor(chainId),address=collection(chainId)
  const uri=await client.readContract({address,abi:nftAbi,functionName:'tokenURI',args:[BigInt(tokenId)]})
  if(chainId===MONAD_MAINNET_ID){const manifest=await sourceManifest(),source=manifest.source.tokens.find(t=>t.tokenId===tokenId);if(source?.uri===uri)return source.metadata}
  if(chainId===MONAD_TESTNET_ID&&process.env.FAUCET_ADDRESS?.toLowerCase()===address.toLowerCase()){
    const manifest=await sourceManifest()
    const claim=manifest.claims[tokenId],source=manifest.source.tokens[tokenId]
    const abi=parseAbi(['function manifestRoot() view returns(bytes32)','function sourceTokenId(uint256) view returns(uint256)'])
    const [root,original]=await Promise.all([
      client.readContract({address,abi,functionName:'manifestRoot'}),
      client.readContract({address,abi,functionName:'sourceTokenId',args:[BigInt(tokenId)]}),
    ])
    if(!claim||!source||root!==manifest.root||uri!==claim.uri||original!==BigInt(claim.originalId)||source.tokenId!==claim.originalId)throw new Error('The claimed NFT does not match the verified source manifest')
    return source.metadata
  }
  if(uri.startsWith('data:application/json')){
    const split=uri.indexOf(',')
    if(split<0||uri.length>2_000_000)throw new Error('Invalid inline metadata')
    const text=uri.slice(0,split).includes(';base64')?Buffer.from(uri.slice(split+1),'base64').toString('utf8'):decodeURIComponent(uri.slice(split+1))
    const metadata:unknown=JSON.parse(text)
    if(!validMetadata(metadata))throw new Error('Invalid source traits')
    return metadata
  }
  const {metadataUrls,fetchMetadata}=await import('../src/game/metadata')
  const allowed=(process.env.METADATA_HOSTS??'ipfs.io,gateway.pinata.cloud,ipfs.filebase.io,dweb.link').split(',')
  const urls=metadataUrls(uri)
  if(urls.some(url=>{const parsed=new URL(url);return parsed.protocol!=='https:'||!allowed.includes(parsed.hostname)||!!parsed.port||!!parsed.username||!!parsed.password}))throw new Error('Metadata host is not approved')
  return fetchMetadata(uri,AbortSignal.timeout(40000),serverFetch)
}
