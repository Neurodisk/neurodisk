-- ============================================================
-- 011 — Les professionnels autorisés peuvent gérer les ressources
--   Avant : les politiques RLS de `resources` ne regardaient que
--   is_admin(). Les permissions allowed_sections cochées dans le
--   panel admin n'étaient appliquées QUE dans l'interface, pas dans
--   la base → un professionnel autorisé recevait toujours
--   « new row violates row-level security policy ».
--   Cette migration fait respecter allowed_sections côté Postgres.
-- ============================================================

-- ── Helper : le pro connecté a-t-il une section autorisée ? ──
CREATE OR REPLACE FUNCTION public.has_section(perm text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT (allowed_sections ->> perm)::boolean
    FROM public.profiles
    WHERE id = auth.uid() AND is_professional = true
  ), false);
$$;

-- ── Helper : peut gérer les ressources de cette audience ? ──
--   audience 'professional' → perm resources_pro
--   audience 'patient'      → perm resources_patient
CREATE OR REPLACE FUNCTION public.can_manage_resources(aud text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin()
      OR public.has_section('resources_' || CASE WHEN aud = 'professional' THEN 'pro' ELSE 'patient' END);
$$;

-- ── Remplacer les politiques resources ──────────────────────
DROP POLICY IF EXISTS "resources_insert_admin" ON public.resources;
CREATE POLICY "resources_insert" ON public.resources
  FOR INSERT TO public
  WITH CHECK (public.can_manage_resources(audience));

DROP POLICY IF EXISTS "resources_update_admin" ON public.resources;
CREATE POLICY "resources_update" ON public.resources
  FOR UPDATE TO public
  USING (public.can_manage_resources(audience))
  WITH CHECK (public.can_manage_resources(audience));

DROP POLICY IF EXISTS "resources_delete_admin" ON public.resources;
CREATE POLICY "resources_delete" ON public.resources
  FOR DELETE TO public
  USING (public.can_manage_resources(audience));

-- SELECT : admin OU pro autorisé (pour voir la liste à gérer)
-- OU patient à qui la ressource est assignée (inchangé).
DROP POLICY IF EXISTS "resources_select" ON public.resources;
CREATE POLICY "resources_select" ON public.resources
  FOR SELECT TO public
  USING (
    is_admin()
    OR public.can_manage_resources(audience)
    OR EXISTS (
      SELECT 1 FROM public.patient_resources pr
      WHERE pr.resource_id = resources.id AND pr.patient_id = auth.uid()
    )
  );
