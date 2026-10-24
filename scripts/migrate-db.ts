import { db, schema, commitFunction } from '../server/db'
import { worldSchema,ensureEstateFunction,worldCommitFunction } from '../server/world-schema'
import {indoorSchema,indoorCommitFunction} from '../server/indoor-schema'
import {networkSchema} from '../server/network-schema'
const sql=db()
for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean))await sql.query(statement)
await sql.query(commitFunction)
for(const statement of worldSchema.split(';').map(s=>s.trim()).filter(Boolean))await sql.query(statement)
await sql.query(indoorSchema)
// Partition changes and their SQL functions must become visible together.
await sql.transaction([...networkSchema.map(statement=>sql.query(statement)),sql.query(ensureEstateFunction),sql.query(worldCommitFunction),sql.query(indoorCommitFunction),sql.query(`UPDATE cw_object_leases SET place=split_part(holder,':',1)||':'||split_part(holder,':',2)||':'||place WHERE left(place,length(split_part(holder,':',1)||':'||split_part(holder,':',2))+1)<>split_part(holder,':',1)||':'||split_part(holder,':',2)||':'`)])
console.log('Chain World database schema and atomic command function are ready.')
