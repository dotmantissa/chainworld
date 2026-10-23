import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless'
import { serverFetch } from './httpClient'
let database:NeonQueryFunction<false,false>|undefined
export function db() {
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured')
  neonConfig.fetchFunction=serverFetch
  return database??=neon(process.env.DATABASE_URL)
}
export const schema = `
CREATE TABLE IF NOT EXISTS cw_challenges (address text PRIMARY KEY, message text NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS cw_sessions (id_hash text PRIMARY KEY, address text NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS cw_games (identity text PRIMARY KEY, state jsonb NOT NULL, revision integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS cw_commands (identity text NOT NULL REFERENCES cw_games(identity) ON DELETE CASCADE, request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(identity, request_id));
CREATE INDEX IF NOT EXISTS cw_sessions_expiry ON cw_sessions(expires_at);
`
// Row lock, revision comparison, state write and replay receipt are one database transaction.
export const commitFunction = `
CREATE OR REPLACE FUNCTION cw_commit_game(game_key text, expected_revision integer, next_state jsonb, command_id uuid)
RETURNS TABLE(outcome text, state jsonb, revision integer) LANGUAGE plpgsql AS $$
DECLARE current_game cw_games%ROWTYPE;
BEGIN
  SELECT g.* INTO current_game FROM cw_games g WHERE g.identity=game_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF EXISTS(SELECT 1 FROM cw_commands c WHERE c.identity=game_key AND c.request_id=command_id) THEN
    RETURN QUERY SELECT 'replayed'::text,current_game.state,current_game.revision; RETURN;
  END IF;
  IF current_game.revision<>expected_revision THEN
    RETURN QUERY SELECT 'conflict'::text,current_game.state,current_game.revision; RETURN;
  END IF;
  UPDATE cw_games g SET state=next_state,revision=g.revision+1,updated_at=now() WHERE g.identity=game_key;
  INSERT INTO cw_commands(identity,request_id) VALUES(game_key,command_id);
  RETURN QUERY SELECT 'committed'::text,next_state,current_game.revision+1;
END;
$$;
`
