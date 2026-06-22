-- ============================================================
-- 021 — Champs cliniques pour le rapport patient auto-rempli
--   Stocke par patient : date des radiographies, constat cervical,
--   constat lombaire, plan choisi. Servent à générer le rapport Word
--   pré-rempli (nom tiré de profiles.full_name).
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rx_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cervical_finding text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lumbar_finding text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type text
  CHECK (plan_type IS NULL OR plan_type = ANY (ARRAY['annuel','combo']));
