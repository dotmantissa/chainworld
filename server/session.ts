import { createHash, randomBytes } from 'node:crypto'
import { isAddress, verifyMessage as verifyEOAMessage } from 'viem'
import { db } from './db'
import { body, checkOrigin, endpoint, HttpError, origin, send, type Request, type Response } from './http'
import { clientFor,collection } from './chain'
import {requestChain} from './network'
import {MONAD_TESTNET_ID,type PlayChainId} from '../src/game/networks'
const cookieName=(chainId:PlayChainId)=>chainId===MONAD_TESTNET_ID?'cw_session':`cw_session_${chainId}`
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
export async function authenticated(req:Request,chainId:PlayChainId=MONAD_TESTNET_ID):Promise<string> {
  const name=cookieName(chainId),cookie=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)
  if(!cookie||!/^[a-f0-9]{64}$/.test(cookie))throw new HttpError(401,'Verify your wallet to load shared progress.')
  const rows=await db()`SELECT address FROM cw_sessions WHERE id_hash=${hash(cookie)} AND chain_id=${chainId} AND expires_at>now()`
  if(!rows.length)throw new HttpError(401,'Your session expired. Verify your wallet again.')
  return rows[0].address
}
export default endpoint(async(req,res)=>{
  if(req.method==='GET'){const chainId=requestChain(req);send(res,200,{address:await authenticated(req,chainId),chainId,collection:collection(chainId)});return}
  checkOrigin(req)
  if(req.method==='DELETE'){
    const chainId=requestChain(req),name=cookieName(chainId),cookie=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)
    if(cookie)await db()`DELETE FROM cw_sessions WHERE id_hash=${hash(cookie)} AND chain_id=${chainId}`
    res.setHeader('Set-Cookie',`${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);send(res,200,{ok:true});return
  }
  if(req.method!=='POST')throw new HttpError(405,'Method not allowed')
  const input=await body(req),chainId=requestChain(req,input),address=input.address
  if(typeof address!=='string'||!isAddress(address))throw new HttpError(400,'Invalid wallet address')
  const wallet=address.toLowerCase()
  if(input.action==='challenge'){
    const sql=db()
    const existing=await sql`SELECT address FROM cw_challenges WHERE address=${wallet} AND chain_id=${chainId} AND expires_at > now() + interval '4 minutes 45 seconds'`
    if(existing.length)throw new HttpError(429,'Wait a few seconds before requesting another signature.')
    const nonce=randomBytes(24).toString('hex')
    const message=`Chain World wallet verification\nOrigin: ${origin(req)}\nWallet: ${wallet}\nChain: ${chainId}\nCollection: ${collection(chainId).toLowerCase()}\nNonce: ${nonce}\nExpires: ${new Date(Date.now()+300000).toISOString()}\nThis signs in to the game. It does not send a transaction.`
    await sql`INSERT INTO cw_challenges(address,chain_id,message,expires_at) VALUES(${wallet},${chainId},${message},now()+interval '5 minutes') ON CONFLICT(address,chain_id) DO UPDATE SET message=excluded.message,expires_at=excluded.expires_at`
    send(res,200,{message});return
  }
  if(input.action!=='verify'||typeof input.message!=='string'||typeof input.signature!=='string'||!/^0x[0-9a-f]+$/i.test(input.signature))throw new HttpError(400,'Invalid wallet proof')
  const sql=db()
  const rows=await sql`DELETE FROM cw_challenges WHERE address=${wallet} AND chain_id=${chainId} AND message=${input.message} AND expires_at>now() RETURNING message`
  if(!rows.length)throw new HttpError(401,'Challenge expired or already used. Request a new signature.')
  const proof={address,message:input.message,signature:input.signature as `0x${string}`}
  let valid=false
  try{valid=await verifyEOAMessage(proof)}catch{ /* Contract wallet signatures may use a different encoding. */ }
  if(!valid)valid=await clientFor(chainId).verifyMessage(proof)
  if(!valid)throw new HttpError(401,'Wallet signature did not match')
  const token=randomBytes(32).toString('hex')
  await sql`INSERT INTO cw_sessions(id_hash,address,chain_id,expires_at) VALUES(${hash(token)},${wallet},${chainId},now()+interval '24 hours')`
  res.setHeader('Set-Cookie',`${cookieName(chainId)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${origin(req).startsWith('https:')?'; Secure':''}`)
  send(res,200,{address:wallet,chainId,collection:collection(chainId)})
})
