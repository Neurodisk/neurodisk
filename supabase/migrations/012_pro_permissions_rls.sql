-- ============================================================
-- 012 — Faire respecter allowed_sections (permissions pros) sur
--       TOUTES les tables de gestion, pas seulement resources.
--
--   Même bug que 011 partout : les politiques RLS ne regardaient
--   que is_admin(), donc un professionnel autorisé ne pouvait rien
--   faire (assignations, programmes, formulaires, rappels, lettres,
--   catégories, patients). On applique allowed_sections côté base.
--
--   Mapping data-perm (allowed_sections) :
--     patients          → gérer/lister les patients (profiles)
--     resources_patient → ressources patient   (déjà fait en 011)
--     resources_pro     → ressources pro        (déjà fait en 011)
--     assignments       → assigner ressources patient (patient_resources)
--     pro_assignments   → assigner ressources pro      (patient_resources)
--     programme         → programmes / exercices
--     categories_patient→ catégories patient (resource_categories)
--     categories_pro    → catégories pro      (resource_categories)
--     schedule          → rappels (appointments)
--     referral          → lettres de référence + référents + signataires
--     forms             → formulaires
-- ============================================================

-- has_section() est déjà créé en 011 ; on le redéclare pour que
-- cette migration soit autonome (idempotent).
CREATE OR REPLACE FUNCTION public.has_section(perm text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT (allowed_sections ->> perm)::boolean
    FROM public.profiles
    WHERE id = auth.uid() AND is_professional = true
  ), false);
$$;

-- can_manage_categories() : par audience, comme can_manage_resources()
CREATE OR REPLACE FUNCTION public.can_manage_categories(aud text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin()
      OR public.has_section('categories_' || CASE WHEN aud = 'professional' THEN 'pro' ELSE 'patient' END);
$$;

-- ════════════════════════════════════════════════════════════
-- ASSIGNATIONS — patient_resources
--   (onglet Assignation patient ET pro)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "patient_resources_select"       ON public.patient_resources;
DROP POLICY IF EXISTS "patient_resources_insert_admin" ON public.patient_resources;
DROP POLICY IF EXISTS "patient_resources_delete_admin" ON public.patient_resources;

CREATE POLICY "patient_resources_select" ON public.patient_resources
  FOR SELECT TO public
  USING (
    patient_id = auth.uid()
    OR is_admin()
    OR public.has_section('assignments')
    OR public.has_section('pro_assignments')
  );
CREATE POLICY "patient_resources_insert" ON public.patient_resources
  FOR INSERT TO public
  WITH CHECK (is_admin() OR public.has_section('assignments') OR public.has_section('pro_assignments'));
CREATE POLICY "patient_resources_delete" ON public.patient_resources
  FOR DELETE TO public
  USING (is_admin() OR public.has_section('assignments') OR public.has_section('pro_assignments'));

-- ════════════════════════════════════════════════════════════
-- CATÉGORIES — resource_categories  (categories_patient / _pro)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cat_insert_admin" ON public.resource_categories;
DROP POLICY IF EXISTS "cat_update_admin" ON public.resource_categories;
DROP POLICY IF EXISTS "cat_delete_admin" ON public.resource_categories;

CREATE POLICY "cat_insert" ON public.resource_categories
  FOR INSERT TO public WITH CHECK (public.can_manage_categories(audience));
CREATE POLICY "cat_update" ON public.resource_categories
  FOR UPDATE TO public USING (public.can_manage_categories(audience))
                       WITH CHECK (public.can_manage_categories(audience));
CREATE POLICY "cat_delete" ON public.resource_categories
  FOR DELETE TO public USING (public.can_manage_categories(audience));

-- ════════════════════════════════════════════════════════════
-- PROGRAMME — programmes, patient_exercises, exercises,
--             programme_sections, exercise_conditions
-- ════════════════════════════════════════════════════════════
-- programmes
DROP POLICY IF EXISTS "Admin peut insérer"            ON public.programmes;
DROP POLICY IF EXISTS "Admin et patient peuvent lire" ON public.programmes;
DROP POLICY IF EXISTS "Admin peut modifier"           ON public.programmes;
DROP POLICY IF EXISTS "Admin peut supprimer"          ON public.programmes;

CREATE POLICY "programmes_select" ON public.programmes
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('programme'));
CREATE POLICY "programmes_insert" ON public.programmes
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR public.has_section('programme'));
CREATE POLICY "programmes_update" ON public.programmes
  FOR UPDATE TO authenticated USING (is_admin() OR public.has_section('programme'))
                              WITH CHECK (is_admin() OR public.has_section('programme'));
