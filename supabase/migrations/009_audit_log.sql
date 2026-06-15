-- ============================================================
-- 009 — Journal d'audit (Loi 25 : traçabilité des accès aux
--        renseignements de santé)
-- ============================================================

-- Table du journal
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  user_id     uuid,
  user_email  text,
  action      text NOT NULL,              -- INSERT / UPDATE / DELETE / VIEW
  table_name  text,
  record_id   text,
  details     jsonb
);

CREATE INDEX IF NOT EXISTS audit_log_occurred_idx ON public.audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_table_idx    ON public.audit_log (table_name, record_id);

-- RLS : seuls les admins peuvent LIRE le journal ; personne ne peut
-- l'écrire/modifier/supprimer directement (écriture via fonctions SECURITY DEFINER).
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_select_admin ON public.audit_log;
CREATE POLICY audit_select_admin ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());

REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;   -- RLS limite déjà aux admins

-- Fonction de trigger : journalise les écritures sans jamais bloquer
-- l'opération clinique en cas d'erreur.
CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rid text;
BEGIN
  BEGIN
    rid := (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END)::text;
  EXCEPTION WHEN others THEN rid := NULL;
  END;

  BEGIN
    INSERT INTO public.audit_log (user_id, user_email, action, table_name, record_id, details)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      TG_OP, TG_TABLE_NAME, rid,
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
    );
  EXCEPTION WHEN others THEN
    NULL;  -- ne jamais faire échouer l'écriture métier à cause de l'audit
  END;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

-- Fonction d'audit d'ACCÈS (lecture) appelable par l'app quand un
-- admin/pro ouvre un dossier patient.
CREATE OR REPLACE FUNCTION public.log_access(
  p_table text, p_record text, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, user_email, action, table_name, record_id, details)
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'VIEW', p_table, p_record, COALESCE(p_details, '{}'::jsonb)
  );
EXCEPTION WHEN others THEN NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.log_access(text, text, jsonb) TO authenticated;

-- Attache le trigger d'audit aux tables contenant des renseignements de santé.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'patient_resources', 'patient_exercises', 'exercise_logs',
    'referral_letters', 'form_submissions', 'patient_forms', 'chat_messages'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$s', t);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s
         FOR EACH ROW EXECUTE FUNCTION public.fn_audit()', t);
  END LOOP;
END $$;
