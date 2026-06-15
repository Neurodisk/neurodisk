-- Schéma exporté automatiquement (structure seule, pas de données)

SET statement_timeout = 0;
SET client_min_messages = warning;


-- ===== Tables =====

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  patient_id uuid NOT NULL,
  appointment_at timestamp with time zone NOT NULL,
  note text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  type text DEFAULT 'direct'::text NOT NULL,
  name text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid,
  sender_id uuid,
  content text,
  attachment_url text,
  read_by uuid[] DEFAULT '{}'::uuid[],
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.clinic_staff (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  title text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.conditions (
  id text NOT NULL,
  label text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exercise_conditions (
  exercise_id uuid NOT NULL,
  condition_id text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exercise_images (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  exercise_id uuid NOT NULL,
  url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  patient_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  completed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  title text NOT NULL,
  description text,
  bunny_video_id text,
  thumbnail_url text,
  muscle_group text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.form_fields (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  form_id uuid NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  type text NOT NULL,
  label text NOT NULL,
  required boolean DEFAULT false,
  options text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  form_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  patient_name text,
  answers jsonb DEFAULT '{}'::jsonb NOT NULL,
  submitted_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  pdf_url text,
  created_at timestamp with time zone DEFAULT now(),
  has_fields boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.patient_exercises (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  patient_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  sets integer,
  reps text,
  rest_sec integer,
  frequency text,
  notes text,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  programme_id uuid
);

CREATE TABLE IF NOT EXISTS public.patient_forms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  patient_id uuid NOT NULL,
  form_id uuid NOT NULL,
  category text NOT NULL,
  assigned_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_resources (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  patient_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  is_admin boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  note text,
  is_professional boolean DEFAULT false,
  allowed_sections jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.programme_sections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.programmes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  patient_id uuid NOT NULL,
  description text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  section_id uuid
);

CREATE TABLE IF NOT EXISTS public.referral_letters (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  patient_name text NOT NULL,
  recipient_id uuid,
  staff_id uuid,
  condition_label text,
  body text NOT NULL,
  recipient_name text,
  staff_name text,
  staff_title text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.referral_professionals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  title text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.resource_categories (
  id text NOT NULL,
  label text NOT NULL,
  icon text DEFAULT '📁'::text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  shows_programme boolean DEFAULT false NOT NULL,
  audience text DEFAULT 'patient'::text
);

CREATE TABLE IF NOT EXISTS public.resources (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  condition_tag text NOT NULL,
  bunny_video_id text,
  pdf_url text,
  thumbnail_url text,
  duration_sec integer,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  category text DEFAULT 'bibliotheque'::text NOT NULL,
  audience text DEFAULT 'patient'::text
);

-- ===== Contraintes =====
ALTER TABLE public.patient_resources ADD CONSTRAINT patient_resources_pkey PRIMARY KEY (id);
ALTER TABLE public.exercise_logs ADD CONSTRAINT exercise_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.exercises ADD CONSTRAINT exercises_pkey PRIMARY KEY (id);
ALTER TABLE public.exercise_images ADD CONSTRAINT exercise_images_pkey PRIMARY KEY (id);
ALTER TABLE public.referral_professionals ADD CONSTRAINT referral_professionals_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.conditions ADD CONSTRAINT conditions_pkey PRIMARY KEY (id);
ALTER TABLE public.form_submissions ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);
ALTER TABLE public.resource_categories ADD CONSTRAINT resource_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.forms ADD CONSTRAINT forms_pkey PRIMARY KEY (id);
ALTER TABLE public.clinic_staff ADD CONSTRAINT clinic_staff_pkey PRIMARY KEY (id);
ALTER TABLE public.referral_letters ADD CONSTRAINT referral_letters_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);
ALTER TABLE public.exercise_conditions ADD CONSTRAINT exercise_conditions_pkey PRIMARY KEY (exercise_id, condition_id);
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.programmes ADD CONSTRAINT programmes_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_participants ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (conversation_id, user_id);
ALTER TABLE public.programme_sections ADD CONSTRAINT programme_sections_pkey PRIMARY KEY (id);
ALTER TABLE public.patient_exercises ADD CONSTRAINT patient_exercises_pkey PRIMARY KEY (id);
ALTER TABLE public.appointments ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);
ALTER TABLE public.resources ADD CONSTRAINT resources_pkey PRIMARY KEY (id);
ALTER TABLE public.form_fields ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);
ALTER TABLE public.patient_forms ADD CONSTRAINT patient_forms_pkey PRIMARY KEY (id);
ALTER TABLE public.patient_forms ADD CONSTRAINT patient_forms_patient_id_form_id_key UNIQUE (patient_id, form_id);
ALTER TABLE public.patient_exercises ADD CONSTRAINT patient_exercises_patient_exercise_programme_key UNIQUE (patient_id, exercise_id, programme_id);
ALTER TABLE public.patient_resources ADD CONSTRAINT patient_resources_patient_id_resource_id_key UNIQUE (patient_id, resource_id);
ALTER TABLE public.resources ADD CONSTRAINT resources_condition_tag_check CHECK ((condition_tag = ANY (ARRAY['trousse_depart'::text, 'hernie_discale'::text, 'sciatique'::text, 'radiculopathie'::text, 'stenose_foraminale'::text, 'stenose_spinale'::text, 'arthrose_cervicale'::text, 'arthrose_lombaire'::text, 'spondylolyse'::text, 'spondylolisthesis'::text, 'autre'::text])));
ALTER TABLE public.resources ADD CONSTRAINT video_requires_bunny_id CHECK (((type <> 'video'::text) OR (bunny_video_id IS NOT NULL)));
ALTER TABLE public.resources ADD CONSTRAINT resources_type_check CHECK ((type = ANY (ARRAY['video'::text, 'pdf'::text])));
ALTER TABLE public.resources ADD CONSTRAINT pdf_requires_url CHECK (((type <> 'pdf'::text) OR (pdf_url IS NOT NULL)));
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id);
ALTER TABLE public.patient_resources ADD CONSTRAINT patient_resources_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.patient_resources ADD CONSTRAINT patient_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.exercise_logs ADD CONSTRAINT exercise_logs_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE public.exercise_logs ADD CONSTRAINT exercise_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.patient_exercises ADD CONSTRAINT patient_exercises_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.patient_exercises ADD CONSTRAINT patient_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE public.patient_exercises ADD CONSTRAINT patient_exercises_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.patient_exercises ADD CONSTRAINT patient_exercises_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.form_fields ADD CONSTRAINT form_fields_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE public.exercise_conditions ADD CONSTRAINT exercise_conditions_condition_id_fkey FOREIGN KEY (condition_id) REFERENCES conditions(id) ON DELETE CASCADE;
ALTER TABLE public.exercise_conditions ADD CONSTRAINT exercise_conditions_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.programmes ADD CONSTRAINT programmes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_section_id_fkey FOREIGN KEY (section_id) REFERENCES programme_sections(id) ON DELETE SET NULL;
ALTER TABLE public.exercise_images ADD CONSTRAINT exercise_images_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE public.form_submissions ADD CONSTRAINT form_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE public.form_submissions ADD CONSTRAINT form_submissions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chat_participants ADD CONSTRAINT chat_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.chat_participants ADD CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.patient_forms ADD CONSTRAINT patient_forms_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE public.patient_forms ADD CONSTRAINT patient_forms_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.referral_letters ADD CONSTRAINT referral_letters_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES referral_professionals(id) ON DELETE SET NULL;
ALTER TABLE public.referral_letters ADD CONSTRAINT referral_letters_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES clinic_staff(id) ON DELETE SET NULL;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.patient_resources ADD CONSTRAINT patient_resources_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ===== Index =====
CREATE INDEX idx_resources_category ON public.resources USING btree (category);
CREATE INDEX idx_exercise_logs_patient ON public.exercise_logs USING btree (patient_id);
CREATE INDEX idx_resources_condition_tag ON public.resources USING btree (condition_tag);
CREATE INDEX idx_patient_resources_patient_id ON public.patient_resources USING btree (patient_id);
CREATE INDEX idx_patient_resources_resource_id ON public.patient_resources USING btree (resource_id);
CREATE INDEX idx_resources_type ON public.resources USING btree (type);
CREATE INDEX idx_patient_exercises_patient ON public.patient_exercises USING btree (patient_id);
CREATE INDEX idx_exercise_logs_date ON public.exercise_logs USING btree (patient_id, exercise_id, completed_at);

-- ===== Fonctions =====
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (
    NEW.id,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$function$
;
CREATE OR REPLACE FUNCTION public.is_chat_participant(conv_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$function$
;
CREATE OR REPLACE FUNCTION public.ensure_general_conversation()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE gid uuid;
BEGIN
  SELECT id INTO gid FROM chat_conversations WHERE type='group' AND name='général' LIMIT 1;
  IF gid IS NULL THEN
    INSERT INTO chat_conversations(type,name) VALUES('group','général') RETURNING id INTO gid;
    INSERT INTO chat_participants(conversation_id,user_id)
      SELECT gid, id FROM profiles WHERE is_admin=true OR is_professional=true;
  ELSE
    INSERT INTO chat_participants(conversation_id,user_id)
      SELECT gid, auth.uid()
      WHERE NOT EXISTS (SELECT 1 FROM chat_participants WHERE conversation_id=gid AND user_id=auth.uid());
  END IF;
  RETURN gid;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.start_direct_conversation(other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE existing_id uuid; new_id uuid;
BEGIN
  SELECT c.id INTO existing_id
  FROM chat_conversations c
  JOIN chat_participants p1 ON p1.conversation_id=c.id AND p1.user_id=auth.uid()
  JOIN chat_participants p2 ON p2.conversation_id=c.id AND p2.user_id=other_user_id
  WHERE c.type='direct' LIMIT 1;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
  INSERT INTO chat_conversations(type) VALUES('direct') RETURNING id INTO new_id;
  INSERT INTO chat_participants(conversation_id,user_id)
    VALUES (new_id, auth.uid()), (new_id, other_user_id);
  RETURN new_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.chat_staff_profiles()
 RETURNS TABLE(id uuid, full_name text, email text, is_admin boolean, is_professional boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, full_name, email, is_admin, is_professional
  FROM profiles WHERE is_admin = true OR is_professional = true;
$function$
;
CREATE OR REPLACE FUNCTION public.create_group_conversation(group_name text, member_ids uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id uuid; uid uuid;
BEGIN
  INSERT INTO chat_conversations(type, name) VALUES('group', group_name) RETURNING id INTO new_id;
  INSERT INTO chat_participants(conversation_id, user_id) VALUES(new_id, auth.uid()) ON CONFLICT DO NOTHING;
  FOREACH uid IN ARRAY member_ids LOOP
    IF uid <> auth.uid() THEN
      INSERT INTO chat_participants(conversation_id, user_id) VALUES(new_id, uid) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN new_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.rename_conversation(conv_id uuid, new_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chat_participants WHERE conversation_id = conv_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;
  UPDATE chat_conversations SET name = new_name WHERE id = conv_id AND type = 'group';
END;
$function$
;

-- ===== Triggers =====
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===== RLS =====
ALTER TABLE public.patient_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ===== Policies =====
CREATE POLICY "profiles_select_own" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (((id = auth.uid()) OR is_admin()));
CREATE POLICY "patient_exercises_update_admin" ON public.patient_exercises AS PERMISSIVE FOR UPDATE TO public USING (is_admin());
CREATE POLICY "patient_exercises_delete_admin" ON public.patient_exercises AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "logs_select" ON public.exercise_logs AS PERMISSIVE FOR SELECT TO public USING (((patient_id = auth.uid()) OR is_admin()));
CREATE POLICY "logs_insert" ON public.exercise_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((patient_id = auth.uid()));
CREATE POLICY "logs_delete" ON public.exercise_logs AS PERMISSIVE FOR DELETE TO public USING (((patient_id = auth.uid()) OR is_admin()));
CREATE POLICY "rl_insert_admin" ON public.referral_letters AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "rl_delete_admin" ON public.referral_letters AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "appt_read_admin" ON public.appointments AS PERMISSIVE FOR SELECT TO public USING (is_admin());
CREATE POLICY "appt_insert_admin" ON public.appointments AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "appt_delete_admin" ON public.appointments AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "appt_read_patient" ON public.appointments AS PERMISSIVE FOR SELECT TO public USING ((patient_id = auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND (is_admin = ( SELECT profiles_1.is_admin
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid())))));
CREATE POLICY "profiles_insert_admin" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "profiles_delete_admin" ON public.profiles AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "resources_select" ON public.resources AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR (EXISTS ( SELECT 1
   FROM patient_resources pr
  WHERE ((pr.resource_id = resources.id) AND (pr.patient_id = auth.uid()))))));
CREATE POLICY "resources_insert_admin" ON public.resources AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "resources_update_admin" ON public.resources AS PERMISSIVE FOR UPDATE TO public USING (is_admin());
CREATE POLICY "resources_delete_admin" ON public.resources AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "patient_resources_select" ON public.patient_resources AS PERMISSIVE FOR SELECT TO public USING (((patient_id = auth.uid()) OR is_admin()));
CREATE POLICY "patient_resources_insert_admin" ON public.patient_resources AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "patient_resources_delete_admin" ON public.patient_resources AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "exercises_select" ON public.exercises AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "exercises_insert_admin" ON public.exercises AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "exercises_update_admin" ON public.exercises AS PERMISSIVE FOR UPDATE TO public USING (is_admin());
CREATE POLICY "exercises_delete_admin" ON public.exercises AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "patient_exercises_select" ON public.patient_exercises AS PERMISSIVE FOR SELECT TO public USING (((patient_id = auth.uid()) OR is_admin()));
CREATE POLICY "patient_exercises_insert_admin" ON public.patient_exercises AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON public.exercise_images AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Patients lisent" ON public.exercise_images AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin peut insérer" ON public.programmes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Admin et patient peuvent lire" ON public.programmes AS PERMISSIVE FOR SELECT TO authenticated USING (((patient_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))));
CREATE POLICY "Admin peut modifier" ON public.programmes AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Admin peut supprimer" ON public.programmes AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "cat_select" ON public.resource_categories AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "cat_insert_admin" ON public.resource_categories AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "cat_update_admin" ON public.resource_categories AS PERMISSIVE FOR UPDATE TO public USING (is_admin());
CREATE POLICY "cat_delete_admin" ON public.resource_categories AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "psec_select" ON public.programme_sections AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "psec_insert_admin" ON public.programme_sections AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "psec_update_admin" ON public.programme_sections AS PERMISSIVE FOR UPDATE TO public USING (is_admin());
CREATE POLICY "psec_delete_admin" ON public.programme_sections AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "cond_select" ON public.conditions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "cond_insert_admin" ON public.conditions AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "cond_update_admin" ON public.conditions AS PERMISSIVE FOR UPDATE TO public USING (is_admin());
CREATE POLICY "cond_delete_admin" ON public.conditions AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "ec_select" ON public.exercise_conditions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "ec_insert_admin" ON public.exercise_conditions AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "ec_delete_admin" ON public.exercise_conditions AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "rp_select" ON public.referral_professionals AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "rp_insert_admin" ON public.referral_professionals AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "rp_delete_admin" ON public.referral_professionals AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "Admins gèrent les formulaires" ON public.forms AS PERMISSIVE FOR ALL TO public USING (( SELECT profiles.is_admin
   FROM profiles
  WHERE (profiles.id = auth.uid())));
CREATE POLICY "Lecture formulaires pour authentifiés" ON public.forms AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gèrent patient_forms" ON public.patient_forms AS PERMISSIVE FOR ALL TO public USING (( SELECT profiles.is_admin
   FROM profiles
  WHERE (profiles.id = auth.uid())));
CREATE POLICY "Patients lisent leurs formulaires" ON public.patient_forms AS PERMISSIVE FOR SELECT TO public USING ((patient_id = auth.uid()));
CREATE POLICY "Admins gèrent form_fields" ON public.form_fields AS PERMISSIVE FOR ALL TO public USING (( SELECT profiles.is_admin
   FROM profiles
  WHERE (profiles.id = auth.uid())));
CREATE POLICY "Lecture form_fields pour authentifiés" ON public.form_fields AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins lisent toutes les soumissions" ON public.form_submissions AS PERMISSIVE FOR ALL TO public USING (( SELECT profiles.is_admin
   FROM profiles
  WHERE (profiles.id = auth.uid())));
