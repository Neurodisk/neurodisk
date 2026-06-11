-- ============================================================
-- 003 — Lier le programme d'exercices à une catégorie au choix
-- ============================================================
-- Une catégorie marquée shows_programme=true affiche le programme
-- d'exercices du patient au lieu de ses ressources.
-- Côté admin, une seule catégorie peut l'avoir à la fois.

ALTER TABLE public.resource_categories
  ADD COLUMN IF NOT EXISTS shows_programme BOOLEAN NOT NULL DEFAULT false;
