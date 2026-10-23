export const worldSchema=`
CREATE TABLE IF NOT EXISTS cw_parcels (
 city smallint NOT NULL CHECK(city BETWEEN 0 AND 4), district integer NOT NULL CHECK(district>=0),
 x smallint NOT NULL CHECK(x BETWEEN 0 AND 7), y smallint NOT NULL CHECK(y BETWEEN 0 AND 7),
 identity text NOT NULL REFERENCES cw_games(identity) ON DELETE CASCADE,
 PRIMARY KEY(city,district,x,y)
);
CREATE INDEX IF NOT EXISTS cw_parcels_owner ON cw_parcels(identity);
CREATE TABLE IF NOT EXISTS cw_land_offers (
 id uuid PRIMARY KEY, buyer text NOT NULL REFERENCES cw_games(identity) ON DELETE CASCADE,
 seller text NOT NULL REFERENCES cw_games(identity) ON DELETE CASCADE,
 city smallint NOT NULL, district integer NOT NULL, x smallint NOT NULL, y smallint NOT NULL,
 amount bigint NOT NULL CHECK(amount>0), expires_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'pending',
 CHECK(buyer<>seller)
);
CREATE INDEX IF NOT EXISTS cw_offers_parties ON cw_land_offers(buyer,seller,status);
CREATE TABLE IF NOT EXISTS cw_gestures (
 id uuid PRIMARY KEY, sender text NOT NULL REFERENCES cw_games(identity) ON DELETE CASCADE,
 recipient text NOT NULL REFERENCES cw_games(identity) ON DELETE CASCADE,
 gesture text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
`
export const ensureEstateFunction=`
CREATE OR REPLACE FUNCTION cw_ensure_estate(game_key text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE g cw_games%ROWTYPE; c integer; d integer; px integer; py integer; candidate integer; n integer; pads jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('cw-world-property'));
 SELECT * INTO STRICT g FROM cw_games WHERE identity=game_key FOR UPDATE;
 IF EXISTS(SELECT 1 FROM cw_parcels WHERE identity=game_key) THEN RETURN; END IF;
 c=CASE WHEN (g.state->>'currentZone')::integer BETWEEN 0 AND 4 THEN (g.state->>'currentZone')::integer ELSE 0 END;
 candidate=0;
 LOOP
  d=candidate/16;px=(candidate%4)*2;py=((candidate%16)/4)*2;
  EXIT WHEN NOT EXISTS(SELECT 1 FROM cw_parcels WHERE city=c AND district=d AND x BETWEEN px AND px+1 AND y BETWEEN py AND py+1);
  candidate=candidate+1;
 END LOOP;
 n=1+FLOOR(COALESCE((g.state->'meters'->>'housingTier')::integer,0)/2.0)::integer;
 pads=jsonb_build_array(jsonb_build_object('x',px,'y',py));
 INSERT INTO cw_parcels VALUES(c,d,px,py,game_key);
 IF n>=2 THEN
  INSERT INTO cw_parcels VALUES(c,d,px+1,py,game_key);pads=pads||jsonb_build_array(jsonb_build_object('x',px+1,'y',py));
 END IF;
 IF n>=3 THEN
  INSERT INTO cw_parcels VALUES(c,d,px,py+1,game_key);pads=pads||jsonb_build_array(jsonb_build_object('x',px,'y',py+1));
 END IF;
 UPDATE cw_games SET state=jsonb_set(jsonb_set(state,'{home}',jsonb_build_object('city',c,'district',d,'x',px,'y',py,'plots',pads,'style','linen','open',true)),'{location}',jsonb_build_object('kind','home','tile',jsonb_build_object('x',3+px*4,'y',7+py*4),'journey',null)),revision=revision+1 WHERE identity=game_key;
END; $$;
`
export const worldCommitFunction=`
CREATE OR REPLACE FUNCTION cw_commit_world(game_key text, expected_revision integer, next_state jsonb, command_id uuid, command jsonb, land_price integer)
RETURNS TABLE(outcome text,state jsonb,revision integer) LANGUAGE plpgsql AS $$
DECLARE g cw_games%ROWTYPE; o cw_land_offers%ROWTYPE; kind text; c integer; d integer; px integer; py integer;
 holder text; counter_key text; counter_state jsonb; buyer_state jsonb; seller_state jsonb; amount bigint; pads jsonb; remaining integer; connected integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('cw-world-property'));
 SELECT * INTO STRICT g FROM cw_games WHERE identity=game_key FOR UPDATE;
 IF EXISTS(SELECT 1 FROM cw_commands WHERE identity=game_key AND request_id=command_id) THEN
  RETURN QUERY SELECT 'replayed'::text,g.state,g.revision; RETURN;
 END IF;
 IF g.revision<>expected_revision THEN RETURN QUERY SELECT 'conflict'::text,g.state,g.revision; RETURN; END IF;
 kind=command->>'type';c=(next_state->'home'->>'city')::integer;d=(next_state->'home'->>'district')::integer;
 px=(command->>'x')::integer;py=(command->>'y')::integer;
 IF kind IN ('buyLand','offerLand') THEN
  IF (next_state->>'currentZone')::integer<>c THEN RAISE EXCEPTION 'Return to your home city to expand'; END IF;
  IF NOT EXISTS(SELECT 1 FROM cw_parcels WHERE identity=game_key AND city=c AND district=d AND abs(x-px)+abs(y-py)=1) THEN RAISE EXCEPTION 'Only adjacent land can join your estate'; END IF;
  SELECT identity INTO holder FROM cw_parcels WHERE city=c AND district=d AND x=px AND y=py;
  IF holder=game_key THEN RAISE EXCEPTION 'You already own this land'; END IF;
  IF kind='buyLand' THEN
   IF holder IS NOT NULL THEN RAISE EXCEPTION 'This parcel is occupied; make its owner an offer'; END IF;
   IF land_price<=0 OR (next_state->>'gChog')::bigint<land_price THEN RAISE EXCEPTION 'Not enough gCHOG'; END IF;
   INSERT INTO cw_parcels VALUES(c,d,px,py,game_key);
   pads=(next_state->'home'->'plots')||jsonb_build_array(jsonb_build_object('x',px,'y',py));
   next_state=jsonb_set(jsonb_set(next_state,'{home,plots}',pads),'{gChog}',to_jsonb((next_state->>'gChog')::bigint-land_price));
   next_state=jsonb_set(next_state,'{lastMessage}',to_jsonb('Estate expanded. Your new parcel is ready.'::text));
  ELSE
   IF holder IS NULL THEN RAISE EXCEPTION 'This land is available to buy directly'; END IF;
   amount=(command->>'amount')::bigint;
   IF amount<=0 OR amount>1000000000 OR (next_state->>'gChog')::bigint<amount THEN RAISE EXCEPTION 'Not enough gCHOG to fund this offer'; END IF;
   IF (SELECT count(*) FROM cw_land_offers WHERE buyer=game_key AND status='pending')>=10 THEN RAISE EXCEPTION 'Cancel an outstanding offer first'; END IF;
   INSERT INTO cw_land_offers(id,buyer,seller,city,district,x,y,amount,expires_at) VALUES(command_id,game_key,holder,c,d,px,py,amount,now()+interval '24 hours');
   next_state=jsonb_set(jsonb_set(next_state,'{gChog}',to_jsonb((next_state->>'gChog')::bigint-amount)),'{lastMessage}',to_jsonb('Land offer sent. The amount is held until accepted, rejected or canceled.'::text));
  END IF;
 ELSIF kind='respondOffer' THEN
  SELECT * INTO o FROM cw_land_offers WHERE id=(command->>'id')::uuid FOR UPDATE;
  IF NOT FOUND OR o.status<>'pending' THEN RAISE EXCEPTION 'Offer is no longer pending'; END IF;
  IF command->>'decision'='cancel' AND o.buyer<>game_key OR command->>'decision' IN ('accept','reject') AND o.seller<>game_key THEN RAISE EXCEPTION 'This offer belongs to another resident'; END IF;
  counter_key=CASE WHEN game_key=o.buyer THEN o.seller ELSE o.buyer END;
  SELECT cw_games.state INTO STRICT counter_state FROM cw_games WHERE identity=counter_key FOR UPDATE;
  buyer_state=CASE WHEN game_key=o.buyer THEN next_state ELSE counter_state END;
  seller_state=CASE WHEN game_key=o.seller THEN next_state ELSE counter_state END;
  IF command->>'decision'='accept' THEN
   IF o.expires_at<=now() THEN RAISE EXCEPTION 'This offer expired; reject or cancel it to refund the buyer'; END IF;
   IF NOT EXISTS(SELECT 1 FROM cw_parcels WHERE city=o.city AND district=o.district AND x=o.x AND y=o.y AND identity=o.seller) THEN RAISE EXCEPTION 'The parcel owner changed; reject or cancel this offer'; END IF;
   IF (seller_state->'home'->>'x')::integer=o.x AND (seller_state->'home'->>'y')::integer=o.y THEN RAISE EXCEPTION 'A resident cannot sell their home parcel'; END IF;
   IF NOT EXISTS(SELECT 1 FROM cw_parcels WHERE identity=o.buyer AND city=o.city AND district=o.district AND abs(x-o.x)+abs(y-o.y)=1) THEN RAISE EXCEPTION 'The parcel no longer adjoins the buyer estate'; END IF;
   SELECT count(*)-1 INTO remaining FROM cw_parcels WHERE identity=o.seller;
   WITH RECURSIVE component(x,y) AS (
    SELECT (seller_state->'home'->>'x')::smallint,(seller_state->'home'->>'y')::smallint
    UNION
    SELECT p.x,p.y FROM cw_parcels p JOIN component q ON abs(p.x-q.x)+abs(p.y-q.y)=1
    WHERE p.identity=o.seller AND NOT(p.x=o.x AND p.y=o.y)
   ) SELECT count(*) INTO connected FROM component;
   IF connected<>remaining THEN RAISE EXCEPTION 'This sale would disconnect the seller estate'; END IF;
   UPDATE cw_parcels SET identity=o.buyer WHERE city=o.city AND district=o.district AND x=o.x AND y=o.y;
   SELECT jsonb_agg(jsonb_build_object('x',x,'y',y) ORDER BY x,y) INTO pads FROM cw_parcels WHERE identity=o.seller;
   seller_state=jsonb_set(jsonb_set(seller_state,'{home,plots}',pads),'{gChog}',to_jsonb((seller_state->>'gChog')::bigint+o.amount));
   SELECT jsonb_agg(jsonb_build_object('x',x,'y',y) ORDER BY x,y) INTO pads FROM cw_parcels WHERE identity=o.buyer;
   buyer_state=jsonb_set(buyer_state,'{home,plots}',pads);
   UPDATE cw_land_offers SET status='accepted' WHERE id=o.id;
  ELSE
   buyer_state=jsonb_set(buyer_state,'{gChog}',to_jsonb((buyer_state->>'gChog')::bigint+o.amount));
   UPDATE cw_land_offers SET status=CASE WHEN command->>'decision'='cancel' THEN 'canceled' ELSE 'rejected' END WHERE id=o.id;
  END IF;
  next_state=CASE WHEN game_key=o.buyer THEN buyer_state ELSE seller_state END;
  counter_state=CASE WHEN counter_key=o.buyer THEN buyer_state ELSE seller_state END;
  UPDATE cw_games SET state=counter_state,revision=cw_games.revision+1,updated_at=now() WHERE identity=counter_key;
  next_state=jsonb_set(next_state,'{lastMessage}',to_jsonb('Land offer resolved. Property and balances updated.'::text));
 ELSIF kind='gesture' THEN
  counter_key=command->>'recipient';
  SELECT cw_games.state INTO counter_state FROM cw_games WHERE identity=counter_key AND updated_at>now()-interval '45 seconds' FOR UPDATE;
  IF NOT FOUND OR counter_key=game_key THEN RAISE EXCEPTION 'That resident is no longer nearby'; END IF;
  IF next_state->'location'->>'kind'<>'street' OR counter_state->'location'->>'kind'<>'street' OR next_state->'location'->'journey'<>'null'::jsonb OR counter_state->'location'->'journey'<>'null'::jsonb OR next_state->>'currentZone'<>counter_state->>'currentZone' OR COALESCE(next_state->'location'->>'district',next_state->'home'->>'district')<>COALESCE(counter_state->'location'->>'district',counter_state->'home'->>'district') THEN RAISE EXCEPTION 'Meet outside in the same neighborhood first'; END IF;
  IF abs((next_state->'location'->'tile'->>'x')::integer-(counter_state->'location'->'tile'->>'x')::integer)+abs((next_state->'location'->'tile'->>'y')::integer-(counter_state->'location'->'tile'->>'y')::integer)>2 THEN RAISE EXCEPTION 'Walk closer to that resident first'; END IF;
  IF EXISTS(SELECT 1 FROM cw_gestures WHERE sender=game_key AND created_at>now()-interval '30 seconds') THEN RAISE EXCEPTION 'Give your neighbor a moment before another interaction'; END IF;
  INSERT INTO cw_gestures(id,sender,recipient,gesture) VALUES(command_id,game_key,counter_key,command->>'gesture');
  next_state=jsonb_set(jsonb_set(next_state,'{meters,social}',to_jsonb(LEAST(100,(next_state->'meters'->>'social')::numeric+10))),'{lastMessage}',to_jsonb('A little neighborly connection. +10 social.'::text));
  counter_state=jsonb_set(counter_state,'{meters,social}',to_jsonb(LEAST(100,(counter_state->'meters'->>'social')::numeric+10)));
  UPDATE cw_games SET state=counter_state,revision=cw_games.revision+1 WHERE identity=counter_key;
 ELSE RAISE EXCEPTION 'Unsupported world command';
 END IF;
 UPDATE cw_games SET state=next_state,revision=cw_games.revision+1,updated_at=now() WHERE identity=game_key;
 INSERT INTO cw_commands(identity,request_id) VALUES(game_key,command_id);
 RETURN QUERY SELECT 'committed'::text,next_state,g.revision+1;
END; $$;
`
