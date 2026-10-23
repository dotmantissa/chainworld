import {concatHex,encodeAbiParameters,keccak256,parseAbiParameters,type Hex} from 'viem'
import {calculateRarity,type SourceManifest} from './rarity'
export function landRarityLeaf(originalId:number,rank:number):Hex {
  return keccak256(keccak256(encodeAbiParameters(parseAbiParameters('uint256,uint16'),[BigInt(originalId),rank])))
}
export function buildLandManifest(source:SourceManifest){
 const scores=calculateRarity(source.tokens)
 const layers:Hex[][]=[source.tokens.map(t=>landRarityLeaf(t.tokenId,scores.get(t.tokenId)!.rank))]
 while(layers[layers.length-1].length>1){const previous=layers[layers.length-1],next:Hex[]=[];for(let i=0;i<previous.length;i+=2){const a=previous[i],b=previous[i+1];next.push(b?keccak256(concatHex(a<b?[a,b]:[b,a])):a)}layers.push(next)}
 return{version:1,sourceCollection:source.collection,sourceChainId:source.chainId,snapshotBlock:source.snapshotBlock,root:layers[layers.length-1][0],claims:source.tokens.map((token,index)=>{const proof:Hex[]=[];let at=index;for(const layer of layers.slice(0,-1)){if(layer[at^1])proof.push(layer[at^1]);at=Math.floor(at/2)}return{originalId:token.tokenId,rank:scores.get(token.tokenId)!.rank,proof}})}
}
