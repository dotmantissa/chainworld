import { db, schema, commitFunction } from '../server/db'
import { worldSchema,ensureEstateFunction,worldCommitFunction } from '../server/world-schema'
const sql=db()
for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean))await sql.query(statement)
await sql.query(commitFunction)
for(const statement of worldSchema.split(';').map(s=>s.trim()).filter(Boolean))await sql.query(statement)
await sql.query(ensureEstateFunction)
await sql.query(worldCommitFunction)
console.log('Chain World database schema and atomic command function are ready.')
