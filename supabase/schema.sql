--
-- PostgreSQL database dump
--

\restrict hTGXa88kAYlfGMEmDxQPkRVyKQG2sp5cgtcId10obS4fuukxedxCdfAHqjD37EO

-- Dumped from database version 15.14
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: award_credits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."award_credits"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only process if task is being marked as completed and has credit reward
  IF NEW.status = 'completed' AND OLD.status != 'completed' 
     AND NEW.reward_type = 'credit' AND NEW.reward_text IS NOT NULL THEN
    
    -- Update user credits
    INSERT INTO user_credits (user_id, balance, total_earned)
    VALUES (NEW.assigned_to, CAST(NEW.reward_text AS INTEGER), CAST(NEW.reward_text AS INTEGER))
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = user_credits.balance + CAST(NEW.reward_text AS INTEGER),
      total_earned = user_credits.total_earned + CAST(NEW.reward_text AS INTEGER),
      updated_at = now();
    
    -- Log transaction
    INSERT INTO credit_transactions (user_id, task_id, amount, transaction_type)
    VALUES (NEW.assigned_to, NEW.id, CAST(NEW.reward_text AS INTEGER), 'earned');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: create_bounty("text", "text", "text", integer, "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."create_bounty"("p_name" "text", "p_description" "text", "p_image_url" "text", "p_credit_cost" integer, "p_creator_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_bounty_id uuid;
BEGIN
  INSERT INTO marketplace_bounties (name, description, image_url, credit_cost, creator_id)
  VALUES (p_name, p_description, p_image_url, p_credit_cost, p_creator_id)
  RETURNING id INTO v_bounty_id;
  
  RETURN v_bounty_id;
END;
$$;


--
-- Name: create_reward_store_item("text", "text", "text", integer, "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."create_reward_store_item"("p_name" "text", "p_description" "text", "p_image_url" "text", "p_credit_cost" integer, "p_assigned_to" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_new_id UUID;
  v_are_friends BOOLEAN;
BEGIN
  -- Check friendship
  SELECT EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE status = 'accepted'
    AND ((user1_id = auth.uid() AND user2_id = p_assigned_to) 
      OR (user2_id = auth.uid() AND user1_id = p_assigned_to))
  ) INTO v_are_friends;

  IF NOT v_are_friends THEN
    RETURN json_build_object('success', false, 'error', 'Can only create bounties for friends');
  END IF;

  -- Validate credits
  IF p_credit_cost < 1 OR p_credit_cost > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Credit cost must be between 1 and 1,000,000');
  END IF;

  -- Insert
  INSERT INTO public.rewards_store (
    name, description, image_url, credit_cost, creator_id, assigned_to
  ) VALUES (
    p_name, p_description, p_image_url, p_credit_cost, auth.uid(), p_assigned_to
  ) RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'reward_id', v_new_id);
END;
$$;


