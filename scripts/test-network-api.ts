import assert from 'node:assert/strict'
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts'
import {db} from '../server/db'
import {serverFetch} from '../server/httpClient'
const base=process.env.APP_ORIGIN??'http://localhost:5175',account=privateKeyToAccount(generatePrivateKey()),headers={'Content-Type':'application/json',Origin:base},wallet=account.address.toLowerCase()
const request=(chainId:number,body:unknown)=>serverFetch(base+'/api/session',{method:'POST',headers,body:JSON.stringify({...body as object,address:account.address,chainId})})
try{
 const challenges=await Promise.all([143,10143].map(async chainId=>{const r=await request(chainId,{action:'challenge'});assert.equal(r.status,200);const {message}=await r.json() as {message:string};assert(message.includes(`Chain: ${chainId}\n`));return{chainId,message,signature:await account.signMessage({message})}}))
 const main=challenges[0];assert.equal((await request(10143,{action:'verify',message:main.message,signature:main.signature})).status,401)
 const cookies:Record<number,string>={}
 for(const c of challenges){const r=await request(c.chainId,{...c,action:'verify'});assert.equal(r.status,200);cookies[c.chainId]=r.headers.get('set-cookie')!.split(';')[0];assert(cookies[c.chainId].startsWith(c.chainId===143?'cw_session_143=':'cw_session='));assert.equal((await request(c.chainId,{...c,action:'verify'})).status,401)}
 for(const chainId of[143,10143]){const r=await serverFetch(`${base}/api/session?chainId=${chainId}`,{headers:{Cookie:otherCookie(chainId)}});assert.equal(r.status,401);const own=await serverFetch(`${base}/api/session?chainId=${chainId}`,{headers:{Cookie:cookies[chainId]}});assert.equal(own.status,200);assert.equal((await own.json() as {chainId:number}).chainId,chainId)}
 const denied=await serverFetch(`${base}/api/game?chainId=143&tokenId=1462`,{headers:{Cookie:cookies[143]}});assert.equal(denied.status,403)
 assert.equal((await serverFetch(`${base}/api/game?chainId=143&tokenId=1462`,{headers:{Cookie:cookies[10143]}})).status,401)
 assert.equal((await serverFetch(`${base}/api/game?chainId=1&tokenId=1462`,{headers:{Cookie:cookies[143]}})).status,400)
 for(const chainId of[143,10143]){assert.equal((await serverFetch(`${base}/api/session?chainId=${chainId}`,{method:'DELETE',headers:{...headers,Cookie:cookies[chainId]}})).status,200)}
 console.log('Network API isolation passed: simultaneous per-chain login proofs, cross-chain/replayed proof denial, separate cookies, wrong-network session rejection and real mainnet NFT ownership enforcement. No chain transactions.')
 function otherCookie(chainId:number){return cookies[chainId===143?10143:143]}
}finally{const sql=db();await sql`DELETE FROM cw_sessions WHERE address=${wallet}`;await sql`DELETE FROM cw_challenges WHERE address=${wallet}`}
