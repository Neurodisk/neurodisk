-- ============================================================
-- 006 — Lier les exercices aux conditions appropriées
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exercise_conditions (
  exercise_id  UUID  NOT NULL REFERENCES public.exercises(id)  ON DELETE CASCADE,
  condition_id TEXT  NOT NULL REFERENCES public.conditions(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, condition_id)
);

ALTER TABLE public.exercise_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ec_select"       ON public.exercise_conditions FOR SELECT USING (true);
CREATE POLICY "ec_insert_admin" ON public.exercise_conditions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "ec_delete_admin" ON public.exercise_conditions FOR DELETE USING (public.is_admin());

GRANT SELECT ON public.exercise_conditions TO authenticated;
GRANT INSERT, DELETE ON public.exercise_conditions TO authenticated;