--
-- Name: delete_reward_store_item("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."delete_reward_store_item"("p_bounty_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user owns this bounty
  IF NOT EXISTS (
    SELECT 1 FROM public.rewards_store 
    WHERE id = p_bounty_id AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Delete the bounty
  DELETE FROM public.rewards_store WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: handle_bounties_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_bounties_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id, 
    new.email,
    SPLIT_PART(new.email, '@', 1),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;


--
-- Name: increment_counter_on_complete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_counter_on_complete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE recurring_templates 
    SET frequency_counter = frequency_counter + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: increment_user_credits("uuid", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_user_credits"("user_id_param" "uuid", "amount_param" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE user_credits
  SET balance = balance + amount_param
  WHERE user_id = user_id_param;
END;
$$;


--
-- Name: notify_new_bounty(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."notify_new_bounty"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  assignee_email TEXT;
  assignee_name TEXT;
BEGIN
  -- Using the correct column name: assigned_to (not assignee_id)
  SELECT email, display_name INTO assignee_email, assignee_name
  FROM profiles
  WHERE id = NEW.assigned_to;

  IF assignee_email IS NOT NULL THEN
    PERFORM net.http_post(
      url:='https://tsnjpylkgsovjujoczll.supabase.co/functions/v1/send-new-bounty-alert',
      body:=jsonb_build_object(
        'assigneeEmail', assignee_email,
        'assigneeName', assignee_name,
        'taskTitle', NEW.title,
        'taskId', NEW.id
      ),
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzbmpweWxrZ3Nvdmp1am9jemxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMzM1OSwiZXhwIjoyMDY0NTg5MzU5fQ.DKyNJmDGq3iqI6DvKzScouaPinP8SNU5L73VJiuJJHE"}'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: prevent_duplicate_emails(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."prevent_duplicate_emails"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(NEW.email) AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: purchase_bounty("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."purchase_bounty"("p_bounty_id" "uuid", "p_collector_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_bounty_type text;
  v_credit_cost integer;
BEGIN
  -- Get bounty details
  SELECT bounty_type, credit_cost INTO v_bounty_type, v_credit_cost
  FROM marketplace_bounties
  WHERE id = p_bounty_id AND is_active = true;
  
  -- For credit bounties: ADD credits
  IF v_bounty_type = 'credit' THEN
    UPDATE user_credits
    SET credits = credits + v_credit_cost  -- ADD not subtract!
    WHERE user_id = p_collector_id;
  END IF;
  
  -- Record collection
  INSERT INTO collected_bounties (bounty_id, collector_id)
  VALUES (p_bounty_id, p_collector_id);
  
  RETURN true;
END;
$$;


--
-- Name: update_reward_store_item("uuid", "text", "text", "text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_reward_store_item"("p_bounty_id" "uuid", "p_name" "text", "p_description" "text", "p_image_url" "text", "p_credit_cost" integer) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.rewards_store 
    WHERE id = p_bounty_id AND creator_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Update WITHOUT updated_at (remove that line)
  UPDATE public.rewards_store 
  SET 
    name = p_name,
    description = p_description,
    image_url = p_image_url,
    credit_cost = p_credit_cost
  WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: collected_bounties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."collected_bounties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bounty_id" "uuid",
    "collector_id" "uuid",
    "collected_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: collected_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."collected_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reward_id" "uuid",
    "collector_id" "uuid",
    "collected_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."credit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "task_id" "uuid",
    "amount" integer NOT NULL,
    "transaction_type" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "credit_transactions_transaction_type_check" CHECK ((("transaction_type")::"text" = ANY (ARRAY[('earned'::character varying)::"text", ('spent'::character varying)::"text"])))
);


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."friendships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user1_id" "uuid",
    "user2_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "requested_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "no_self_friendship" CHECK (("user1_id" <> "user2_id"))
);


--
-- Name: marketplace_bounties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."marketplace_bounties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "credit_cost" integer NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bounty_type" "text" DEFAULT 'credit'::"text",
    "direct_reward" "text",
    CONSTRAINT "marketplace_bounties_bounty_type_check" CHECK (("bounty_type" = ANY (ARRAY['credit'::"text", 'direct'::"text"])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'user'::"text"
);


--
-- Name: rewards_store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."rewards_store" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "credit_cost" integer NOT NULL,
    "creator_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "assigned_to" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_by" "uuid",
    "assigned_to" "uuid",
    "title" "text" NOT NULL,
    "deadline" "date",
    "reward_type" "text",
    "reward_text" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "proof_url" "text",
    "proof_type" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "frequency_limit" integer,
    "frequency_period" character varying(10) DEFAULT NULL::character varying,
    "proof_description" "text",
    "proof_required" boolean DEFAULT false,
    "is_archived" boolean DEFAULT false,
    CONSTRAINT "tasks_proof_type_check" CHECK (("proof_type" = ANY (ARRAY['image'::"text", 'video'::"text"]))),
    CONSTRAINT "tasks_reward_type_check" CHECK ((("reward_type" = ANY (ARRAY['credit'::"text", 'text'::"text", 'credits'::"text", 'items'::"text", 'other'::"text", 'cash'::"text", 'service'::"text", 'voucher'::"text"])) OR ("reward_type" IS NULL))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'submitted'::"text", 'review'::"text", 'completed'::"text", 'rejected'::"text", 'archived'::"text"])))
);


--
-- Name: user_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_credits" (
    "user_id" "uuid" NOT NULL,
    "balance" integer DEFAULT 0,
    "total_earned" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: collected_bounties collected_bounties_bounty_id_collector_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collected_bounties"
    ADD CONSTRAINT "collected_bounties_bounty_id_collector_id_key" UNIQUE ("bounty_id", "collector_id");


--
-- Name: collected_bounties collected_bounties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collected_bounties"
    ADD CONSTRAINT "collected_bounties_pkey" PRIMARY KEY ("id");


--
-- Name: collected_rewards collected_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collected_rewards"
    ADD CONSTRAINT "collected_rewards_pkey" PRIMARY KEY ("id");


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");


--
-- Name: marketplace_bounties marketplace_bounties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."marketplace_bounties"
    ADD CONSTRAINT "marketplace_bounties_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: rewards_store rewards_store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."rewards_store"
    ADD CONSTRAINT "rewards_store_pkey" PRIMARY KEY ("id");


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");


--
-- Name: friendships unique_friendship; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "unique_friendship" UNIQUE ("user1_id", "user2_id");


--
-- Name: user_credits user_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_credits"
    ADD CONSTRAINT "user_credits_pkey" PRIMARY KEY ("user_id");


--
-- Name: tasks award_credits_on_completion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "award_credits_on_completion" AFTER UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."award_credits"();


--
-- Name: marketplace_bounties on_bounties_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "on_bounties_updated" BEFORE UPDATE ON "public"."marketplace_bounties" FOR EACH ROW EXECUTE FUNCTION "public"."handle_bounties_updated_at"();


--
-- Name: tasks on_new_task_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "on_new_task_assignment" AFTER INSERT ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_bounty"();


--
-- Name: collected_bounties collected_bounties_bounty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collected_bounties"
    ADD CONSTRAINT "collected_bounties_bounty_id_fkey" FOREIGN KEY ("bounty_id") REFERENCES "public"."marketplace_bounties"("id");


--
-- Name: collected_bounties collected_bounties_collector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collected_bounties"
    ADD CONSTRAINT "collected_bounties_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "public"."profiles"("id");


--
-- Name: collected_rewards collected_rewards_collector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collected_rewards"
    ADD CONSTRAINT "collected_rewards_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "auth"."users"("id");


--
-- Name: collected_rewards collected_rewards_reward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collected_rewards"
    ADD CONSTRAINT "collected_rewards_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards_store"("id");


--
-- Name: credit_transactions credit_transactions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");


--
-- Name: credit_transactions credit_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


--
-- Name: friendships friendships_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id");


--
-- Name: friendships friendships_user1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: friendships friendships_user2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: marketplace_bounties marketplace_bounties_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."marketplace_bounties"
    ADD CONSTRAINT "marketplace_bounties_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id");


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");


--
-- Name: rewards_store rewards_store_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."rewards_store"
    ADD CONSTRAINT "rewards_store_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");


