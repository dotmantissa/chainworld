import { mapTraitsToCharacter } from '../src/game/traitMapper'
import { verifiedRank } from './rarity'
import { randomUUID } from 'node:crypto'
import { db } from './db'
import { serverFetch } from './httpClient'
import { authenticated } from './session'
import { chainClient, collection, nftAbi, tokenMetadata } from './chain'
import { body, checkOrigin, endpoint, HttpError, send } from './http'
import { parseCommand } from './commands'
import { createNewGameState, reduceGame, settle, unlockEarnedZones } from '../src/game/gameEngine'
import { DEFAULT_PROFILE } from '../src/game/residentProfile'
import { DEFAULT_LOCATION, estateDefault, frontDoor, distance } from '../src/game/neighborhood'
import { cityPrice } from '../src/game/zones'
import { getAllZoneGwei, getZoneGwei } from '../src/game/zones'
import type { GameState } from '../src/game/types'
import { parseAbi } from 'viem'
export default endpoint(async(req,res)=>{
  const receivedAt=Date.now()
  if(!['GET','POST'].includes(req.method??''))throw new HttpError(405,'Method not allowed')
  const input=req.method==='POST'?(checkOrigin(req),await body(req)):{}
  const wallet=await authenticated(req)
  const params=new URL(req.url??'','http://localhost').searchParams
  const id=req.method==='GET'?params.get('tokenId'):input.tokenId
  if((typeof id!=='string'&&typeof id!=='number')||!/^\d+$/.test(String(id))||!Number.isSafeInteger(Number(id)))throw new HttpError(400,'Invalid token ID')
  const tokenId=Number(id),address=collection(),key=`10143:${address.toLowerCase()}:${tokenId}`
  const requestId=input.requestId
  if(req.method==='POST'&&(typeof requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)||!Number.isInteger(input.revision)))throw new HttpError(400,'A command request ID and revision are required')
  let command=req.method==='POST'?parseCommand(input.command):{type:'tick'} as const
  const sql=db(),registry=process.env.REGISTRY_V2_ADDRESS
  // Ownership, the state snapshot and public observations are independent reads.
  const [owner,existing,observations,registryProfile]=await Promise.all([
    chainClient.readContract({address,abi:nftAbi,functionName:'ownerOf',args:[BigInt(tokenId)]}),
    sql`SELECT state,revision,EXISTS(SELECT 1 FROM cw_parcels WHERE identity=${key}) AS estate_ready,EXISTS(SELECT 1 FROM cw_commands WHERE identity=${key} AND request_id=${typeof requestId==='string'?requestId:null}::uuid) AS repeated FROM cw_games WHERE identity=${key}`,
    getAllZoneGwei(serverFetch),
    registry&&/^0x[0-9a-f]{40}$/i.test(registry)?chainClient.readContract({address:registry as `0x${string}`,abi:parseAbi(['function getPlayer(uint256) view returns (bool,uint256,uint8,uint16[6],uint256)']),functionName:'getPlayer',args:[BigInt(tokenId)]}):Promise.resolve(null),
  ])
  if(owner.toLowerCase()!==wallet)throw new HttpError(403,'This wallet no longer owns the selected NFT.')
  let rows=existing
  if(!existing.length){
    const metadata=await tokenMetadata(tokenId)
    const rank=await verifiedRank(tokenId,metadata)
    const initial=createNewGameState(wallet,tokenId,metadata.attributes,0,{collection:address,rank})
    initial.appearance={...initial.appearance,sourceImage:metadata.image,sourceName:metadata.name}
    const result=await sql.transaction([
      sql`INSERT INTO cw_games(identity,state) VALUES(${key},${JSON.stringify(initial)}) ON CONFLICT(identity) DO NOTHING`,
      sql`SELECT cw_ensure_estate(${key})`,
      sql`SELECT state,revision FROM cw_games WHERE identity=${key}`,
    ])
    rows=result[2]
  }else if(!existing[0].estate_ready){
    const result=await sql.transaction([sql`SELECT cw_ensure_estate(${key})`,sql`SELECT state,revision FROM cw_games WHERE identity=${key}`])
    rows=result[1]
  }
  if(command.type==='startJob'&&command.kind==='grifter'){
    // Zone is read from stored state, never supplied by the client.
    const q=await getZoneGwei((rows[0].state as unknown as GameState).currentZone,true,serverFetch)
    if(q.stale||q.wei===null)throw new HttpError(503,'A live gas quote is unavailable. Try another job.')
    command={...command,openingWei:q.wei,openingAt:q.fetchedAt}
  }
  const gas=Object.fromEntries(observations.map(q=>[q.zoneId,q.gwei]))
  let state=rows[0].state as GameState
  state={...state,profile:state.profile??{...DEFAULT_PROFILE},home:state.home??estateDefault(state),location:state.location??{...DEFAULT_LOCATION}}
  const revision=Number(rows[0].revision)
  if(state.appearance.schemaVersion!==2||!state.appearance.sourceImage){
    const metadata=await tokenMetadata(tokenId)
    const derived=mapTraitsToCharacter(metadata.attributes,tokenId)
    state={...state,stats:derived.stats,appearance:{...derived.appearance,sourceImage:metadata.image,sourceName:metadata.name}}
  }
  if(req.method==='POST'){
    if(existing[0]?.repeated){send(res,200,{state,revision});return}
    if(input.revision!==revision){send(res,409,{state,revision,error:'Progress changed in another tab. The game has refreshed.'});return}
  }
  const now=command.type==='clickBlock'?receivedAt:Date.now()
  if(state.walletAddress.toLowerCase()!==wallet)state={...state,walletAddress:wallet,action:null,job:null}
  state=settle(state,{now,gas},now-state.lastSaved>60000)
  if(state.job?.kind==='grifter'&&now>=state.job.endsAt){
    const q=await getZoneGwei(state.job.zone,true,serverFetch)
    state=reduceGame(state,{type:'resolveGrifter',sessionId:state.job.id,wei:q.wei,fetchedAt:q.fetchedAt,stale:q.stale},{now:Date.now(),gas})
  }
  if(command.type==='enterHome'&&command.host){
    const hosts=await sql`SELECT state FROM cw_games WHERE identity=${command.host}`
    const host=hosts[0]?.state as GameState|undefined
    if(!host?.home?.open)throw new HttpError(400,'This resident’s home is closed to visitors.')
    if(state.location.kind!=='street'||state.location.journey||state.action||state.job||state.currentZone!==host.home.city||state.home.district!==host.home.district||distance(state.location.tile,frontDoor(host.home))>1)throw new HttpError(400,'Walk to this resident’s front door first.')
    state={...state,location:{kind:'visit',tile:frontDoor(host.home),host:command.host,journey:null},lastMessage:`Visiting ${host.profile?.name||`Chog #${host.tokenId}`}.`}
    command={type:'tick'}
  }
  state=unlockEarnedZones(reduceGame(state,command,{now:command.type==='clickBlock'?receivedAt:Date.now(),gas}))
  if(registryProfile){
    state={...state,registeredOnChain:registryProfile[0],registeredLot:registryProfile[0]?Number(registryProfile[1]):null}
  }
  // Recheck ownership after external observations and before the atomic write.
  const currentOwner=await chainClient.readContract({address,abi:nftAbi,functionName:'ownerOf',args:[BigInt(tokenId)]})
  if(currentOwner.toLowerCase()!==wallet)throw new HttpError(403,'NFT ownership changed. Reconnect its current owner.')
  const commandId=typeof requestId==='string'?requestId:randomUUID()
  let committed
  try {
    committed=['buyLand','offerLand','respondOffer','gesture'].includes(command.type)?await sql`SELECT * FROM cw_commit_world(${key},${revision},${JSON.stringify(state)}::jsonb,${commandId}::uuid,${JSON.stringify(command)}::jsonb,${cityPrice(250,state.home.city,gas[state.home.city])})`:await sql`SELECT * FROM cw_commit_game(${key},${revision},${JSON.stringify(state)}::jsonb,${commandId}::uuid)`
  }catch(error){
    const text=error instanceof Error?error.message:''
    const known=['Return to your home city to expand','Only adjacent land can join your estate','You already own this land','This parcel is occupied; make its owner an offer','Not enough gCHOG','This land is available to buy directly','Not enough gCHOG to fund this offer','Cancel an outstanding offer first','Offer is no longer pending','This offer belongs to another resident','This offer expired; reject or cancel it to refund the buyer','The parcel owner changed; reject or cancel this offer','A resident cannot sell their home parcel','The parcel no longer adjoins the buyer estate','This sale would disconnect the seller estate','That resident is no longer nearby','Meet outside in the same neighborhood first','Walk closer to that resident first','Give your neighbor a moment before another interaction']
    const message=known.find(message=>text.includes(message))
    if(message)throw new HttpError(400,message)
    throw error
  }
  const result=committed[0]
  send(res,result.outcome==='conflict'?409:200,{state:result.state,revision:result.revision,...(result.outcome==='conflict'?{error:'Progress changed in another tab. Please retry.'}:{})})
})
