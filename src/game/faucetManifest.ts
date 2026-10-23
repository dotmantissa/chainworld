import { concatHex, encodeAbiParameters, keccak256, parseAbiParameters, type Hex } from 'viem'
import { calculateRarity, validMetadata, type SourceManifest } from './rarity'
export interface FaucetClaim { originalId:number; uri:string; metadataSha256:string; rank:number; proof:Hex[] }
export interface FaucetManifest { root:Hex; verifiedOnChain:boolean; source:SourceManifest; claims:FaucetClaim[] }
export const SOURCE_COLLECTION='0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763'
export function validateSource(source:SourceManifest,expectedSupply=1969):void {
  if(source.version!==1||source.chainId!==143||source.collection.toLowerCase()!==SOURCE_COLLECTION||source.scoring!=='trait-frequency-v1'||!Number.isSafeInteger(source.snapshotBlock)||source.snapshotBlock<=0||source.tokens.length!==expectedSupply)throw new Error('Source manifest identity, supply or snapshot is invalid')
  const ids=new Set<number>()
  for(const token of source.tokens){
    if(!Number.isSafeInteger(token.tokenId)||token.tokenId<0||ids.has(token.tokenId)||!/^ipfs:\/\//.test(token.uri)||!/^[a-f0-9]{64}$/.test(token.sha256)||!validMetadata(token.metadata))throw new Error('Invalid source token, metadata, URI or hash')
    ids.add(token.tokenId)
  }
}
export function sourceLeaf(index:number,originalId:number,uri:string):Hex {
  return keccak256(keccak256(encodeAbiParameters(parseAbiParameters('uint256,uint256,string'),[BigInt(index),BigInt(originalId),uri])))
}
function pair(a:Hex,b:Hex):Hex { return keccak256(concatHex(a.toLowerCase()<b.toLowerCase()?[a,b]:[b,a])) }
export function verifySourceProof(root:Hex,index:number,originalId:number,uri:string,proof:Hex[]):boolean {
  return proof.reduce((hash,sibling)=>pair(hash,sibling),sourceLeaf(index,originalId,uri))===root
}
export function buildFaucetManifest(source:SourceManifest,verifiedOnChain=false):FaucetManifest {
  const rarity=calculateRarity(source.tokens)
  const levels:Hex[][]=[source.tokens.map((t,i)=>sourceLeaf(i,t.tokenId,t.uri))]
  while(levels[levels.length-1].length>1){
    const previous=levels[levels.length-1],next:Hex[]=[]
    for(let i=0;i<previous.length;i+=2)next.push(previous[i+1]?pair(previous[i],previous[i+1]):previous[i])
    levels.push(next)
  }
  const claims=source.tokens.map((t,index)=>{
    const proof:Hex[]=[];let at=index
    for(const level of levels.slice(0,-1)){const sibling=level[at^1];if(sibling)proof.push(sibling);at=Math.floor(at/2)}
    return {originalId:t.tokenId,uri:t.uri,metadataSha256:t.sha256,rank:rarity.get(t.tokenId)!.rank,proof}
  })
  return {root:levels[levels.length-1][0],verifiedOnChain,source,claims}
}
