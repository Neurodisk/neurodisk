-- ============================================================
-- 010 — Rétention & destruction (Loi 25)
--   1. Purge automatique du journal d'audit (> 24 mois)
--   2. Effacement définitif d'un patient (droit à l'effacement)
-- ============================================================

-- ── 1. Purge du journal d'audit ────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_audit_log()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.audit_log WHERE occurred_at < now() - interval '24 months';
$$;

-- Planification mensuelle via pg_cron (1er du mois, 03h00).
-- Si pg_cron n'est pas dispo, cette partie échoue sans casser le reste —
-- on pourra planifier autrement (Edge Function + cron) au besoin.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('purge_audit_log', '0 3 1 * *', 'SELECT public.purge_audit_log()');
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron non planifié (%) — purge à planifier manuellement.', SQLERRM;
END $$;

-- ── 2. Effacement définitif d'un patient ───────────────────
-- Réservé aux admins. Journalise l'effacement, puis supprime toutes les
-- données du patient SANS que les triggers d'audit ne recopient ces données
-- (session_replication_role=replica), afin que l'effacement soit réel.
CREATE OR REPLACE FUNCTION public.delete_patient(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs';
  END IF;

  SELECT email INTO target_email FROM auth.users WHERE id = p_id;

  -- Trace de l'effacement (conservée volontairement dans le journal)
  INSERT INTO public.audit_log (user_id, user_email, action, table_name, record_id, details)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'DELETE', 'profiles', p_id::text,
          jsonb_build_object('erasure', true, 'target_email', target_email));

  -- Désactive les triggers (dont l'audit) le temps de l'effacement
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
