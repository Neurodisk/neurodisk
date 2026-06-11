-- ============================================================
-- 002 — Table de catégories gérables par l'admin
-- ============================================================

CREATE TABLE IF NOT EXISTS public.resource_categories (
  id          TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  icon        TEXT        NOT NULL DEFAULT '📁',
  sort_order  INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cat_select"       ON public.resource_categories;
DROP POLICY IF EXISTS "cat_insert_admin" ON public.resource_categories;
DROP POLICY IF EXISTS "cat_update_admin" ON public.resource_categories;
DROP POLICY IF EXISTS "cat_delete_admin" ON public.resource_categories;

CREATE POLICY "cat_select"       ON public.resource_categories FOR SELECT USING (true);
CREATE POLICY "cat_insert_admin" ON public.resource_categories FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "cat_update_admin" ON public.resource_categories FOR UPDATE USING (public.is_admin());
CREATE POLICY "cat_delete_admin" ON public.resource_categories FOR DELETE USING (public.is_admin());

GRANT SELECT ON public.resource_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resource_categories TO authenticated;

INSERT INTO public.resource_categories (id, label, icon, sort_order) VALUES
  ('bibliotheque',        'Ma bibliothèque',         '📚', 0),
  ('recommandations',     'Mes recommandations',      '📋', 1),
  ('videos_explicatives', 'Mes vidéos explicatives',  '🎬', 2),
  ('habitudes_de_vie',    'Mes habitudes de vie',     '🌱', 3)
ON CONFLICT (id) DO NOTHING;

-- Retirer la contrainte CHECK figée pour accepter tout identifiant de catégorie
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_category_check;
