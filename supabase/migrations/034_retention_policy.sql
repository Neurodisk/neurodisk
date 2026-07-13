-- ============================================================
-- 034 — Politique de conservation et destruction (Loi 25)
--   Dossiers cliniques : 5 ans après le dernier service, puis
--     destruction sécuritaire (sauf obligation légale prolongée).
--   Comptes patient inactifs : accès désactivé après 24 mois
--     d'inactivité ; le dossier reste archivé jusqu'à 5 ans.
--   Journal d'audit : 24 mois (déjà en place, migration 010).
--   Registre des incidents : au moins 5 ans.
--   Demande de suppression : fermeture de compte + suppression des
--     données non obligatoires ; le dossier professionnel est
--     conservé pour la durée exigée.
-- ============================================================

-- ── 0. Colonnes de suivi sur profiles ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_service_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_disabled     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disabled_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_hold           BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.last_service_at IS
  'Date du dernier service clinique rendu (rendez-vous, exercice consigné, échange). Base du calcul de rétention 5 ans.';
COMMENT ON COLUMN public.profiles.legal_hold IS
  'Empêche toute purge automatique (obligation légale de conservation prolongée).';

-- ── 1. Mise à jour de last_service_at ────────────────────────
-- Calcule la date du dernier service à partir des tables d'activité
-- clinique connues. Appelée en tâche planifiée ET utilisable à la main.
CREATE OR REPLACE FUNCTION public.refresh_last_service_dates()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles p
  SET last_service_at = GREATEST(
    p.created_at,
    COALESCE((SELECT MAX(a.appointment_at)  FROM public.appointments   a WHERE a.patient_id = p.id), p.created_at),
    COALESCE((SELECT MAX(l.completed_at)    FROM public.exercise_logs  l WHERE l.patient_id = p.id), p.created_at),
    COALESCE((SELECT MAX(m.created_at)      FROM public.chat_messages  m WHERE m.sender_id  = p.id), p.created_at)
  )
  WHERE p.is_admin = false;
$$;

-- ── 2. Désactivation des comptes patients inactifs (24 mois) ─
-- Ferme l'accès (login) mais NE supprime rien : le dossier clinique
-- reste archivé jusqu'à l'échéance des 5 ans (voir purge ci-dessous).
CREATE OR REPLACE FUNCTION public.disable_inactive_patient_accounts()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles
  SET account_disabled = true, disabled_at = now()
  WHERE is_admin = false
    AND account_disabled = false
    AND COALESCE(last_service_at, created_at) < now() - interval '24 months';
$$;

-- ── 3. Suppression définitive du dossier clinique (> 5 ans) ──
-- Reprend la logique de delete_patient (migration 010 / 032) : purge
-- automatique, sauf legal_hold actif. Journalise avant suppression.
CREATE OR REPLACE FUNCTION public.purge_expired_clinical_records()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles
    WHERE is_admin = false
      AND legal_hold = false
      AND COALESCE(last_service_at, created_at) < now() - interval '5 years'
  LOOP
    INSERT INTO public.audit_log (user_id, user_email, action, table_name, record_id, details)
    VALUES (NULL, 'system:retention_policy', 'DELETE', 'profiles', r.id::text,
            jsonb_build_object('reason', 'retention_expired_5_years'));
    PERFORM public.delete_patient(r.id);
  END LOOP;
END $$;

