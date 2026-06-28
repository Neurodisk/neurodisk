-- ============================================================
-- 026 — Objectifs récurrents (habitudes)
--   Un objectif peut être récurrent : recur_interval_days = N
--   (1 = chaque jour, 2 = aux 2 jours, 7 = chaque semaine…).
--   NULL = objectif ponctuel (comportement actuel « atteint »).
--   Chaque réalisation est enregistrée par jour dans
--   objective_completions → série / historique côté patient.
-- ============================================================

ALTER TABLE public.patient_objectives
  ADD COLUMN IF NOT EXISTS recur_interval_days int;

-- Réalisations (une ligne par jour fait)
CREATE TABLE IF NOT EXISTS public.objective_completions (
  objective_id uuid NOT NULL REFERENCES public.patient_objectives(id) ON DELETE CASCADE,
  patient_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_on date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (objective_id, completed_on)
);

CREATE INDEX IF NOT EXISTS idx_obj_completions_patient ON public.objective_completions(patient_id);

ALTER TABLE public.objective_completions ENABLE ROW LEVEL SECURITY;

-- Lecture : le patient voit les siennes ; admin / pro autorisé voient tout
CREATE POLICY "oc_select" ON public.objective_completions
  FOR SELECT TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('objectifs'));

-- Le patient coche/décoche pour lui-même ; clinicien pour tout
CREATE POLICY "oc_insert" ON public.objective_completions
  FOR INSERT TO public
  WITH CHECK (patient_id = auth.uid() OR is_admin() OR public.has_section('objectifs'));
CREATE POLICY "oc_delete" ON public.objective_completions
  FOR DELETE TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('objectifs'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.objective_completions TO authenticated, anon, service_role;
