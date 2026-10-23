import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {db} from '../server/db'
import {createNewGameState} from '../src/game/gameEngine'
const sql=db(),tag=`indoor-verification:${randomUUID()}`,a=`${tag}:a`,b=`${tag}:b`,place=`${tag}:room`,state=createNewGameState('verification',0,[],0,{now:Date.now()})
const commit=(key:string,revision:number,object:string|null,id=randomUUID(),editing=false)=>sql`SELECT * FROM cw_commit_home(${key},${revision},${JSON.stringify({...state,gChog:91})}::jsonb,${id}::uuid,${place},${object},${Date.now()+60000},${editing})`
try{
 await sql`INSERT INTO cw_games(identity,state) VALUES(${a},${JSON.stringify(state)}::jsonb),(${b},${JSON.stringify(state)}::jsonb)`
 const id=randomUUID();await commit(a,0,'chair',id)
 await assert.rejects(()=>commit(b,0,'chair'),/Someone is using/)
 const untouched=await sql`SELECT state,revision FROM cw_games WHERE identity=${b}`;assert.equal(untouched[0].revision,0);assert.equal(untouched[0].state.gChog,100)
 await assert.rejects(()=>commit(b,0,null,randomUUID(),true),/guest is using/)
 const replay=await commit(a,0,'chair',id);assert.equal(replay[0].outcome,'replayed');assert.equal(replay[0].revision,1)
 await commit(a,1,null);await commit(b,0,'chair');assert.equal((await sql`SELECT holder FROM cw_object_leases WHERE place=${place}`)[0].holder,b)
 console.log('Indoor Neon verification passed: exclusive object lease, concurrent debit rollback, edit protection, replay and cancellation release.')
}finally{await sql`DELETE FROM cw_games WHERE identity IN (${a},${b})`}
