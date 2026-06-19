-- ============================================================
-- 018 — Hébergement vidéo via YouTube (remplace Bunny)
--   Les vidéos d'exercices et de ressources sont hébergées sur
--   YouTube (« non répertorié ») et lues via un iframe
--   youtube-nocookie. On stocke simplement le lien YouTube dans
--   la colonne video_url. (bunny_video_id conservée pour repli.)
--
--   NB : aucune dépendance Storage — l'hébergement est externe
--   (YouTube), donc aucun bucket à créer.
-- ============================================================

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS video_url text;