--
-- Name: rewards_store rewards_store_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."rewards_store"
    ADD CONSTRAINT "rewards_store_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id");


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: user_credits user_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_credits"
    ADD CONSTRAINT "user_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


--
-- Name: tasks Admins full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access" ON "public"."tasks" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));


--
-- Name: rewards_store Create bounties for friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Create bounties for friends" ON "public"."rewards_store" FOR INSERT WITH CHECK ((("creator_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."friendships"
  WHERE (("friendships"."status" = 'accepted'::"text") AND ((("friendships"."user1_id" = "auth"."uid"()) AND ("friendships"."user2_id" = "rewards_store"."assigned_to")) OR (("friendships"."user2_id" = "auth"."uid"()) AND ("friendships"."user1_id" = "rewards_store"."assigned_to"))))))));


--
-- Name: friendships Create friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Create friendships" ON "public"."friendships" FOR INSERT WITH CHECK (("auth"."uid"() = "requested_by"));


--
-- Name: tasks Create tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Create tasks" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));


--
-- Name: rewards_store Delete own bounties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delete own bounties" ON "public"."rewards_store" FOR DELETE USING (("creator_id" = "auth"."uid"()));


--
-- Name: profiles Public profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles" ON "public"."profiles" FOR SELECT USING (true);


