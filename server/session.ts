import { createHash, randomBytes } from 'node:crypto'
import { isAddress, verifyMessage as verifyEOAMessage } from 'viem'
import { db } from './db'
import { body, checkOrigin, endpoint, HttpError, origin, send, type Request, type Response } from './http'
import { chainClient } from './chain'
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
export async function authenticated(req:Request):Promise<string> {
  const cookie=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('cw_session='))?.slice(11)
  if(!cookie||!/^[a-f0-9]{64}$/.test(cookie))throw new HttpError(401,'Verify your wallet to load shared progress.')
  const rows=await db()`SELECT address FROM cw_sessions WHERE id_hash=${hash(cookie)} AND expires_at>now()`
  if(!rows.length)throw new HttpError(401,'Your session expired. Verify your wallet again.')
  return rows[0].address
}
export default endpoint(async(req,res)=>{
  if(req.method==='GET'){
    send(res,200,{address:await authenticated(req)});return
  }
  checkOrigin(req)
  if(req.method==='DELETE'){
    const cookie=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('cw_session='))?.slice(11)
    if(cookie)await db()`DELETE FROM cw_sessions WHERE id_hash=${hash(cookie)}`
    res.setHeader('Set-Cookie','cw_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');send(res,200,{ok:true});return
  }
  if(req.method!=='POST')throw new HttpError(405,'Method not allowed')
  const input=await body(req),address=input.address
  if(typeof address!=='string'||!isAddress(address))throw new HttpError(400,'Invalid wallet address')
  const wallet=address.toLowerCase()
  if(input.action==='challenge'){
    const sql=db()
    const existing=await sql`SELECT address FROM cw_challenges WHERE address=${wallet} AND expires_at > now() + interval '4 minutes 45 seconds'`
    if(existing.length)throw new HttpError(429,'Wait a few seconds before requesting another signature.')
    const nonce=randomBytes(24).toString('hex')
    const message=`Chain World wallet verification\nOrigin: ${origin(req)}\nWallet: ${wallet}\nChain: 10143\nNonce: ${nonce}\nExpires: ${new Date(Date.now()+300000).toISOString()}\nThis signs in to the game. It does not send a transaction.`
    await sql`INSERT INTO cw_challenges(address,message,expires_at) VALUES(${wallet},${message},now()+interval '5 minutes') ON CONFLICT(address) DO UPDATE SET message=excluded.message,expires_at=excluded.expires_at`
    send(res,200,{message});return
  }
  if(input.action!=='verify'||typeof input.message!=='string'||typeof input.signature!=='string'||!/^0x[0-9a-f]+$/i.test(input.signature))throw new HttpError(400,'Invalid wallet proof')
  const sql=db()
  const rows=await sql`DELETE FROM cw_challenges WHERE address=${wallet} AND message=${input.message} AND expires_at>now() RETURNING message`
  if(!rows.length)throw new HttpError(401,'Challenge expired or already used. Request a new signature.')
  const proof={address,message:input.message,signature:input.signature as `0x${string}`}
  let valid=false
  try{valid=await verifyEOAMessage(proof)}catch{ /* Contract wallet signatures may use a different encoding. */ }
  if(!valid)valid=await chainClient.verifyMessage(proof)
  if(!valid)throw new HttpError(401,'Wallet signature did not match')
  const token=randomBytes(32).toString('hex')
  await sql`INSERT INTO cw_sessions(id_hash,address,expires_at) VALUES(${hash(token)},${wallet},now()+interval '24 hours')`
  res.setHeader('Set-Cookie',`cw_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${origin(req).startsWith('https:')?'; Secure':''}`)
  send(res,200,{address:wallet})
})
