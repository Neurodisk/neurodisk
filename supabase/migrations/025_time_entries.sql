-- ============================================================
-- 025 — Feuille de temps du personnel (heures réelles)
--   Chaque professionnel saisit ses blocs d'heures par jour
--   (plusieurs quarts possibles). L'admin voit/modifie tout.
--   Aucun horaire prévu, aucune paie, aucune approbation.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.time_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date  date NOT NULL,
  start_time time NOT NULL,
  end_time   time NOT NULL,
  note       text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_pro_date ON public.time_entries(pro_id, work_date);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Lecture : le pro voit les siennes, l'admin voit tout
CREATE POLICY "te_select" ON public.time_entries
  FOR SELECT TO public
  USING (pro_id = auth.uid() OR is_admin());

-- Création : l'admin pour n'importe qui ; un membre du personnel pour lui-même
CREATE POLICY "te_insert" ON public.time_entries
  FOR INSERT TO public
  WITH CHECK (
    is_admin()
    OR (pro_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND (p.is_professional OR p.is_admin)))
  );

-- Modification / suppression : ses propres entrées, ou l'admin pour tout
CREATE POLICY "te_update" ON public.time_entries
  FOR UPDATE TO public
  USING (pro_id = auth.uid() OR is_admin())
  WITH CHECK (pro_id = auth.uid() OR is_admin());

CREATE POLICY "te_delete" ON public.time_entries
  FOR DELETE TO public
  USING (pro_id = auth.uid() OR is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated, anon, service_role;
