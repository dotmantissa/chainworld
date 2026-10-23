import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {concatHex,keccak256,type Hex} from 'viem'
import {buildFaucetManifest,validateSource,verifySourceProof,type FaucetManifest} from '../src/game/faucetManifest'
import {buildLandManifest,landRarityLeaf} from '../src/game/landManifest'
import {calculateRarity,type SourceManifest} from '../src/game/rarity'
import {rankToTier} from '../src/game/traitMapper'
const source=JSON.parse(await readFile('data/chog/source-manifest.json','utf8')) as SourceManifest
const faucet=JSON.parse(await readFile('public/faucet-manifest.json','utf8')) as FaucetManifest
const land=JSON.parse(await readFile('public/land-rarity-manifest.json','utf8')) as ReturnType<typeof buildLandManifest>
validateSource(source)
assert.equal(faucet.verifiedOnChain,true)
assert.deepEqual(faucet.source,source)
for(const token of source.tokens)assert.equal(createHash('sha256').update(JSON.stringify(token.metadata)).digest('hex'),token.sha256)
const rebuilt=buildFaucetManifest(source,true),rebuiltLand=buildLandManifest(source)
assert.deepEqual(faucet,rebuilt);assert.deepEqual(land,rebuiltLand)
for(let i=0;i<source.tokens.length;i++) {
 const t=source.tokens[i],f=faucet.claims[i],l=land.claims[i]
 assert.equal(f.originalId,t.tokenId);assert.equal(f.uri,t.uri);assert.equal(f.metadataSha256,t.sha256)
 assert.ok(verifySourceProof(faucet.root,i,t.tokenId,t.uri,f.proof))
 const root=l.proof.reduce((a:Hex,b:Hex)=>keccak256(concatHex(a<b?[a,b]:[b,a])),landRarityLeaf(l.originalId,l.rank))
 assert.equal(root,land.root);assert.equal(l.rank,f.rank)
}
const scores=calculateRarity(source.tokens),bands:Record<string,number>={}
for(const score of scores.values()){const tier=rankToTier(score.rank);bands[tier]=(bands[tier]??0)+1}
const report={collection:source.collection,chainId:source.chainId,snapshotBlock:source.snapshotBlock,supply:source.tokens.length,traitCategories:[...new Set(source.tokens.flatMap(t=>t.metadata.attributes.map(a=>a.trait_type)))].sort(),bands,faucetRoot:faucet.root,landRarityRoot:land.root,sourceSha256:createHash('sha256').update(JSON.stringify(source)).digest('hex'),verified:'All metadata hashes, source mappings, scores, faucet proofs and land rarity proofs reproduced locally.'}
await writeFile('data/chog/audit.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
