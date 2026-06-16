-- ============================================================
-- 013 — Autoriser le type de ressource « word » (.doc/.docx)
--   La contrainte resources_type_check n'autorisait que
--   'video' et 'pdf'. On ajoute 'word'. Le fichier Word est
--   stocké dans la colonne pdf_url (réutilisée comme URL de
--   fichier générique), uploadé dans le bucket « PDFS formation ».
-- ============================================================

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_type_check;
ALTER TABLE public.resources
  ADD CONSTRAINT resources_type_check
  CHECK (type = ANY (ARRAY['video'::text, 'pdf'::text, 'word'::text]));
