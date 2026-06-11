-- ============================================================
-- 008 — Signataires Neurodisk + historique des lettres de référence
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clinic_staff (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  title       TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_select"       ON public.clinic_staff FOR SELECT USING (true);
CREATE POLICY "cs_insert_admin" ON public.clinic_staff FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "cs_update_admin" ON public.clinic_staff FOR UPDATE USING (public.is_admin());
CREATE POLICY "cs_delete_admin" ON public.clinic_staff FOR DELETE USING (public.is_admin());

GRANT SELECT ON public.clinic_staff TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_staff TO authenticated;

-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.referral_letters (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name   TEXT        NOT NULL,
  recipient_id   UUID        REFERENCES public.referral_professionals(id) ON DELETE SET NULL,
  staff_id       UUID        REFERENCES public.clinic_staff(id)           ON DELETE SET NULL,
  condition_label TEXT,
  body           TEXT        NOT NULL,
  recipient_name TEXT,
  staff_name     TEXT,
  staff_title    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rl_select_admin" ON public.referral_letters FOR SELECT USING (public.is_admin());
CREATE POLICY "rl_insert_admin" ON public.referral_letters FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "rl_delete_admin" ON public.referral_letters FOR DELETE USING (public.is_admin());

GRANT SELECT, INSERT, DELETE ON public.referral_letters TO authenticated;
