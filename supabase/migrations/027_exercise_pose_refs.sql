-- ============================================================
-- 027 — Démos de référence pour le coach par caméra (MediaPipe)
--   Le clinicien filme une exécution correcte d'un exercice : on
--   stocke la séquence de poses normalisées (angles articulaires +
--   squelette) dans `data` (jsonb). Le patient charge cette référence
--   pour s'exercer avec le « fantôme » en surimpression (tools/coach-demo.html).
--   Une seule référence par exercice (clé = exercise_id, upsert).
--   Aucune vidéo n'est stockée — uniquement des coordonnées de pose.
--   Permission d'écriture : is_admin() OU has_section('programme').
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exercise_pose_refs (
  exercise_id uuid PRIMARY KEY REFERENCES public.exercises(id) ON DELETE CASCADE,
  data        jsonb NOT NULL,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_pose_refs ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié (le patient charge la démo de
-- ses exercices). Données non sensibles (coordonnées de pose, pas de vidéo).
CREATE POLICY "epr_select" ON public.exercise_pose_refs
  FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

-- Écriture réservée au clinicien (admin ou pro autorisé « programme »)
CREATE POLICY "epr_insert" ON public.exercise_pose_refs
  FOR INSERT TO public
  WITH CHECK (is_admin() OR public.has_section('programme'));
CREATE POLICY "epr_update" ON public.exercise_pose_refs
  FOR UPDATE TO public
  USING (is_admin() OR public.has_section('programme'))
  WITH CHECK (is_admin() OR public.has_section('programme'));
CREATE POLICY "epr_delete" ON public.exercise_pose_refs
  FOR DELETE TO public
  USING (is_admin() OR public.has_section('programme'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_pose_refs TO authenticated, anon, service_role;
