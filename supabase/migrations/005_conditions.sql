-- ============================================================
-- 005 — Table des conditions (accès patient) gérables par l'admin
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conditions (
  id          TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cond_select"       ON public.conditions;
DROP POLICY IF EXISTS "cond_insert_admin" ON public.conditions;
DROP POLICY IF EXISTS "cond_update_admin" ON public.conditions;
DROP POLICY IF EXISTS "cond_delete_admin" ON public.conditions;

CREATE POLICY "cond_select"       ON public.conditions FOR SELECT USING (true);
CREATE POLICY "cond_insert_admin" ON public.conditions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "cond_update_admin" ON public.conditions FOR UPDATE USING (public.is_admin());
CREATE POLICY "cond_delete_admin" ON public.conditions FOR DELETE USING (public.is_admin());

GRANT SELECT ON public.conditions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.conditions TO authenticated;

-- Insérer les conditions existantes
INSERT INTO public.conditions (id, label, sort_order) VALUES
  ('trousse_depart',     'Trousse de départ',    0),
  ('hernie_discale',     'Hernie discale',        1),
  ('sciatique',          'Sciatique',             2),
  ('radiculopathie',     'Radiculopathie',        3),
  ('stenose_foraminale', 'Sténose foraminale',    4),
  ('stenose_spinale',    'Sténose spinale',       5),
  ('arthrose_cervicale', 'Arthrose cervicale',    6),
  ('arthrose_lombaire',  'Arthrose lombaire',     7),
  ('spondylolyse',       'Spondylolyse',          8),
  ('spondylolisthesis',  'Spondylolisthésis',     9),
  ('autre',              'Autre',                10)
ON CONFLICT (id) DO NOTHING;
