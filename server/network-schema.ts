// Existing rows remain Testnet; realm is derived from the authoritative NFT key, never user input.
export const networkSchema=[
 `ALTER TABLE cw_sessions ADD COLUMN IF NOT EXISTS chain_id integer NOT NULL DEFAULT 10143 CHECK(chain_id IN (143,10143))`,
 `ALTER TABLE cw_challenges ADD COLUMN IF NOT EXISTS chain_id integer NOT NULL DEFAULT 10143 CHECK(chain_id IN (143,10143))`,
 `ALTER TABLE cw_challenges DROP CONSTRAINT IF EXISTS cw_challenges_pkey`,
 `ALTER TABLE cw_challenges ADD CONSTRAINT cw_challenges_pkey PRIMARY KEY(address,chain_id)`,
 `ALTER TABLE cw_parcels ADD COLUMN IF NOT EXISTS realm text GENERATED ALWAYS AS (split_part(identity,':',1)||':'||split_part(identity,':',2)) STORED`,
 `ALTER TABLE cw_parcels DROP CONSTRAINT IF EXISTS cw_parcels_pkey`,
 `ALTER TABLE cw_parcels ADD CONSTRAINT cw_parcels_pkey PRIMARY KEY(realm,city,district,x,y)`,
 `CREATE INDEX IF NOT EXISTS cw_games_network ON cw_games ((state->>'chainId'),(lower(state->>'collection')))`,
]
