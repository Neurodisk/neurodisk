-- ============================================================
-- 031 — Activer Supabase Realtime sur red_flag_alerts
--   Pour le badge « drapeaux rouges » de la sidebar admin qui se met
--   à jour en temps réel (comme le chat). Idempotent.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'red_flag_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.red_flag_alerts;
  END IF;
END $$;
