import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { db } from '../server/db'
import { createNewGameState } from '../src/game/gameEngine'
const sql=db(),key=`verification:${randomUUID()}`,estateKey=`verification-estate:${randomUUID()}`,rollbackKey=`verification-rollback:${randomUUID()}`,idA=randomUUID(),idB=randomUUID()
const initial=createNewGameState('verification',0,[],0,{now:Date.now(),collection:'verification'})
try{
  await sql`INSERT INTO cw_games(identity,state) VALUES(${key},${JSON.stringify(initial)}::jsonb)`
  const [a,b]=await Promise.all([
    sql`SELECT * FROM cw_commit_game(${key},0,${JSON.stringify({...initial,gChog:200})}::jsonb,${idA}::uuid)`,
    sql`SELECT * FROM cw_commit_game(${key},0,${JSON.stringify({...initial,gChog:300})}::jsonb,${idB}::uuid)`,
  ])
  const outcomes=[a[0].outcome,b[0].outcome].sort();assert.deepEqual(outcomes,['committed','conflict'])
  const winner=a[0].outcome==='committed'?idA:idB
  const replay=await sql`SELECT * FROM cw_commit_game(${key},0,${JSON.stringify({...initial,gChog:999999})}::jsonb,${winner}::uuid)`
  assert.equal(replay[0].outcome,'replayed');assert.equal(replay[0].revision,1);assert.ok([200,300].includes(replay[0].state.gChog))
  const receipts=await sql`SELECT count(*)::int AS count FROM cw_commands WHERE identity=${key}`
  assert.equal(receipts[0].count,1)
  const created=await sql.transaction([
    sql`INSERT INTO cw_games(identity,state) VALUES(${estateKey},${JSON.stringify({...initial,currentZone:4})}::jsonb)`,
    sql`SELECT cw_ensure_estate(${estateKey})`,
    sql`SELECT state,revision FROM cw_games WHERE identity=${estateKey}`,
  ])
  assert.equal(created[2][0].revision,1)
  assert.equal(created[2][0].state.home.city,4)
  const plots=await sql`SELECT x,y FROM cw_parcels WHERE identity=${estateKey}`
  assert.deepEqual(plots.map(p=>({x:Number(p.x),y:Number(p.y)})),created[2][0].state.home.plots)
  const repeated=await sql.transaction([sql`SELECT cw_ensure_estate(${estateKey})`,sql`SELECT state,revision FROM cw_games WHERE identity=${estateKey}`])
  assert.equal(repeated[1][0].revision,1)
  assert.deepEqual(repeated[1][0].state.home,created[2][0].state.home)
  await assert.rejects(()=>sql.transaction([
    sql`INSERT INTO cw_games(identity,state) VALUES(${rollbackKey},${JSON.stringify(initial)}::jsonb)`,
    sql`SELECT cw_ensure_estate(${rollbackKey})`,
    sql`SELECT 1/0`,
  ]),/division by zero/)
  assert.equal((await sql`SELECT identity FROM cw_games WHERE identity=${rollbackKey}`).length,0)
  assert.equal((await sql`SELECT identity FROM cw_parcels WHERE identity=${rollbackKey}`).length,0)
  console.log('Neon verification passed: persistence, concurrent-write exclusion, replay protection, atomic starter estate creation, idempotence and rollback.')
}finally{await sql`DELETE FROM cw_games WHERE identity IN (${key},${estateKey},${rollbackKey})`}
