-- ============================================================
-- 020 — Lecture d'adhérence pour le clinicien
--   Le tableau de bord d'adhérence a besoin de lire l'activité
--   (exercise_logs) et les exercices assignés (patient_exercises)
--   de TOUS ses patients. Avant, le SELECT était limité au patient
--   lui-même ou à l'admin. On étend aux pros ayant la permission
--   'programme'. (Idempotent.)
-- ============================================================

DROP POLICY IF EXISTS "logs_select" ON public.exercise_logs;
CREATE POLICY "logs_select" ON public.exercise_logs
  FOR SELECT TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('programme'));

DROP POLICY IF EXISTS "patient_exercises_select" ON public.patient_exercises;
CREATE POLICY "patient_exercises_select" ON public.patient_exercises
  FOR SELECT TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('programme'));
