-- ============================================================
-- MIGRATION 001 — Catégorie de ressource
-- ============================================================
-- À exécuter dans Supabase Studio > SQL Editor > New query > Run
--
-- Ajoute un champ « category » aux ressources pour alimenter
-- les onglets côté patient :
--   - recommandations       → Mes recommandations
--   - videos_explicatives    → Mes vidéos explicatives
--   - habitudes_de_vie       → Mes habitudes de vie
--   - bibliotheque (défaut)  → apparaît seulement dans « Ma bibliothèque »
--
-- « Mes exercices » provient des programmes (table patient_exercises),
-- ce n'est PAS une catégorie de ressource.
-- ============================================================

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'bibliotheque'
  CHECK (category IN (
    'bibliotheque',
    'recommandations',
    'videos_explicatives',
    'habitudes_de_vie'
  ));

CREATE INDEX IF NOT EXISTS idx_resources_category
  ON public.resources(category);
