-- ============================================================
-- 004 — Grands titres réutilisables pour regrouper les programmes
-- ============================================================
-- Un « grand titre » (programme_sections) regroupe plusieurs
-- programmes chez le patient. Réutilisable d'un patient à l'autre.
-- Hiérarchie patient : Grand titre → Programmes → Exercices.

CREATE TABLE IF NOT EXISTS public.programme_sections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.programme_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "psec_select"       ON public.programme_sections;
DROP POLICY IF EXISTS "psec_insert_admin" ON public.programme_sections;
DROP POLICY IF EXISTS "psec_update_admin" ON public.programme_sections;
DROP POLICY IF EXISTS "psec_delete_admin" ON public.programme_sections;

CREATE POLICY "psec_select"       ON public.programme_sections FOR SELECT USING (true);
CREATE POLICY "psec_insert_admin" ON public.programme_sections FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "psec_update_admin" ON public.programme_sections FOR UPDATE USING (public.is_admin());
CREATE POLICY "psec_delete_admin" ON public.programme_sections FOR DELETE USING (public.is_admin());

GRANT SELECT ON public.programme_sections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.programme_sections TO authenticated;

-- Lien programme → grand titre (optionnel ; SET NULL si le titre est supprimé)
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS section_id UUID
  REFERENCES public.programme_sections(id) ON DELETE SET NULL;