CREATE POLICY "Patients soumettent" ON public.form_submissions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((patient_id = auth.uid()));
CREATE POLICY "Admins peuvent modifier tous les profils" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.is_admin = true)))));
CREATE POLICY "cs_select" ON public.clinic_staff AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "cs_insert_admin" ON public.clinic_staff AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY "cs_update_admin" ON public.clinic_staff AS PERMISSIVE FOR UPDATE TO public USING (is_admin());
CREATE POLICY "cs_delete_admin" ON public.clinic_staff AS PERMISSIVE FOR DELETE TO public USING (is_admin());
CREATE POLICY "rl_select_admin" ON public.referral_letters AS PERMISSIVE FOR SELECT TO public USING (is_admin());
CREATE POLICY "conv_participant" ON public.chat_conversations AS PERMISSIVE FOR ALL TO public USING ((id IN ( SELECT chat_participants.conversation_id
   FROM chat_participants
  WHERE (chat_participants.user_id = auth.uid()))));
CREATE POLICY "parts_own" ON public.chat_participants AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid()));
CREATE POLICY "msgs_participant" ON public.chat_messages AS PERMISSIVE FOR ALL TO public USING ((conversation_id IN ( SELECT chat_participants.conversation_id
   FROM chat_participants
  WHERE (chat_participants.user_id = auth.uid()))));
