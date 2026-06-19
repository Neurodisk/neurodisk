-- ============================================================
-- 018 — Hébergement vidéo sur Supabase Storage (remplace Bunny)
--   Les vidéos d'exercices et de ressources sont désormais
--   stockées dans le bucket public « exercise-videos » et lues
--   en HTML5 (<video>) via leur URL publique, au lieu de Bunny.
--   Nouvelle colonne video_url sur resources et exercises.
--   (bunny_video_id conservée pour rétro-compatibilité.)
-- ============================================================

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS video_url text;

-- ── Bucket de stockage des vidéos (public en lecture) ───────
-- Limite 50 Mo/fichier (plan gratuit). Sur Pro, augmentable.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-videos', 'exercise-videos', true, 52428800,
  ARRAY['video/mp4','video/quicktime','video/webm','video/x-msvideo','video/x-matroska']
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Politiques d'accès sur les objets du bucket ─────────────
DROP POLICY IF EXISTS "exvid_read"   ON storage.objects;
DROP POLICY IF EXISTS "exvid_insert" ON storage.objects;
DROP POLICY IF EXISTS "exvid_update" ON storage.objects;
DROP POLICY IF EXISTS "exvid_delete" ON storage.objects;

-- Lecture publique (les patients regardent les vidéos)
CREATE POLICY "exvid_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'exercise-videos');

-- Téléversement réservé au personnel autorisé (admin ou pro avec
-- une permission ressources/programme)
CREATE POLICY "exvid_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'exercise-videos' AND (
      public.is_admin()
      OR public.has_section('resources_patient')
      OR public.has_section('resources_pro')
      OR public.has_section('programme')
    )
  );

CREATE POLICY "exvid_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'exercise-videos' AND public.is_admin())
  WITH CHECK (bucket_id = 'exercise-videos' AND public.is_admin());

CREATE POLICY "exvid_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exercise-videos' AND public.is_admin());
