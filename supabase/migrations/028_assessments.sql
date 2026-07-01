-- ============================================================
-- 028 — Architecture unifiée des questionnaires d'évaluation
--   (ligne de base + réévaluations, tous instruments confondus)
--
--   Additif seulement : ne touche pas à prom_assignments/prom_responses
--   (module PROMs existant). Une migration ultérieure copiera les
--   passations historiques ODI/NDI/NPRS/PSFS dans ce nouveau modèle ;
--   l'ancienne table restera en place en lecture, le temps de valider.
--
--   Modèle :
--     instruments            — référentiel des échelles
--     assessments             — 1 ligne par passation (jamais écrasée)
--     assessment_responses    — réponses brutes, item par item
--     assessment_scores       — score(s) calculé(s) par instrument
--     red_flag_alerts         — dépistage sécurité déclenché, à acquitter
--
--   Permission clinicien : has_section('proms') (réutilise la section
--   existante « Questionnaires » du panel admin/pro).
-- ============================================================

-- ── Référentiel des instruments ───────────────────────────
CREATE TABLE IF NOT EXISTS public.instruments (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  short       text NOT NULL,
  unit        text,
  max_score   numeric,
  mcid        numeric,
  better_high boolean NOT NULL DEFAULT false
);

INSERT INTO public.instruments (code, name, short, unit, max_score, mcid, better_high) VALUES
  ('neurodisk_core', 'Module Neurodisk (tronc commun)', 'Neurodisk', null, null, null, false),
  ('qbpds',          'Échelle de Québec (QBPDS)',        'QBPDS — lombaire', '/100', 100, 17.5, false),
  ('odi',            'Indice d''incapacité d''Oswestry (ODI)', 'ODI — lombaire', '%', 100, 10, false),
  ('ndi',            'Indice d''incapacité cervicale (NDI)',   'NDI — cervical', '%', 100, 10, false),
  ('startback',      'STarT Back Screening Tool', 'STarT Back — pronostic', '/9', 9, null, false)
ON CONFLICT (code) DO NOTHING;

-- ── Passations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessments (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  condition_id text REFERENCES public.conditions(id) ON DELETE SET NULL,
  type         text NOT NULL CHECK (type = ANY (ARRAY['initial','suivi'])),
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assessments_patient ON public.assessments(patient_id, created_at);

-- ── Réponses brutes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  instrument    text NOT NULL REFERENCES public.instruments(code),
  item_key      text NOT NULL,
  value         jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment ON public.assessment_responses(assessment_id);

-- ── Scores calculés ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  assessment_id     uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  instrument        text NOT NULL REFERENCES public.instruments(code),
  raw_score         numeric,
  normalized_score  numeric,
  subscores         jsonb DEFAULT '{}'::jsonb,
  flags             jsonb DEFAULT '{}'::jsonb,
  UNIQUE (assessment_id, instrument)
);

CREATE INDEX IF NOT EXISTS idx_assessment_scores_assessment ON public.assessment_scores(assessment_id);

-- ── Alertes drapeaux rouges ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.red_flag_alerts (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_id   uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  flag_key        text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_red_flag_alerts_patient       ON public.red_flag_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_red_flag_alerts_unacknowledged ON public.red_flag_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.instruments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flag_alerts       ENABLE ROW LEVEL SECURITY;

-- Référentiel : lecture publique authentifiée, pas d'écriture applicative
CREATE POLICY "instruments_select" ON public.instruments
  FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

-- Passations : le patient voit/crée les siennes ; le clinicien voit/gère tout
CREATE POLICY "assessments_select" ON public.assessments
  FOR SELECT TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('proms'));
CREATE POLICY "assessments_insert" ON public.assessments
  FOR INSERT TO public
  WITH CHECK (patient_id = auth.uid() OR is_admin() OR public.has_section('proms'));
CREATE POLICY "assessments_update" ON public.assessments
  FOR UPDATE TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('proms'))
  WITH CHECK (patient_id = auth.uid() OR is_admin() OR public.has_section('proms'));
CREATE POLICY "assessments_delete" ON public.assessments
  FOR DELETE TO public
  USING (is_admin() OR public.has_section('proms'));

-- Réponses brutes : suivent la visibilité de la passation parente
CREATE POLICY "assessment_responses_select" ON public.assessment_responses
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.assessments a WHERE a.id = assessment_id
      AND (a.patient_id = auth.uid() OR is_admin() OR public.has_section('proms'))
  ));
CREATE POLICY "assessment_responses_insert" ON public.assessment_responses
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessments a WHERE a.id = assessment_id
      AND (a.patient_id = auth.uid() OR is_admin() OR public.has_section('proms'))
  ));
CREATE POLICY "assessment_responses_delete" ON public.assessment_responses
  FOR DELETE TO public
  USING (is_admin() OR public.has_section('proms'));

-- Scores calculés : lecture patient/clinicien ; écriture réservée au clinicien
-- (le calcul se fait côté serveur/app au moment de la soumission, pas par le patient)
CREATE POLICY "assessment_scores_select" ON public.assessment_scores
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.assessments a WHERE a.id = assessment_id
      AND (a.patient_id = auth.uid() OR is_admin() OR public.has_section('proms'))
  ));
CREATE POLICY "assessment_scores_insert" ON public.assessment_scores
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessments a WHERE a.id = assessment_id
      AND (a.patient_id = auth.uid() OR is_admin() OR public.has_section('proms'))
  ));
CREATE POLICY "assessment_scores_delete" ON public.assessment_scores
  FOR DELETE TO public
  USING (is_admin() OR public.has_section('proms'));

-- Drapeaux rouges : le patient peut créer sa propre alerte (déclenchée par son
-- questionnaire) mais ne voit/acquitte rien — c'est réservé au clinicien.
CREATE POLICY "red_flag_alerts_select" ON public.red_flag_alerts
  FOR SELECT TO public
  USING (is_admin() OR public.has_section('proms'));
CREATE POLICY "red_flag_alerts_insert" ON public.red_flag_alerts
  FOR INSERT TO public
  WITH CHECK (patient_id = auth.uid() OR is_admin() OR public.has_section('proms'));
CREATE POLICY "red_flag_alerts_update" ON public.red_flag_alerts
  FOR UPDATE TO public
  USING (is_admin() OR public.has_section('proms'))
  WITH CHECK (is_admin() OR public.has_section('proms'));

GRANT SELECT ON public.instruments TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments          TO authenticated, anon, service_role;
GRANT SELECT, INSERT, DELETE         ON public.assessment_responses TO authenticated, anon, service_role;
GRANT SELECT, INSERT, DELETE         ON public.assessment_scores    TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE         ON public.red_flag_alerts      TO authenticated, anon, service_role;
