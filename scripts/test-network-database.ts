import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {db} from '../server/db'
import {createNewGameState} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
import type {GameState} from '../src/game/types'
const sql=db(),district=1_000_000_000+Math.floor(Math.random()*1_000_000),collection='0x'+randomBytes(20).toString('hex'),a=`10143:${collection}:1`,b=`143:${collection}:1`,c=`10143:${collection}:2`
const get=async(key:string)=>{for(let attempt=0;;attempt++){try{const rows=await sql`SELECT state,revision FROM cw_games WHERE identity=${key}`;return{state:rows[0].state as GameState,revision:Number(rows[0].revision)}}catch(error){if(attempt>=2||!/HTTP status 50[234]/.test(String(error)))throw error;await new Promise(r=>setTimeout(r,200*(attempt+1)))}}}
const commit=async(key:string,command:unknown)=>{const g=await get(key);return sql`SELECT * FROM cw_commit_world(${key},${g.revision},${JSON.stringify(g.state)}::jsonb,${randomUUID()}::uuid,${JSON.stringify(command)}::jsonb,250)`}
try{
 const initialization=[]
 for(const[key,chainId,tokenId]of[[a,10143,1],[b,143,1],[c,10143,2]]as const){const state=ensureHousehold(createNewGameState('network-verification',tokenId,[],0,{chainId,collection,now:Date.now()}));state.gChog=1000;state.meters.housingTier=0;initialization.push(sql`INSERT INTO cw_games(identity,state) VALUES(${key},${JSON.stringify(state)}::jsonb)`,sql`SELECT cw_ensure_estate(${key})`)}
 initialization.push(sql`UPDATE cw_games SET state=jsonb_set(jsonb_set(state,'{home,district}',to_jsonb(${district}::integer)),'{location,district}',to_jsonb(${district}::integer)) WHERE identity IN (${a},${b},${c})`,sql`UPDATE cw_parcels SET district=${district} WHERE identity IN (${a},${b},${c})`);await sql.transaction(initialization)
 const homeA=(await get(a)).state.home,homeB=(await get(b)).state.home;assert.deepEqual(homeA,homeB)
 assert.equal((await sql`SELECT count(*)::int AS n FROM cw_parcels WHERE identity IN (${a},${b}) AND x=0 AND y=0`)[0].n,2)
 await Promise.all([commit(a,{type:'buyLand',x:1,y:0}),commit(b,{type:'buyLand',x:1,y:0})]);assert.equal((await get(a)).state.gChog,750);assert.equal((await get(b)).state.gChog,750)
 await assert.rejects(()=>commit(a,{type:'gesture',recipient:b,gesture:'wave'}),/another network/)
 const forged=randomUUID();await sql`INSERT INTO cw_land_offers(id,buyer,seller,city,district,x,y,amount,expires_at) VALUES(${forged},${a},${b},0,${district},1,0,10,now()+interval '1 hour')`;await assert.rejects(()=>commit(b,{type:'respondOffer',id:forged,decision:'accept'}),/another network/);assert.equal((await get(a)).state.gChog,750);assert.equal((await get(b)).state.gChog,750)
 const lease=async(key:string)=>{const g=await get(key);return sql`SELECT * FROM cw_commit_home(${key},${g.revision},${JSON.stringify({...g.state,gChog:g.state.gChog-1})}::jsonb,${randomUUID()}::uuid,'0:cafe','seat-1',${Date.now()+30000},false)`}
 await Promise.all([lease(a),lease(b)]);await assert.rejects(()=>lease(c),/Someone is using/);assert.equal((await get(c)).state.gChog,1000)
 const leases=await sql`SELECT place FROM cw_object_leases WHERE holder IN (${a},${b})`;assert.equal(leases.length,2);assert.notEqual(leases[0].place,leases[1].place)
 console.log('Network database isolation passed: overlapping coordinates per realm, separate purchases/balances, cross-network offers/gestures denied, public seats isolated, same-realm exclusion/rollback retained.')
}finally{await sql`DELETE FROM cw_games WHERE identity IN (${a},${b},${c})`}
