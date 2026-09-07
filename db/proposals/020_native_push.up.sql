-- Native iOS notifications. Off by default; apply after 019 with a verified
-- schema/ACL backup, local regression tests and exact technical review.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
SELECT bounty_private.assert_deletion_schema();

CREATE TABLE bounty_private.push_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  enabled boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'production' CHECK(environment IN ('production','development'))
);
INSERT INTO bounty_private.push_settings DEFAULT VALUES;
CREATE TABLE bounty_private.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
  installation_id uuid NOT NULL,
  token text NOT NULL CHECK(token ~ '^[0-9a-f]+$' AND char_length(token) BETWEEN 64 AND 512),
  environment text NOT NULL CHECK(environment IN ('production','development')),
  version uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token,environment), UNIQUE(installation_id,environment)
);
CREATE INDEX push_devices_user ON bounty_private.push_devices(user_id);
CREATE TABLE bounty_private.push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES bounty_private.push_devices(id) ON DELETE CASCADE,
  device_version uuid NOT NULL,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('mission_assigned','mission_submitted','mission_approved','mission_rejected','reward_collected','connection_requested','connection_accepted')),
  resource_id uuid NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  next_attempt timestamptz NOT NULL DEFAULT now(),
  lease uuid, lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE INDEX push_deliveries_ready ON bounty_private.push_deliveries(next_attempt,lease_until);
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['push_settings','push_devices','push_deliveries'] LOOP
    EXECUTE format('ALTER TABLE bounty_private.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('REVOKE ALL ON bounty_private.%I FROM PUBLIC,anon,authenticated',name);
    EXECUTE format('GRANT ALL ON bounty_private.%I TO service_role',name);
  END LOOP;
END $$;
-- Deleting private delivery state is always safe; only reviewed RPCs/admins have
-- DELETE privileges. Freeze guards apply to writes that retain account links.
CREATE TRIGGER account_deletion_guard BEFORE INSERT OR UPDATE ON bounty_private.push_devices
  FOR EACH ROW EXECUTE FUNCTION bounty_private.guard_account_links('user_id');
CREATE TRIGGER account_deletion_guard BEFORE INSERT OR UPDATE ON bounty_private.push_deliveries
  FOR EACH ROW EXECUTE FUNCTION bounty_private.guard_account_links('recipient_id','actor_id');

CREATE FUNCTION public.register_push_device(p_installation uuid,p_token text,p_environment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); sid uuid:=(auth.jwt()->>'session_id')::uuid;
BEGIN
  IF uid IS NULL OR sid IS NULL OR NOT bounty_private.account_active(uid)
    OR NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=sid AND s.user_id=uid AND (s.not_after IS NULL OR s.not_after>now()))
    THEN RAISE EXCEPTION 'session_required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM bounty_private.push_settings WHERE enabled AND environment=p_environment)
    THEN RAISE EXCEPTION 'push_unavailable' USING ERRCODE='42501'; END IF;
  IF p_installation IS NULL OR p_token IS NULL OR p_token !~* '^[0-9a-f]+$' OR char_length(p_token) NOT BETWEEN 64 AND 512
    THEN RAISE EXCEPTION 'invalid_device'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('account:'||uid::text,0));
  UPDATE bounty_private.push_devices SET updated_at=now() WHERE user_id=uid AND session_id=sid
    AND installation_id=p_installation AND token=lower(p_token) AND environment=p_environment;
  IF FOUND THEN RETURN; END IF;
  -- A token is one installation's opaque APNs address. Re-registering after an
  -- account/session switch cancels its old pending deliveries through CASCADE.
  DELETE FROM bounty_private.push_devices WHERE environment=p_environment
    AND (installation_id=p_installation OR token=lower(p_token));
  DELETE FROM bounty_private.push_devices WHERE user_id=uid AND updated_at<=now()-interval '90 days';
  IF (SELECT count(*) FROM bounty_private.push_devices WHERE user_id=uid)>=5
    THEN RAISE EXCEPTION 'device_limit'; END IF;
  INSERT INTO bounty_private.push_devices(user_id,session_id,installation_id,token,environment)
    VALUES(uid,sid,p_installation,lower(p_token),p_environment);
