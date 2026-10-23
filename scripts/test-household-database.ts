import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {db} from '../server/db'
import {createNewGameState} from '../src/game/gameEngine'
import {freshHousehold,SOURCE_PACKAGES} from '../src/game/household'
const sql=db(),prefix=`household-verification:${randomUUID()}:`,keys:string[]=[]
try{
 for(const[tier,pack]of Object.entries(SOURCE_PACKAGES)){
  const key=prefix+tier;keys.push(key)
  const state=freshHousehold(createNewGameState('verification',keys.length,[{trait_type:'Tier',value:tier}],0,{rank:169}))
  const rows=await sql.transaction([
   sql`INSERT INTO cw_games(identity,state) VALUES(${key},${JSON.stringify(state)}::jsonb)`,
   sql`SELECT cw_ensure_estate(${key})`,
   sql`SELECT state,(SELECT count(*)::integer FROM cw_parcels WHERE identity=${key}) AS parcels FROM cw_games WHERE identity=${key}`,
  ])
  const saved=rows[2][0];assert.equal(saved.parcels,1+Math.floor(pack.level/2));assert.equal(saved.state.home.style,state.home.style)
  assert.equal(saved.state.gChog,state.gChog);assert.deepEqual(saved.state.household,state.household)
  await sql`SELECT cw_ensure_estate(${key})`
  assert.equal((await sql`SELECT count(*)::integer AS count FROM cw_parcels WHERE identity=${key}`)[0].count,saved.parcels)
 }
 console.log('Neon household allocation passed: all five source tiers, correct parcel grants, seeded palettes, preserved furniture/cash and idempotent reconnect.')
}finally{for(const key of keys)await sql`DELETE FROM cw_games WHERE identity=${key}`}
