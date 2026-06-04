-- ============================================================
-- NEURODISK — Module Programme d'exercices
-- ============================================================
-- Exécuter APRÈS schema.sql dans Supabase Studio
-- SQL Editor → New query → Coller → Run
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

-- Bibliothèque d'exercices (créés par l'admin)
CREATE TABLE IF NOT EXISTS public.exercises (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT        NOT NULL,
  description     TEXT,
  bunny_video_id  TEXT,
  thumbnail_url   TEXT,
  muscle_group    TEXT,       -- ex: 'Lombaires', 'Core', 'Hanches', 'Épaules'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prescriptions : exercice assigné à un patient avec paramètres
CREATE TABLE IF NOT EXISTS public.patient_exercises (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id  UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  exercise_id UUID        NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets        INTEGER,                  -- nombre de séries
  reps        TEXT,                     -- ex: '12' ou '10-15'
  rest_sec    INTEGER,                  -- repos en secondes
  frequency   TEXT,                     -- ex: '3× par semaine'
  notes       TEXT,                     -- note du professionnel
  assigned_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  UNIQUE(patient_id, exercise_id)
);

-- Journal des complétions (une ligne par séance complétée)
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id  UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  exercise_id UUID        NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.exercises       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs   ENABLE ROW LEVEL SECURITY;

-- ---- EXERCISES ----------------------------------------------
DROP POLICY IF EXISTS "exercises_select"       ON public.exercises;
DROP POLICY IF EXISTS "exercises_insert_admin" ON public.exercises;
DROP POLICY IF EXISTS "exercises_update_admin" ON public.exercises;
DROP POLICY IF EXISTS "exercises_delete_admin" ON public.exercises;

-- Tous les utilisateurs authentifiés voient la bibliothèque
CREATE POLICY "exercises_select"
  ON public.exercises FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "exercises_insert_admin"
  ON public.exercises FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "exercises_update_admin"
  ON public.exercises FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "exercises_delete_admin"
  ON public.exercises FOR DELETE
  USING (public.is_admin());


-- ---- PATIENT_EXERCISES ---------------------------------------
DROP POLICY IF EXISTS "patient_exercises_select"       ON public.patient_exercises;
DROP POLICY IF EXISTS "patient_exercises_insert_admin" ON public.patient_exercises;
DROP POLICY IF EXISTS "patient_exercises_update_admin" ON public.patient_exercises;
DROP POLICY IF EXISTS "patient_exercises_delete_admin" ON public.patient_exercises;

CREATE POLICY "patient_exercises_select"
  ON public.patient_exercises FOR SELECT
  USING (patient_id = auth.uid() OR public.is_admin());

CREATE POLICY "patient_exercises_insert_admin"
  ON public.patient_exercises FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "patient_exercises_update_admin"
  ON public.patient_exercises FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "patient_exercises_delete_admin"
  ON public.patient_exercises FOR DELETE
  USING (public.is_admin());


-- ---- EXERCISE_LOGS ------------------------------------------
DROP POLICY IF EXISTS "logs_select"  ON public.exercise_logs;
DROP POLICY IF EXISTS "logs_insert"  ON public.exercise_logs;
DROP POLICY IF EXISTS "logs_delete"  ON public.exercise_logs;

-- Patient voit ses propres logs, admin voit tout
CREATE POLICY "logs_select"
  ON public.exercise_logs FOR SELECT
  USING (patient_id = auth.uid() OR public.is_admin());

-- Patient peut logger ses propres complétions uniquement
CREATE POLICY "logs_insert"
  ON public.exercise_logs FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- Patient peut supprimer ses propres logs (dé-cocher)
CREATE POLICY "logs_delete"
  ON public.exercise_logs FOR DELETE
  USING (patient_id = auth.uid() OR public.is_admin());


-- ============================================================
-- 3. INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patient_exercises_patient
  ON public.patient_exercises(patient_id);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_patient
  ON public.exercise_logs(patient_id);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_date
  ON public.exercise_logs(patient_id, exercise_id, completed_at);


-- ============================================================
-- 4. GRANTS
-- ============================================================
GRANT SELECT                    ON public.exercises         TO authenticated;
GRANT SELECT, INSERT, DELETE    ON public.exercise_logs     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_exercises TO authenticated;
GRANT INSERT, UPDATE, DELETE    ON public.exercises         TO authenticated;