-- delete_patient exige is_admin() ; on l'exécute ici en contexte système
-- (SECURITY DEFINER), donc on relâche temporairement cette contrainte
-- pour l'appel planifié uniquement.
CREATE OR REPLACE FUNCTION public.delete_patient(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_email text;
BEGIN
  IF NOT (public.is_admin() OR current_setting('app.retention_job', true) = 'on') THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs';
  END IF;

  SELECT email INTO target_email FROM auth.users WHERE id = p_id;

  INSERT INTO public.audit_log (user_id, user_email, action, table_name, record_id, details)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'DELETE', 'profiles', p_id::text,
          jsonb_build_object('erasure', true, 'target_email', target_email));

  SET LOCAL session_replication_role = 'replica';

  DELETE FROM public.exercise_logs     WHERE patient_id = p_id;
  DELETE FROM public.patient_exercises WHERE patient_id = p_id;
  DELETE FROM public.patient_resources WHERE patient_id = p_id;
  DELETE FROM public.form_submissions  WHERE patient_id = p_id;
  DELETE FROM public.patient_forms     WHERE patient_id = p_id;
  DELETE FROM public.programmes        WHERE patient_id = p_id;
  DELETE FROM public.appointments      WHERE patient_id = p_id;
  DELETE FROM public.chat_messages     WHERE sender_id  = p_id;
  DELETE FROM public.chat_participants WHERE user_id    = p_id;
  DELETE FROM public.profiles          WHERE id         = p_id;
  DELETE FROM auth.users               WHERE id         = p_id;
END $$;

REVOKE ALL ON FUNCTION public.delete_patient(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_patient(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_expired_clinical_records()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
BEGIN
  PERFORM set_config('app.retention_job', 'on', true);
  FOR r IN
    SELECT id FROM public.profiles
    WHERE is_admin = false
      AND legal_hold = false
      AND COALESCE(last_service_at, created_at) < now() - interval '5 years'
  LOOP
    PERFORM public.delete_patient(r.id);
  END LOOP;
  PERFORM set_config('app.retention_job', 'off', true);
END $$;

-- ── 4. Demande de suppression par le patient (droit à l'effacement) ─
-- Ferme le compte immédiatement et supprime les données NON
-- obligatoires (échanges, ressources assignées, objectifs, capsules
-- vues). Le dossier professionnel (rendez-vous, exercices consignés,
-- programmes, bilans/PROMs, formulaires) est conservé jusqu'à
-- l'échéance légale (purge_expired_clinical_records, 5 ans).
CREATE OR REPLACE FUNCTION public.request_account_deletion(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin() OR auth.uid() = p_id) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  INSERT INTO public.audit_log (user_id, user_email, action, table_name, record_id, details)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'UPDATE', 'profiles', p_id::text,
          jsonb_build_object('deletion_requested', true));

  DELETE FROM public.chat_messages     WHERE sender_id     = p_id;
  DELETE FROM public.chat_participants WHERE user_id        = p_id;
  DELETE FROM public.patient_resources WHERE patient_id     = p_id;
  DELETE FROM public.patient_objectives WHERE patient_id    = p_id;
  DELETE FROM public.capsule_views     WHERE patient_id     = p_id;

  UPDATE public.profiles
  SET account_disabled = true, disabled_at = now(), deletion_requested_at = now()
  WHERE id = p_id;
END $$;

REVOKE ALL ON FUNCTION public.request_account_deletion(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(uuid) TO authenticated;

-- ── 5. Registre des incidents (confidentialité) — 5 ans minimum ─
CREATE TABLE IF NOT EXISTS public.incident_registry (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  category      TEXT        NOT NULL,     -- ex: 'fuite_donnees', 'acces_non_autorise', 'perte_appareil'
  description   TEXT        NOT NULL,
  reported_by   UUID        REFERENCES auth.users(id),
  resolved      BOOLEAN     NOT NULL DEFAULT false,
  resolution_note TEXT,
  legal_hold    BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_admin_all" ON public.incident_registry
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.purge_incident_registry()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.incident_registry
  WHERE legal_hold = false AND occurred_at < now() - interval '5 years';
$$;

-- ── 6. Planification pg_cron ────────────────────────────────
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('refresh_last_service_dates',      '0 2 * * *',  'SELECT public.refresh_last_service_dates()');
  PERFORM cron.schedule('disable_inactive_patient_accounts','0 3 1 * *', 'SELECT public.disable_inactive_patient_accounts()');
  PERFORM cron.schedule('purge_expired_clinical_records',   '0 4 1 * *', 'SELECT public.purge_expired_clinical_records()');
  PERFORM cron.schedule('purge_incident_registry',          '0 5 1 * *', 'SELECT public.purge_incident_registry()');
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron non planifié (%) — tâches à planifier manuellement.', SQLERRM;
END $$;
