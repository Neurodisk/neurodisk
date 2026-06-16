-- ============================================================
-- 015 — Objectifs du patient (court / moyen / long terme)
--   Une catégorie marquée shows_objectifs=true affiche un onglet
--   « Objectifs » côté patient. Les objectifs sont personnalisés
--   par patient, créés dans la section admin dédiée, et le patient
--   peut cocher ceux qu'il a atteints (barre de progression).
--   Permission pro : has_section('objectifs').
-- ============================================================

-- Colonne sur les catégories (comme shows_programme)
ALTER TABLE public.resource_categories
  ADD COLUMN IF NOT EXISTS shows_objectifs boolean NOT NULL DEFAULT false;

-- Table des objectifs par patient
CREATE TABLE IF NOT EXISTS public.patient_objectives (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  horizon text NOT NULL CHECK (horizon = ANY (ARRAY['court','moyen','long'])),
  label text NOT NULL,
  target_date date,
  is_done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_objectives_patient ON public.patient_objectives(patient_id);

ALTER TABLE public.patient_objectives ENABLE ROW LEVEL SECURITY;

-- Lecture : le patient voit les siens ; admin/gestionnaire voient tout
CREATE POLICY "po_select" ON public.patient_objectives
  FOR SELECT TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('objectifs'));

-- Création/suppression réservées au clinicien (admin ou pro autorisé)
CREATE POLICY "po_insert" ON public.patient_objectives
  FOR INSERT TO public
  WITH CHECK (is_admin() OR public.has_section('objectifs'));
CREATE POLICY "po_delete" ON public.patient_objectives
  FOR DELETE TO public
  USING (is_admin() OR public.has_section('objectifs'));

-- Mise à jour : clinicien (tout) OU le patient (pour cocher « atteint »)
CREATE POLICY "po_update" ON public.patient_objectives
  FOR UPDATE TO public
  USING (is_admin() OR public.has_section('objectifs') OR patient_id = auth.uid())
  WITH CHECK (is_admin() OR public.has_section('objectifs') OR patient_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_objectives TO authenticated, anon, service_role;
