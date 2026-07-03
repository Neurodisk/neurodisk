-- ============================================================
-- 032 — Loi 25 : consentement électronique + audit étendu +
--        effacement complet (rattrapage des tables créées depuis juin)
--
--   1) Table `consents` : consentement à la collecte recueilli à la
--      première connexion patient (horodaté, versionné = preuve).
--   2) Étend les triggers d'audit (fn_audit, migration 009) aux
--      nouvelles tables de renseignements de santé créées depuis :
--      bilans, drapeaux rouges, PROMs, conditions, objectifs, capsules.
--   3) Réécrit delete_patient : la version de juin n'effaçait pas les
--      nouvelles tables. Comme la fonction désactive les triggers
--      (session_replication_role=replica), les cascades FK ne jouent
--      pas → il faut des DELETE explicites, dans le bon ordre.
--   Responsable de la protection des renseignements personnels :
--   Dr Christian Bergeron (D.C.).
-- ============================================================

-- ── 1) Consentements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consents (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version     text NOT NULL,               -- ex. '2026-07-v1' : re-consentement si la politique change
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, version)
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON public.consents(user_id);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- Le patient voit et enregistre SON consentement (à son propre nom seulement) ;
-- le clinicien peut consulter (preuve).
CREATE POLICY "consents_select" ON public.consents
  FOR SELECT TO public
  USING (user_id = auth.uid() OR is_admin() OR public.has_section('patients'));
CREATE POLICY "consents_insert" ON public.consents
  FOR INSERT TO public
  WITH CHECK (user_id = auth.uid());
-- Pas d'UPDATE/DELETE applicatif : un consentement donné est immuable (preuve).

GRANT SELECT, INSERT ON public.consents TO authenticated, anon, service_role;

-- ── 2) Audit étendu aux nouvelles tables de santé ──────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assessments', 'assessment_responses', 'assessment_scores',
    'red_flag_alerts', 'prom_assignments', 'prom_responses',
    'patient_conditions', 'patient_objectives', 'objective_completions',
    'capsule_views', 'exercise_pose_refs', 'consents'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$s', t);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s
         FOR EACH ROW EXECUTE FUNCTION public.fn_audit()', t);
  END LOOP;
END $$;

-- ── 3) Effacement définitif complet (droit à l'effacement) ──
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

  -- Désactive les triggers (dont l'audit ET les cascades FK) le temps de l'effacement
  SET LOCAL session_replication_role = 'replica';

  -- Bilans (enfants d'abord : les cascades ne jouent pas en mode replica)
  DELETE FROM public.assessment_responses WHERE assessment_id IN (SELECT id FROM public.assessments WHERE patient_id = p_id);
  DELETE FROM public.assessment_scores    WHERE assessment_id IN (SELECT id FROM public.assessments WHERE patient_id = p_id);
  DELETE FROM public.red_flag_alerts      WHERE patient_id = p_id;
  UPDATE public.red_flag_alerts SET acknowledged_by = NULL WHERE acknowledged_by = p_id;
  DELETE FROM public.assessments          WHERE patient_id = p_id;

  -- Questionnaires / suivi
  DELETE FROM public.prom_responses        WHERE patient_id = p_id;
  DELETE FROM public.prom_assignments      WHERE patient_id = p_id;
  DELETE FROM public.objective_completions WHERE patient_id = p_id;
  DELETE FROM public.patient_objectives    WHERE patient_id = p_id;
  DELETE FROM public.patient_conditions    WHERE patient_id = p_id;
  DELETE FROM public.capsule_views         WHERE patient_id = p_id;
  DELETE FROM public.consents              WHERE user_id    = p_id;

  -- Tables couvertes depuis juin
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