CREATE POLICY "programmes_delete" ON public.programmes
  FOR DELETE TO authenticated USING (is_admin() OR public.has_section('programme'));

-- patient_exercises
DROP POLICY IF EXISTS "patient_exercises_insert_admin" ON public.patient_exercises;
DROP POLICY IF EXISTS "patient_exercises_update_admin" ON public.patient_exercises;
DROP POLICY IF EXISTS "patient_exercises_delete_admin" ON public.patient_exercises;

CREATE POLICY "patient_exercises_insert" ON public.patient_exercises
  FOR INSERT TO public WITH CHECK (is_admin() OR public.has_section('programme'));
CREATE POLICY "patient_exercises_update" ON public.patient_exercises
  FOR UPDATE TO public USING (is_admin() OR public.has_section('programme'));
CREATE POLICY "patient_exercises_delete" ON public.patient_exercises
  FOR DELETE TO public USING (is_admin() OR public.has_section('programme'));

-- exercises (bibliothèque d'exercices)
DROP POLICY IF EXISTS "exercises_insert_admin" ON public.exercises;
DROP POLICY IF EXISTS "exercises_update_admin" ON public.exercises;
DROP POLICY IF EXISTS "exercises_delete_admin" ON public.exercises;

CREATE POLICY "exercises_insert" ON public.exercises
  FOR INSERT TO public WITH CHECK (is_admin() OR public.has_section('programme'));
CREATE POLICY "exercises_update" ON public.exercises
  FOR UPDATE TO public USING (is_admin() OR public.has_section('programme'));
CREATE POLICY "exercises_delete" ON public.exercises
  FOR DELETE TO public USING (is_admin() OR public.has_section('programme'));

-- exercise_images (FOR ALL pour admin → étendre aux pros programme)
DROP POLICY IF EXISTS "Admin full access" ON public.exercise_images;
CREATE POLICY "exercise_images_manage" ON public.exercise_images
  FOR ALL TO authenticated
  USING (is_admin() OR public.has_section('programme'))
  WITH CHECK (is_admin() OR public.has_section('programme'));

-- programme_sections (grands titres)
DROP POLICY IF EXISTS "psec_insert_admin" ON public.programme_sections;
DROP POLICY IF EXISTS "psec_update_admin" ON public.programme_sections;
DROP POLICY IF EXISTS "psec_delete_admin" ON public.programme_sections;

CREATE POLICY "psec_insert" ON public.programme_sections
  FOR INSERT TO public WITH CHECK (is_admin() OR public.has_section('programme'));
CREATE POLICY "psec_update" ON public.programme_sections
  FOR UPDATE TO public USING (is_admin() OR public.has_section('programme'));
CREATE POLICY "psec_delete" ON public.programme_sections
  FOR DELETE TO public USING (is_admin() OR public.has_section('programme'));

-- exercise_conditions (tags condition ↔ exercice)
DROP POLICY IF EXISTS "ec_insert_admin" ON public.exercise_conditions;
DROP POLICY IF EXISTS "ec_delete_admin" ON public.exercise_conditions;

CREATE POLICY "ec_insert" ON public.exercise_conditions
  FOR INSERT TO public WITH CHECK (is_admin() OR public.has_section('programme'));
CREATE POLICY "ec_delete" ON public.exercise_conditions
  FOR DELETE TO public USING (is_admin() OR public.has_section('programme'));

-- ════════════════════════════════════════════════════════════
-- RAPPELS — appointments  (schedule)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "appt_read_admin"   ON public.appointments;
DROP POLICY IF EXISTS "appt_insert_admin" ON public.appointments;
DROP POLICY IF EXISTS "appt_delete_admin" ON public.appointments;

CREATE POLICY "appt_read_staff" ON public.appointments
  FOR SELECT TO public USING (is_admin() OR public.has_section('schedule'));
CREATE POLICY "appt_insert_staff" ON public.appointments
  FOR INSERT TO public WITH CHECK (is_admin() OR public.has_section('schedule'));
CREATE POLICY "appt_delete_staff" ON public.appointments
  FOR DELETE TO public USING (is_admin() OR public.has_section('schedule'));

-- ════════════════════════════════════════════════════════════
-- LETTRES DE RÉFÉRENCE — referral_letters, referral_professionals,
--                        clinic_staff  (referral)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "rl_insert_admin" ON public.referral_letters;
DROP POLICY IF EXISTS "rl_delete_admin" ON public.referral_letters;
DROP POLICY IF EXISTS "rl_select_admin" ON public.referral_letters;

CREATE POLICY "rl_select" ON public.referral_letters
  FOR SELECT TO public USING (is_admin() OR public.has_section('referral'));
CREATE POLICY "rl_insert" ON public.referral_letters
  FOR INSERT TO public WITH CHECK (is_admin() OR public.has_section('referral'));
CREATE POLICY "rl_delete" ON public.referral_letters
  FOR DELETE TO public USING (is_admin() OR public.has_section('referral'));

DROP POLICY IF EXISTS "rp_insert_admin" ON public.referral_professionals;
DROP POLICY IF EXISTS "rp_delete_admin" ON public.referral_professionals;
CREATE POLICY "rp_insert" ON public.referral_professionals
  FOR INSERT TO public WITH CHECK (is_admin() OR public.has_section('referral'));
CREATE POLICY "rp_delete" ON public.referral_professionals
  FOR DELETE TO public USING (is_admin() OR public.has_section('referral'));

DROP POLICY IF EXISTS "cs_insert_admin" ON public.clinic_staff;
DROP POLICY IF EXISTS "cs_update_admin" ON public.clinic_staff;
DROP POLICY IF EXISTS "cs_delete_admin" ON public.clinic_staff;
CREATE POLICY "cs_insert" ON public.clinic_staff
  FOR INSERT TO public WITH CHECK (is_admin() OR public.has_section('referral'));
CREATE POLICY "cs_update" ON public.clinic_staff
  FOR UPDATE TO public USING (is_admin() OR public.has_section('referral'));
CREATE POLICY "cs_delete" ON public.clinic_staff
  FOR DELETE TO public USING (is_admin() OR public.has_section('referral'));

-- ════════════════════════════════════════════════════════════
-- FORMULAIRES — forms, form_fields, patient_forms, form_submissions
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Admins gèrent les formulaires" ON public.forms;
CREATE POLICY "forms_manage" ON public.forms
  FOR ALL TO public
  USING (is_admin() OR public.has_section('forms'))
  WITH CHECK (is_admin() OR public.has_section('forms'));

DROP POLICY IF EXISTS "Admins gèrent form_fields" ON public.form_fields;
CREATE POLICY "form_fields_manage" ON public.form_fields
  FOR ALL TO public
  USING (is_admin() OR public.has_section('forms'))
  WITH CHECK (is_admin() OR public.has_section('forms'));

DROP POLICY IF EXISTS "Admins gèrent patient_forms" ON public.patient_forms;
CREATE POLICY "patient_forms_manage" ON public.patient_forms
  FOR ALL TO public
  USING (is_admin() OR public.has_section('forms'))
  WITH CHECK (is_admin() OR public.has_section('forms'));

DROP POLICY IF EXISTS "Admins lisent toutes les soumissions" ON public.form_submissions;
CREATE POLICY "form_submissions_staff" ON public.form_submissions
  FOR ALL TO public
  USING (is_admin() OR public.has_section('forms'))
  WITH CHECK (is_admin() OR public.has_section('forms'));

-- ════════════════════════════════════════════════════════════
-- PATIENTS — profiles  (patients)
--   Lecture : pro autorisé peut lister les patients.
--   Écriture : pro autorisé peut modifier un patient (ex. note),
--   MAIS jamais un compte admin/pro, et ne peut PAS élever de
--   privilège (is_admin / is_professional verrouillés à false).
--   Création/suppression de patient = edge function service_role
--   et delete_patient() (admin-only) → inchangé.
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO public
  USING (id = auth.uid() OR is_admin() OR public.has_section('patients'));

CREATE POLICY "profiles_update_staff" ON public.profiles
  FOR UPDATE TO public
  USING (
    is_admin()
    OR (public.has_section('patients')
        AND COALESCE(is_admin, false) = false
        AND COALESCE(is_professional, false) = false)
  )
  WITH CHECK (
    is_admin()
    OR (public.has_section('patients')
        AND COALESCE(is_admin, false) = false
        AND COALESCE(is_professional, false) = false)
  );
