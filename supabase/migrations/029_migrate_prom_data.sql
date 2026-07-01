-- ============================================================
-- 029 — Migration des passations historiques vers le modèle unifié
--   Copie prom_responses (odi/ndi/nprs/psfs) vers assessments +
--   assessment_scores + assessment_responses. NE SUPPRIME RIEN :
--   prom_responses reste intacte, en lecture, comme filet de sécurité.
--
--   Idempotente : rejouable sans dupliquer (guard sur
--   legacy_prom_response_id). Chaque passation historique devient
--   une assessments avec type déduit (la 1re passation d'un instrument
--   pour un patient = 'initial', les suivantes = 'suivi').
-- ============================================================

-- Compléter le référentiel (nprs/psfs manquaient de la migration 028)
INSERT INTO public.instruments (code, name, short, unit, max_score, mcid, better_high) VALUES
  ('nprs', 'Échelle numérique de la douleur (0-10)', 'Douleur (0-10)', '/10', 10, 2, false),
  ('psfs', 'Échelle fonctionnelle spécifique au patient (PSFS)', 'PSFS — fonction', '/10', 10, 2, true)
ON CONFLICT (code) DO NOTHING;

-- Colonne d'audit : trace la ligne prom_responses d'origine (traçabilité,
-- garde d'idempotence). Nullable — les nouvelles passations n'en ont pas besoin.
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS legacy_prom_response_id uuid REFERENCES public.prom_responses(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assessments_legacy_prom_response
  ON public.assessments(legacy_prom_response_id) WHERE legacy_prom_response_id IS NOT NULL;

-- ── 1) Créer une assessments par prom_responses historique ──
WITH ranked AS (
  SELECT
    pr.id, pr.patient_id, pr.instrument, pr.completed_at,
    ROW_NUMBER() OVER (PARTITION BY pr.patient_id, pr.instrument ORDER BY pr.completed_at) AS rn
  FROM public.prom_responses pr
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessments a WHERE a.legacy_prom_response_id = pr.id
  )
)
INSERT INTO public.assessments (patient_id, type, created_at, completed_at, legacy_prom_response_id)
SELECT patient_id, CASE WHEN rn = 1 THEN 'initial' ELSE 'suivi' END, completed_at, completed_at, id
FROM ranked;

-- ── 2) Scores calculés (déjà normalisés dans prom_responses) ─
INSERT INTO public.assessment_scores (assessment_id, instrument, raw_score, normalized_score, subscores)
SELECT a.id, pr.instrument, pr.score, pr.score,
       jsonb_build_object('legacy_score_max', pr.score_max)
FROM public.prom_responses pr
JOIN public.assessments a ON a.legacy_prom_response_id = pr.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.assessment_scores s WHERE s.assessment_id = a.id AND s.instrument = pr.instrument
);

-- ── 3) Réponses brutes (answers jsonb → item_key/value) ──────
INSERT INTO public.assessment_responses (assessment_id, instrument, item_key, value)
SELECT a.id, pr.instrument, kv.key, kv.value
FROM public.prom_responses pr
JOIN public.assessments a ON a.legacy_prom_response_id = pr.id
CROSS JOIN LATERAL jsonb_each(pr.answers) AS kv(key, value)
WHERE NOT EXISTS (
  SELECT 1 FROM public.assessment_responses r WHERE r.assessment_id = a.id AND r.instrument = pr.instrument
);
