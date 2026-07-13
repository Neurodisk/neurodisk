-- ============================================================
-- 033 — Loi 25 : bucket privé « patient-files » pour les pièces
--        jointes du chat (renseignements de santé)
--
--   ⚠️ PRÉ-REQUIS MANUEL : créer dans le dashboard Supabase un bucket
--   Storage nommé « patient-files » avec l'option « Public » DÉSACTIVÉE
--   (bucket privé). Cette migration ne fait qu'ajouter les politiques
--   d'accès sur storage.objects.
--
--   Modèle de chemin des fichiers : chat/{conversation_id}/{fichier}
--   → l'accès est réservé aux PARTICIPANTS de la conversation, ce qui
--     couvre le patient et le clinicien du fil, et exclut tout le monde
--     d'autre. Les fichiers sont lus via des URL signées (1 h) générées
--     à la demande côté client ; le bucket n'expose aucune URL publique.
--
--   Remplace le comportement précédent (pièces jointes dans le bucket
--   public « PDFS formation » → accessibles par URL sans authentification).
-- ============================================================

-- Lecture : participant de la conversation encodée dans le chemin.
DROP POLICY IF EXISTS "patient_files_select" ON storage.objects;
CREATE POLICY "patient_files_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = 'chat'
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.conversation_id::text = (storage.foldername(name))[2]
        AND cp.user_id = auth.uid()
    )
  );

-- Téléversement : uniquement dans une conversation dont on est participant.
DROP POLICY IF EXISTS "patient_files_insert" ON storage.objects;
CREATE POLICY "patient_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = 'chat'
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.conversation_id::text = (storage.foldername(name))[2]
        AND cp.user_id = auth.uid()
    )
  );

-- Suppression : le propriétaire du fichier OU un administrateur
-- (nécessaire pour l'effacement définitif d'un patient — droit à l'effacement).
DROP POLICY IF EXISTS "patient_files_delete" ON storage.objects;
CREATE POLICY "patient_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'patient-files'
    AND (owner = auth.uid() OR public.is_admin())
  );
