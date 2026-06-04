-- ============================================================
-- NEURODISK — Schéma Supabase complet
-- ============================================================
-- Ordre d'exécution : coller l'intégralité dans
-- Supabase Studio > SQL Editor > New query > Run
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. Profils utilisateurs (patients + admins)
--     Miroir de auth.users, enrichi de données cliniques.
--     Créé automatiquement par le trigger ci-dessous.
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,
  full_name     TEXT,
  is_admin      BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1b. Ressources cliniques (vidéos Bunny.net ou PDF)
CREATE TABLE IF NOT EXISTS public.resources (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT        NOT NULL,
  description     TEXT,
  type            TEXT        NOT NULL CHECK (type IN ('video', 'pdf')),
  condition_tag   TEXT        NOT NULL CHECK (condition_tag IN (
                                'arthrose',
                                'hernie_discale',
                                'douleurs_persistantes',
                                'general'
                              )),
  -- Vidéo Bunny.net : identifiant de la vidéo (ex: "abc123")
  -- URL embed finale : https://iframe.mediadelivery.net/embed/{LIBRARY_ID}/{bunny_video_id}
  bunny_video_id  TEXT,
  -- PDF : URL publique du fichier (Supabase Storage ou externe)
  pdf_url         TEXT,
  thumbnail_url   TEXT,
  duration_sec    INTEGER,    -- durée en secondes (vidéos uniquement)
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT video_requires_bunny_id CHECK (
    type <> 'video' OR bunny_video_id IS NOT NULL
  ),
  CONSTRAINT pdf_requires_url CHECK (
    type <> 'pdf' OR pdf_url IS NOT NULL
  )
);

-- 1c. Table de jointure : assignation patient ↔ ressource
CREATE TABLE IF NOT EXISTS public.patient_resources (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id   UUID        NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  assigned_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (patient_id, resource_id)
);


-- ============================================================
-- 2. TRIGGER : création automatique du profil à l'inscription
--    Déclenché lors de chaque nouveau magic link confirmé.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (
    NEW.id,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
--    Règle générale : tout est refusé par défaut,
--    on ouvre uniquement ce qui est nécessaire.
-- ============================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_resources ENABLE ROW LEVEL SECURITY;

-- Helper : vrai si l'utilisateur connecté est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;


-- ---- PROFILES -----------------------------------------------

-- Un utilisateur voit uniquement son propre profil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

-- Un utilisateur met à jour uniquement son propre profil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- empêche un patient de se promouvoir admin
    AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

-- Seul un admin peut créer un profil manuellement (hors trigger)
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- Seul un admin peut supprimer un profil
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  USING (public.is_admin());


-- ---- RESOURCES ----------------------------------------------

-- Un patient ne voit que les ressources qui lui sont assignées.
-- Un admin voit tout.
CREATE POLICY "resources_select"
  ON public.resources FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.patient_resources pr
      WHERE pr.resource_id = resources.id
        AND pr.patient_id  = auth.uid()
    )
  );

-- Seul un admin peut créer / modifier / supprimer des ressources
CREATE POLICY "resources_insert_admin"
  ON public.resources FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "resources_update_admin"
  ON public.resources FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "resources_delete_admin"
  ON public.resources FOR DELETE
  USING (public.is_admin());


-- ---- PATIENT_RESOURCES --------------------------------------

-- Un patient voit uniquement ses propres assignations.
-- Un admin voit toutes les assignations.
CREATE POLICY "patient_resources_select"
  ON public.patient_resources FOR SELECT
  USING (
    patient_id = auth.uid()
    OR public.is_admin()
  );

-- Seul un admin peut assigner ou désassigner des ressources
CREATE POLICY "patient_resources_insert_admin"
  ON public.patient_resources FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "patient_resources_delete_admin"
  ON public.patient_resources FOR DELETE
  USING (public.is_admin());


-- ============================================================
-- 4. INDEX (performances)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patient_resources_patient_id
  ON public.patient_resources(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_resources_resource_id
  ON public.patient_resources(resource_id);

CREATE INDEX IF NOT EXISTS idx_resources_condition_tag
  ON public.resources(condition_tag);

CREATE INDEX IF NOT EXISTS idx_resources_type
  ON public.resources(type);


-- ============================================================
-- 5. GRANT : accès aux tables pour le rôle authentifié
-- ============================================================
GRANT SELECT, UPDATE ON public.profiles          TO authenticated;
GRANT SELECT          ON public.resources        TO authenticated;
GRANT SELECT          ON public.patient_resources TO authenticated;

-- L'accès complet (INSERT/UPDATE/DELETE) pour les admins
-- est contrôlé par les politiques RLS, pas les GRANT.
GRANT INSERT, UPDATE, DELETE ON public.resources         TO authenticated;
GRANT INSERT, DELETE          ON public.patient_resources TO authenticated;
GRANT INSERT, DELETE          ON public.profiles          TO authenticated;
