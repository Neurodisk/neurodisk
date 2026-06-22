-- ============================================================
-- 019 — PROMs : questionnaires de résultats validés + suivi
--   Instruments : odi, ndi, nprs, psfs.
--   prom_assignments : ce que le patient doit remplir (PSFS garde
--   ses activités). prom_responses : chaque passation + score calculé.
--   Permission clinicien : has_section('proms').
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prom_assignments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument text NOT NULL CHECK (instrument = ANY (ARRAY['odi','ndi','nprs','psfs'])),
  activities jsonb DEFAULT '[]'::jsonb,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, instrument)
);

CREATE TABLE IF NOT EXISTS public.prom_responses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument text NOT NULL CHECK (instrument = ANY (ARRAY['odi','ndi','nprs','psfs'])),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric,
  score_max numeric,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prom_assignments_patient ON public.prom_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_prom_responses_patient   ON public.prom_responses(patient_id, instrument, completed_at);

ALTER TABLE public.prom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prom_responses   ENABLE ROW LEVEL SECURITY;

-- Assignations : le patient voit les siennes ; le clinicien gère.
CREATE POLICY "proma_select" ON public.prom_assignments
  FOR SELECT TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('proms'));
CREATE POLICY "proma_write" ON public.prom_assignments
  FOR ALL TO public
  USING (is_admin() OR public.has_section('proms'))
  WITH CHECK (is_admin() OR public.has_section('proms'));

-- Réponses : le patient voit/soumet les siennes ; le clinicien voit tout.
CREATE POLICY "promr_select" ON public.prom_responses
  FOR SELECT TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('proms'));
CREATE POLICY "promr_insert" ON public.prom_responses
  FOR INSERT TO public
  WITH CHECK (patient_id = auth.uid() OR is_admin() OR public.has_section('proms'));
CREATE POLICY "promr_delete" ON public.prom_responses
  FOR DELETE TO public
  USING (is_admin() OR public.has_section('proms'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prom_assignments TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prom_responses   TO authenticated, anon, service_role;
