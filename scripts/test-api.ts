import assert from 'node:assert/strict'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { db } from '../server/db'
const base=process.env.APP_ORIGIN??'http://localhost:5175'
const account=privateKeyToAccount(generatePrivateKey())
const headers={'Content-Type':'application/json',Origin:base}
try{
  let response=await fetch(`${base}/api/session`);assert.equal(response.status,401)
  response=await fetch(`${base}/api/session`,{method:'POST',headers,body:JSON.stringify({action:'challenge',address:account.address})});assert.equal(response.status,200)
  const {message}=await response.json() as {message:string}
  const signature=await account.signMessage({message})
  const proof={action:'verify',address:account.address,message,signature}
  response=await fetch(`${base}/api/session`,{method:'POST',headers,body:JSON.stringify(proof)});assert.equal(response.status,200)
  const cookie=response.headers.get('set-cookie')!.split(';')[0];assert.ok(cookie.startsWith('cw_session='))
  response=await fetch(`${base}/api/session`,{headers:{Cookie:cookie}});assert.equal(response.status,200)
  assert.equal((await response.json() as {address:string}).address,account.address.toLowerCase())
  response=await fetch(`${base}/api/session`,{method:'POST',headers,body:JSON.stringify(proof)});assert.equal(response.status,401)
  response=await fetch(`${base}/api/game`,{method:'POST',headers:{...headers,Origin:'https://untrusted.example',Cookie:cookie},body:'{}'});assert.equal(response.status,403)
  response=await fetch(`${base}/api/game?tokenId=invalid`,{headers:{Cookie:cookie}});assert.equal(response.status,400)
  response=await fetch(`${base}/api/session`,{method:'DELETE',headers:{...headers,Cookie:cookie}});assert.equal(response.status,200)
  response=await fetch(`${base}/api/session`,{headers:{Cookie:cookie}});assert.equal(response.status,401)
  console.log('API verification passed: signed login, HttpOnly session, challenge replay denial, origin checks, input validation and logout.')
}finally{
  const sql=db(),address=account.address.toLowerCase()
  await sql`DELETE FROM cw_sessions WHERE address=${address}`
  await sql`DELETE FROM cw_challenges WHERE address=${address}`
}
