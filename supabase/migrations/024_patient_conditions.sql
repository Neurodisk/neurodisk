-- ============================================================
-- 024 — Conditions structurées par patient
--   Stocke la ou les conditions du patient (diagnostic). Permet
--   l'auto-assignation des ressources/fiches de sa condition et de
--   pré-cocher les conditions dans le générateur de programme.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patient_conditions (
  patient_id   uuid NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  condition_id text NOT NULL REFERENCES public.conditions(id) ON DELETE CASCADE,
  PRIMARY KEY (patient_id, condition_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_conditions_patient ON public.patient_conditions(patient_id);

ALTER TABLE public.patient_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pc_select" ON public.patient_conditions
  FOR SELECT TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('patients'));
CREATE POLICY "pc_write" ON public.patient_conditions
  FOR ALL TO public
  USING (is_admin() OR public.has_section('patients'))
  WITH CHECK (is_admin() OR public.has_section('patients'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_conditions TO authenticated, anon, service_role;