--
-- Name: friendships Update friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Update friendships" ON "public"."friendships" FOR UPDATE USING ((("auth"."uid"() = "user1_id") OR ("auth"."uid"() = "user2_id")));


--
-- Name: rewards_store Update own bounties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Update own bounties" ON "public"."rewards_store" FOR UPDATE USING (("creator_id" = "auth"."uid"()));


--
-- Name: profiles Update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));


--
-- Name: tasks Update tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Update tasks" ON "public"."tasks" FOR UPDATE USING ((("auth"."uid"() = "created_by") OR ("auth"."uid"() = "assigned_to")));


--
-- Name: friendships Users can delete own friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own friend requests" ON "public"."friendships" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "requested_by") AND ("status" = 'pending'::"text")));


--
-- Name: tasks Users can delete own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own tasks" ON "public"."tasks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));


--
-- Name: user_credits Users can insert own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own credits" ON "public"."user_credits" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = ("user_id")::"text"));


--
-- Name: tasks Users can update assigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update assigned tasks" ON "public"."tasks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "assigned_to"));


--
-- Name: tasks Users can update own created tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own created tasks" ON "public"."tasks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));


--
-- Name: user_credits Users can update own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own credits" ON "public"."user_credits" FOR UPDATE USING ((("auth"."uid"())::"text" = ("user_id")::"text"));


--
-- Name: tasks Users can view assigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view assigned tasks" ON "public"."tasks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "assigned_to"));


--
-- Name: user_credits Users can view own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own credits" ON "public"."user_credits" FOR SELECT USING ((("auth"."uid"())::"text" = ("user_id")::"text"));


--
-- Name: rewards_store View bounties I created; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View bounties I created" ON "public"."rewards_store" FOR SELECT USING (("creator_id" = "auth"."uid"()));


--
-- Name: rewards_store View bounties assigned to me by friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View bounties assigned to me by friends" ON "public"."rewards_store" FOR SELECT USING ((("assigned_to" = "auth"."uid"()) AND ("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."friendships"
  WHERE (("friendships"."status" = 'accepted'::"text") AND ((("friendships"."user1_id" = "rewards_store"."creator_id") AND ("friendships"."user2_id" = "auth"."uid"())) OR (("friendships"."user2_id" = "rewards_store"."creator_id") AND ("friendships"."user1_id" = "auth"."uid"()))))))));


--
-- Name: friendships View friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View friendships" ON "public"."friendships" FOR SELECT USING ((("auth"."uid"() = "user1_id") OR ("auth"."uid"() = "user2_id")));


--
-- Name: tasks View tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View tasks" ON "public"."tasks" FOR SELECT USING ((("auth"."uid"() = "created_by") OR ("auth"."uid"() = "assigned_to")));


--
-- Name: collected_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."collected_rewards" ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;

--
-- Name: friendships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: rewards_store; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."rewards_store" ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_credits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_credits" ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict hTGXa88kAYlfGMEmDxQPkRVyKQG2sp5cgtcId10obS4fuukxedxCdfAHqjD37EO

