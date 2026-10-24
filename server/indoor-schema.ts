export const indoorSchema=`CREATE TABLE IF NOT EXISTS cw_object_leases (
 place text NOT NULL, object_id text NOT NULL, holder text NOT NULL REFERENCES cw_games(identity) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, PRIMARY KEY(place,object_id)
);`
export const indoorCommitFunction=`
CREATE OR REPLACE FUNCTION cw_commit_home(game_key text,expected_revision integer,next_state jsonb,command_id uuid,place_key text,object_key text,lease_end double precision,editing boolean)
RETURNS TABLE(outcome text,state jsonb,revision integer) LANGUAGE plpgsql AS $$
DECLARE result record; realm_key text;
BEGIN
 realm_key=split_part(game_key,':',1)||':'||split_part(game_key,':',2);
 IF left(place_key,length(realm_key)+1)<>realm_key||':' THEN place_key=realm_key||':'||place_key;END IF;
 PERFORM pg_advisory_xact_lock(hashtext('cw-place:'||place_key));
 SELECT * INTO result FROM cw_commit_game(game_key,expected_revision,next_state,command_id);
 IF result.outcome<>'committed' THEN RETURN QUERY SELECT result.outcome,result.state,result.revision;RETURN;END IF;
 IF editing AND EXISTS(SELECT 1 FROM cw_object_leases WHERE place=place_key AND holder<>game_key AND expires_at>now()) THEN RAISE EXCEPTION 'A guest is using your furniture; finish the visit before editing';END IF;
 IF object_key IS NOT NULL THEN
  INSERT INTO cw_object_leases(place,object_id,holder,expires_at) VALUES(place_key,object_key,game_key,to_timestamp(lease_end/1000.0))
  ON CONFLICT(place,object_id) DO UPDATE SET holder=excluded.holder,expires_at=excluded.expires_at WHERE cw_object_leases.expires_at<=now() OR cw_object_leases.holder=excluded.holder;
  IF NOT FOUND THEN RAISE EXCEPTION 'Someone is using that object. Choose another seat or wait';END IF;
 ELSE
  DELETE FROM cw_object_leases WHERE holder=game_key;
 END IF;
 RETURN QUERY SELECT result.outcome,result.state,result.revision;
END; $$;`
