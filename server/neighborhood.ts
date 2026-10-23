import { db } from './db'
import { authenticated } from './session'
import { endpoint,HttpError,send } from './http'
import { chainClient,collection,nftAbi } from './chain'
import { identityOf,type LandOffer,type NeighborhoodSnapshot } from '../src/game/neighborhood'
import type { GameState } from '../src/game/types'
export default endpoint(async(req,res)=>{
  if(req.method!=='GET')throw new HttpError(405,'Method not allowed')
  const wallet=await authenticated(req)
  const id=new URL(req.url??'','http://localhost').searchParams.get('tokenId')
  if(!id||!/^\d+$/.test(id)||!Number.isSafeInteger(Number(id)))throw new HttpError(400,'Invalid token ID')
  const address=collection(),tokenId=Number(id),key=identityOf({chainId:10143,collection:address,tokenId})
  const owner=await chainClient.readContract({address,abi:nftAbi,functionName:'ownerOf',args:[BigInt(tokenId)]})
  if(owner.toLowerCase()!==wallet)throw new HttpError(403,'This wallet no longer owns the selected NFT.')
  const sql=db(),rows=await sql`SELECT state FROM cw_games WHERE identity=${key}`
  const actor=rows[0]?.state as GameState|undefined
  if(!actor?.home)throw new HttpError(400,'Enter the game before loading the neighborhood.')
  const city=actor.currentZone===5?actor.home.city:actor.currentZone,district=actor.location.district??(city===actor.home.city?actor.home.district:0)
  const [homes,parcels,offers,messages]=await Promise.all([
    sql`SELECT identity,state,updated_at FROM cw_games WHERE ((state->'home'->>'city')::int=${city} AND (state->'home'->>'district')::int=${district}) OR ((state->>'currentZone')::int=${city} AND state->'location'->>'kind'='street' AND COALESCE((state->'location'->>'district')::int,CASE WHEN (state->>'currentZone')::int=(state->'home'->>'city')::int THEN (state->'home'->>'district')::int ELSE 0 END)=${district}) ORDER BY identity LIMIT 64`,
    sql`SELECT x,y,identity FROM cw_parcels WHERE city=${city} AND district=${district}`,
    sql`SELECT * FROM cw_land_offers WHERE (buyer=${key} OR seller=${key}) AND status='pending' ORDER BY expires_at DESC LIMIT 50`,
    sql`SELECT id,sender,recipient,gesture,created_at FROM cw_gestures WHERE (sender=${key} OR recipient=${key}) AND created_at>now()-interval '5 minutes' ORDER BY created_at DESC LIMIT 12`,
  ])
  // Only public resident/home fields are shared; never expose another player's balance, jobs or wallet session.
  const snapshot:NeighborhoodSnapshot={
    neighbors:homes.map(row=>{const s=row.state as GameState;return {identity:String(row.identity),tokenId:s.tokenId,name:s.profile?.name||s.appearance.sourceName||`Chog #${s.tokenId}`,image:s.appearance.sourceImage,appearance:s.appearance,profile:s.profile,home:s.home,housingTier:s.meters.housingTier,location:s.location,online:Date.now()-new Date(String(row.updated_at)).getTime()<45000}}),
    parcels:parcels.map(p=>({x:Number(p.x),y:Number(p.y),identity:String(p.identity)})),
    offers:offers.map(o=>({id:String(o.id),buyer:String(o.buyer),seller:String(o.seller),city:Number(o.city),district:Number(o.district),x:Number(o.x),y:Number(o.y),amount:Number(o.amount),expiresAt:new Date(String(o.expires_at)).getTime(),status:String(o.status)} as LandOffer)),
    messages:messages.map(m=>({id:String(m.id),sender:String(m.sender),recipient:String(m.recipient),gesture:String(m.gesture),at:new Date(String(m.created_at)).getTime()})),
  }
  send(res,200,snapshot)
})