CREATE POLICY "conv_select" ON public.chat_conversations AS PERMISSIVE FOR SELECT TO public USING (is_chat_participant(id));
CREATE POLICY "conv_insert" ON public.chat_conversations AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "parts_select" ON public.chat_participants AS PERMISSIVE FOR SELECT TO public USING (is_chat_participant(conversation_id));
CREATE POLICY "parts_insert" ON public.chat_participants AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "msgs_select" ON public.chat_messages AS PERMISSIVE FOR SELECT TO public USING (is_chat_participant(conversation_id));
CREATE POLICY "msgs_insert" ON public.chat_messages AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_chat_participant(conversation_id));
CREATE POLICY "msgs_update" ON public.chat_messages AS PERMISSIVE FOR UPDATE TO public USING (is_chat_participant(conversation_id));

-- ===== Grants (API Data) =====
GRANT TRIGGER, TRUNCATE, DELETE, UPDATE, SELECT, INSERT, REFERENCES ON public.appointments TO anon;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.appointments TO authenticated;
GRANT UPDATE, INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, SELECT ON public.appointments TO service_role;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.chat_conversations TO anon;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.chat_conversations TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.chat_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.chat_messages TO anon;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.chat_messages TO authenticated;
GRANT SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, INSERT ON public.chat_messages TO service_role;
GRANT REFERENCES, INSERT, TRIGGER, SELECT, UPDATE, DELETE, TRUNCATE ON public.chat_participants TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.chat_participants TO authenticated;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.chat_participants TO service_role;
GRANT TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON public.clinic_staff TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.clinic_staff TO authenticated;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.clinic_staff TO service_role;
GRANT TRIGGER, TRUNCATE, DELETE, UPDATE, SELECT, INSERT, REFERENCES ON public.conditions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.conditions TO authenticated;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.conditions TO service_role;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.exercise_conditions TO anon;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.exercise_conditions TO authenticated;
GRANT SELECT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON public.exercise_conditions TO service_role;
GRANT TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON public.exercise_images TO anon;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.exercise_images TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exercise_images TO service_role;
GRANT TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON public.exercise_logs TO anon;
GRANT TRUNCATE, INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.exercise_logs TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exercise_logs TO service_role;
GRANT UPDATE, REFERENCES, TRUNCATE, DELETE, TRIGGER, SELECT, INSERT ON public.exercises TO anon;
GRANT TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON public.exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exercises TO service_role;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.form_fields TO anon;
GRANT REFERENCES, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.form_fields TO authenticated;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.form_fields TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.form_submissions TO anon;
GRANT REFERENCES, TRUNCATE, DELETE, TRIGGER, UPDATE, SELECT, INSERT ON public.form_submissions TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.form_submissions TO service_role;
GRANT REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT, TRIGGER ON public.forms TO anon;
GRANT TRIGGER, INSERT, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.forms TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT, INSERT ON public.forms TO service_role;
GRANT REFERENCES, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.patient_exercises TO anon;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.patient_exercises TO authenticated;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.patient_exercises TO service_role;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.patient_forms TO anon;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.patient_forms TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.patient_forms TO service_role;
GRANT UPDATE, TRIGGER, REFERENCES, TRUNCATE, DELETE, SELECT, INSERT ON public.patient_resources TO anon;
GRANT TRIGGER, INSERT, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.patient_resources TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.patient_resources TO service_role;
GRANT SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, INSERT ON public.profiles TO anon;
GRANT DELETE, SELECT, TRUNCATE, REFERENCES, TRIGGER, UPDATE, INSERT ON public.profiles TO authenticated;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.profiles TO service_role;
GRANT INSERT, TRIGGER, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.programme_sections TO anon;
GRANT SELECT, INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE ON public.programme_sections TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.programme_sections TO service_role;
GRANT TRUNCATE, TRIGGER, INSERT, SELECT, UPDATE, DELETE, REFERENCES ON public.programmes TO anon;
GRANT TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON public.programmes TO authenticated;
GRANT REFERENCES, TRIGGER, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON public.programmes TO service_role;
GRANT SELECT, INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE ON public.referral_letters TO anon;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.referral_letters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.referral_letters TO service_role;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.referral_professionals TO anon;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.referral_professionals TO authenticated;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.referral_professionals TO service_role;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.resource_categories TO anon;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.resource_categories TO authenticated;
GRANT SELECT, INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE ON public.resource_categories TO service_role;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.resources TO anon;
GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON public.resources TO authenticated;
GRANT SELECT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON public.resources TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
