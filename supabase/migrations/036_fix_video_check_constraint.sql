-- ============================================================
-- 036 — Corrige la contrainte vidéo (ère Bunny → YouTube)
--
-- La migration 018 a ajouté la colonne resources.video_url pour
-- l'hébergement YouTube « non répertorié » (remplace Bunny), mais
-- l'ancienne contrainte CHECK video_requires_bunny_id — héritée du
-- schéma initial (Bunny) — exigeait encore bunny_video_id IS NOT NULL
-- pour toute ressource type='video', bloquant l'ajout de vidéos YouTube :
--   "new row for relation resources violates check constraint
--    video_requires_bunny_id"
--
-- Corrigé : une ressource vidéo est valide si bunny_video_id OU
-- video_url est renseigné (YouTube = chemin normal désormais, Bunny
-- conservé en repli pour l'historique).
-- ============================================================

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS video_requires_bunny_id;

ALTER TABLE public.resources ADD CONSTRAINT video_requires_bunny_id CHECK (
  type <> 'video' OR bunny_video_id IS NOT NULL OR video_url IS NOT NULL
);
