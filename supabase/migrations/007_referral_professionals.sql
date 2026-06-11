-- ============================================================
-- 007 — Professionnels fréquents pour lettres de référence
-- ============================================================

CREATE TABLE IF NOT EXISTS public.referral_professionals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  title       TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rp_select"       ON public.referral_professionals FOR SELECT USING (true);
CREATE POLICY "rp_insert_admin" ON public.referral_professionals FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "rp_update_admin" ON public.referral_professionals FOR UPDATE USING (public.is_admin());
CREATE POLICY "rp_delete_admin" ON public.referral_professionals FOR DELETE USING (public.is_admin());

GRANT SELECT ON public.referral_professionals TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.referral_professionals TO authenticated;