END $$;
CREATE FUNCTION public.revoke_push_device(p_installation uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  DELETE FROM bounty_private.push_devices WHERE user_id=auth.uid() AND installation_id=p_installation
$$;

CREATE FUNCTION bounty_private.enqueue_push(p_kind text,resource uuid,actor uuid,recipient uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF actor IS NULL OR recipient IS NULL OR actor=recipient
    OR NOT EXISTS(SELECT 1 FROM bounty_private.push_settings WHERE enabled)
    OR NOT public.notification_pair_allowed(actor,recipient) THEN RETURN; END IF;
  -- Bound undelivered state. These generic updates are hints to refetch, never
  -- the authoritative mission/reward record; repeated changes coalesce.
  DELETE FROM bounty_private.push_deliveries WHERE recipient_id=recipient
    AND resource_id=resource AND kind=p_kind AND lease IS NULL;
  INSERT INTO bounty_private.push_deliveries(device_id,device_version,recipient_id,actor_id,kind,resource_id)
    SELECT d.id,d.version,recipient,actor,p_kind,resource FROM bounty_private.push_devices d
    JOIN auth.sessions s ON s.id=d.session_id AND s.user_id=d.user_id
    JOIN bounty_private.push_settings c ON c.enabled AND c.environment=d.environment
    WHERE d.user_id=recipient AND (s.not_after IS NULL OR s.not_after>now())
      AND d.updated_at>now()-interval '90 days'
      AND (SELECT count(*) FROM bounty_private.push_deliveries q WHERE q.device_id=d.id)<100;
END $$;
CREATE FUNCTION bounty_private.push_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; recipient uuid; kind text;
BEGIN
  IF (COALESCE(auth.jwt()->>'role','')='service_role' AND current_setting('bounty.account_cleanup',true)='allowed')
    OR NOT EXISTS(SELECT 1 FROM bounty_private.push_settings WHERE enabled) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='tasks' THEN
    IF TG_OP='INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      kind:='mission_assigned'; actor:=NEW.created_by; recipient:=NEW.assigned_to;
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status IN ('review','submitted') THEN kind:='mission_submitted'; actor:=NEW.assigned_to; recipient:=NEW.created_by;
      ELSIF NEW.status='completed' THEN kind:='mission_approved'; actor:=NEW.created_by; recipient:=NEW.assigned_to;
      ELSIF NEW.status='rejected' THEN kind:='mission_rejected'; actor:=NEW.created_by; recipient:=NEW.assigned_to;
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME='collected_rewards' THEN
    kind:='reward_collected'; actor:=NEW.collector_id;
    SELECT creator_id INTO recipient FROM public.rewards_store WHERE id=NEW.reward_id;
  ELSIF TG_TABLE_NAME='friendships' THEN
    IF TG_OP='INSERT' AND NEW.status='pending' THEN
      kind:='connection_requested'; actor:=NEW.requested_by;
      recipient:=CASE WHEN actor=NEW.user1_id THEN NEW.user2_id ELSE NEW.user1_id END;
    ELSIF NEW.status='accepted' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      kind:='connection_accepted'; recipient:=NEW.requested_by;
      actor:=CASE WHEN recipient=NEW.user1_id THEN NEW.user2_id ELSE NEW.user1_id END;
    END IF;
  END IF;
  IF kind IS NOT NULL THEN PERFORM bounty_private.enqueue_push(kind,NEW.id,actor,recipient); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER native_push_event AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION bounty_private.push_event();
CREATE TRIGGER native_push_event AFTER INSERT ON public.collected_rewards FOR EACH ROW EXECUTE FUNCTION bounty_private.push_event();
CREATE TRIGGER native_push_event AFTER INSERT OR UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION bounty_private.push_event();

CREATE FUNCTION bounty_private.push_valid(q bounty_private.push_deliveries)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
  SELECT q.expires_at>now() AND public.notification_pair_allowed(q.actor_id,q.recipient_id)
    AND EXISTS(SELECT 1 FROM bounty_private.push_devices d JOIN auth.sessions s ON s.id=d.session_id AND s.user_id=d.user_id
      JOIN bounty_private.push_settings c ON c.enabled AND c.environment=d.environment
      WHERE d.id=q.device_id AND d.version=q.device_version AND d.user_id=q.recipient_id
        AND (s.not_after IS NULL OR s.not_after>now()) AND d.updated_at>now()-interval '90 days')
    AND CASE
      WHEN q.kind IN ('mission_assigned','mission_approved','mission_rejected') THEN EXISTS(
        SELECT 1 FROM public.tasks t WHERE t.id=q.resource_id AND t.assigned_to=q.recipient_id AND t.created_by=q.actor_id
          AND NOT COALESCE(t.is_archived,false) AND (q.kind='mission_assigned' OR t.status=CASE q.kind WHEN 'mission_approved' THEN 'completed' ELSE 'rejected' END))
      WHEN q.kind='mission_submitted' THEN EXISTS(SELECT 1 FROM public.tasks t WHERE t.id=q.resource_id
        AND t.created_by=q.recipient_id AND t.assigned_to=q.actor_id AND t.status IN ('review','submitted') AND NOT COALESCE(t.is_archived,false))
      WHEN q.kind='reward_collected' THEN EXISTS(SELECT 1 FROM public.collected_rewards c JOIN public.rewards_store r ON r.id=c.reward_id
        WHERE c.id=q.resource_id AND c.collector_id=q.actor_id AND r.creator_id=q.recipient_id)
      ELSE EXISTS(SELECT 1 FROM public.friendships f WHERE f.id=q.resource_id
        AND ((f.user1_id=q.recipient_id AND f.user2_id=q.actor_id) OR (f.user2_id=q.recipient_id AND f.user1_id=q.actor_id))
        AND f.status=CASE q.kind WHEN 'connection_requested' THEN 'pending' ELSE 'accepted' END)
    END
$$;
CREATE FUNCTION public.claim_push_deliveries()
RETURNS TABLE(id uuid,lease uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  DELETE FROM bounty_private.push_deliveries q WHERE q.expires_at<=now();
  DELETE FROM bounty_private.push_devices d WHERE d.updated_at<=now()-interval '90 days';
  IF NOT EXISTS(SELECT 1 FROM bounty_private.push_settings WHERE enabled) THEN RETURN; END IF;
  -- Invalid accounts/blocks are removed before taking leases. No personal text is stored.
  DELETE FROM bounty_private.push_deliveries q WHERE NOT bounty_private.push_valid(q);
  RETURN QUERY WITH ready AS (
    SELECT q.id FROM bounty_private.push_deliveries q WHERE q.next_attempt<=now()
      AND (q.lease_until IS NULL OR q.lease_until<now()) AND q.attempts<5
      ORDER BY q.created_at FOR UPDATE SKIP LOCKED LIMIT 10
  ) UPDATE bounty_private.push_deliveries q SET lease=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=q.attempts+1
    FROM ready WHERE q.id=ready.id RETURNING q.id,q.lease;
END $$;

CREATE FUNCTION bounty_private.disable_push_cleanup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT NEW.enabled OR NEW.environment IS DISTINCT FROM OLD.environment THEN
    DELETE FROM bounty_private.push_deliveries;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER disable_push_cleanup AFTER UPDATE ON bounty_private.push_settings
  FOR EACH ROW EXECUTE FUNCTION bounty_private.disable_push_cleanup();
REVOKE ALL ON FUNCTION bounty_private.disable_push_cleanup() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.prepare_push_delivery(p_id uuid,p_lease uuid)
RETURNS TABLE(id uuid,token text,environment text,recipient_id uuid,kind text,resource_id uuid,expires_at timestamptz)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
  SELECT q.id,d.token,d.environment,q.recipient_id,q.kind,q.resource_id,q.expires_at
  FROM bounty_private.push_deliveries q JOIN bounty_private.push_devices d ON d.id=q.device_id
  WHERE q.id=p_id AND q.lease=p_lease AND q.lease_until>now() AND bounty_private.push_valid(q)
$$;
CREATE FUNCTION public.finish_push_delivery(p_id uuid,p_lease uuid,p_outcome text,p_invalidated_at timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q bounty_private.push_deliveries;
BEGIN
  SELECT * INTO q FROM bounty_private.push_deliveries WHERE id=p_id AND lease=p_lease AND lease_until>now() FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF p_outcome NOT IN ('accepted','retry','invalid_token','discard') OR p_outcome IS NULL THEN RAISE EXCEPTION 'invalid_outcome'; END IF;
  IF p_outcome='invalid_token' THEN
    -- APNs 410 timestamps fence a fresh same-token registration that happened
    -- after this send began. Missing/invalid timestamps never destroy a device.
    DELETE FROM bounty_private.push_devices WHERE id=q.device_id AND version=q.device_version
      AND updated_at<=p_invalidated_at AND p_invalidated_at<=now();
    DELETE FROM bounty_private.push_deliveries WHERE push_deliveries.id=p_id;
  ELSIF p_outcome='retry' AND q.attempts<5 AND bounty_private.push_valid(q) THEN
    UPDATE bounty_private.push_deliveries SET lease=NULL,lease_until=NULL,next_attempt=now()+make_interval(secs=>30*power(2,q.attempts)::integer) WHERE push_deliveries.id=p_id;
  ELSE DELETE FROM bounty_private.push_deliveries WHERE push_deliveries.id=p_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.register_push_device(uuid,text,text),public.revoke_push_device(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_push_device(uuid,text,text),public.revoke_push_device(uuid) TO authenticated;
REVOKE ALL ON FUNCTION bounty_private.enqueue_push(text,uuid,uuid,uuid),bounty_private.push_event(),bounty_private.push_valid(bounty_private.push_deliveries) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_push_deliveries(),public.prepare_push_delivery(uuid,uuid),public.finish_push_delivery(uuid,uuid,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_deliveries(),public.prepare_push_delivery(uuid,uuid),public.finish_push_delivery(uuid,uuid,text,timestamptz) TO service_role;

-- Preserve every 018/019 assertion, adding exact dependencies for cascading push
-- cleanup. Watching the new tables also makes future incoming FKs fail closed.
DO $inventory$ DECLARE definition text; anchor text:='WITH expected(child,name,definition) AS (VALUES'; BEGIN
  SELECT pg_get_functiondef('bounty_private.assert_deletion_schema()'::regprocedure) INTO definition;
  IF position('bounty_private.user_blocks' IN definition)=0 OR position(anchor IN definition)=0 THEN RAISE EXCEPTION '020: expected 019 deletion guard'; END IF;
  definition:=replace(definition,anchor,anchor||$fks$
      ('bounty_private.push_devices','push_devices_user_id_fkey','FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('bounty_private.push_devices','push_devices_session_id_fkey','FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE'),
      ('bounty_private.push_deliveries','push_deliveries_device_id_fkey','FOREIGN KEY (device_id) REFERENCES bounty_private.push_devices(id) ON DELETE CASCADE'),
      ('bounty_private.push_deliveries','push_deliveries_recipient_id_fkey','FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('bounty_private.push_deliveries','push_deliveries_actor_id_fkey','FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE'),$fks$);
  IF position('''public.profiles''::regclass' IN definition)=0 THEN RAISE EXCEPTION '020: dependency anchor changed'; END IF;
  definition:=replace(definition,'''public.profiles''::regclass','''auth.sessions''::regclass,''bounty_private.push_devices''::regclass,''bounty_private.push_deliveries''::regclass,''public.profiles''::regclass');
  EXECUTE definition;
END $inventory$;
SELECT bounty_private.assert_deletion_schema();
NOTIFY pgrst,'reload schema';
COMMIT;
