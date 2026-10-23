import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {db} from '../server/db'
import {createNewGameState} from '../src/game/gameEngine'
import type {GameState} from '../src/game/types'
const sql=db(),tag=`world-verification:${randomUUID()}`,a=`${tag}:a`,b=`${tag}:b`,district=1_000_000_000+Math.floor(Math.random()*1_000_000)
const base=createNewGameState('verification',0,[],0,{now:Date.now(),collection:'verification'})
const stateA:GameState={...base,gChog:1000,home:{city:0,district,x:0,y:0,plots:[{x:0,y:0},{x:1,y:0}],style:'linen',open:true}}
const stateB:GameState={...base,gChog:1000,home:{city:0,district,x:3,y:0,plots:[{x:3,y:0},{x:2,y:0},{x:3,y:1}],style:'sage',open:true}}
const get=async(key:string)=>{const rows=await sql`SELECT state,revision FROM cw_games WHERE identity=${key}`;return{state:rows[0].state as GameState,revision:Number(rows[0].revision)}}
const commit=async(key:string,command:unknown,id=randomUUID(),cost=250)=>{const g=await get(key);return sql`SELECT * FROM cw_commit_world(${key},${g.revision},${JSON.stringify(g.state)}::jsonb,${id}::uuid,${JSON.stringify(command)}::jsonb,${cost})`}
try{
 await sql`INSERT INTO cw_games(identity,state) VALUES(${a},${JSON.stringify(stateA)}::jsonb),(${b},${JSON.stringify(stateB)}::jsonb)`
 for(const[key,state]of[[a,stateA],[b,stateB]]as const)for(const p of state.home.plots)await sql`INSERT INTO cw_parcels VALUES(0,${district},${p.x},${p.y},${key})`
 const offerId=randomUUID()
 await commit(a,{type:'offerLand',x:2,y:0,amount:70},offerId)
 assert.equal((await get(a)).state.gChog,930)
 assert.equal((await get(b)).state.gChog,1000)
 const acceptId=randomUUID(),oldB=await get(b)
 await commit(b,{type:'respondOffer',id:offerId,decision:'accept'},acceptId)
 assert.equal((await get(b)).state.gChog,1070)
 assert.equal((await get(a)).state.gChog,930)
 assert.ok((await get(a)).state.home.plots.some(p=>p.x===2&&p.y===0))
 assert.equal((await sql`SELECT identity FROM cw_parcels WHERE city=0 AND district=${district} AND x=2 AND y=0`)[0].identity,a)
 const replay=await sql`SELECT * FROM cw_commit_world(${b},${oldB.revision},${JSON.stringify(oldB.state)}::jsonb,${acceptId}::uuid,${JSON.stringify({type:'respondOffer',id:offerId,decision:'accept'})}::jsonb,250)`
 assert.equal(replay[0].outcome,'replayed');assert.equal((await get(b)).state.gChog,1070)
 const rootOffer=randomUUID()
 await commit(a,{type:'offerLand',x:3,y:0,amount:30},rootOffer)
 await assert.rejects(()=>commit(b,{type:'respondOffer',id:rootOffer,decision:'accept'}),/cannot sell their home parcel/)
 assert.equal((await get(a)).state.gChog,900)
 await commit(a,{type:'respondOffer',id:rootOffer,decision:'cancel'})
 assert.equal((await get(a)).state.gChog,930)
 await assert.rejects(()=>commit(a,{type:'respondOffer',id:rootOffer,decision:'cancel'}),/no longer pending/)
 const race=await Promise.allSettled([commit(a,{type:'buyLand',x:2,y:1}),commit(b,{type:'buyLand',x:2,y:1})])
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1)
 assert.equal((await get(a)).state.gChog+(await get(b)).state.gChog,1750)
 assert.equal((await sql`SELECT count(*)::int AS n FROM cw_parcels WHERE city=0 AND district=${district} AND x=2 AND y=1`)[0].n,1)
 await assert.rejects(()=>commit(a,{type:'buyLand',x:7,y:7}),/Only adjacent/)
 await commit(b,{type:'buyLand',x:3,y:2})
 const connectorOwner=(await sql`SELECT identity FROM cw_parcels WHERE city=0 AND district=${district} AND x=2 AND y=1`)[0].identity
 if(connectorOwner===b){const bridgeOffer=randomUUID();await commit(a,{type:'offerLand',x:2,y:1,amount:10},bridgeOffer);await commit(b,{type:'respondOffer',id:bridgeOffer,decision:'accept'})}
 const disconnectedOffer=randomUUID();await commit(a,{type:'offerLand',x:3,y:1,amount:40},disconnectedOffer)
 await assert.rejects(()=>commit(b,{type:'respondOffer',id:disconnectedOffer,decision:'accept'}),/disconnect the seller estate/)
 await commit(a,{type:'respondOffer',id:disconnectedOffer,decision:'cancel'})
 assert.equal((await get(a)).state.gChog+(await get(b)).state.gChog,1500)
 const first=await get(a),second=await get(b)
 const nearA={...first.state,meters:{...first.state.meters,social:90},location:{kind:'street',tile:{x:1,y:1},journey:null}}
 const nearB={...second.state,meters:{...second.state.meters,social:95},location:{kind:'street',tile:{x:1,y:2},journey:null}}
 await sql`UPDATE cw_games SET state=CASE identity WHEN ${a} THEN ${JSON.stringify(nearA)}::jsonb ELSE ${JSON.stringify(nearB)}::jsonb END,revision=revision+1,updated_at=now() WHERE identity IN (${a},${b})`
 await commit(a,{type:'gesture',recipient:b,gesture:'wave'})
 assert.equal((await get(a)).state.meters.social,100);assert.equal((await get(b)).state.meters.social,100)
 await assert.rejects(()=>commit(a,{type:'gesture',recipient:b,gesture:'chat'}),/Give your neighbor a moment/)
 await sql`UPDATE cw_games SET state=jsonb_set(state,'{location,tile}','{"x":29,"y":3}'::jsonb) WHERE identity=${b}`
 await assert.rejects(()=>commit(a,{type:'gesture',recipient:b,gesture:'high-five'}),/Walk closer/)
 console.log('World database verification passed: escrow, atomic buyer/seller settlement, replay, protected home, refunds, adjacent expansion, connected estates, competing purchase exclusion and social proximity/cooldowns.')
}finally{await sql`DELETE FROM cw_games WHERE identity IN (${a},${b})`}
