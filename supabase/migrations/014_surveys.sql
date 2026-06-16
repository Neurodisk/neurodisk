-- ============================================================
-- 014 — Sondages pour les professionnels
--   Un sondage (surveys) contient des questions (survey_questions),
--   est assigné à des professionnels (survey_assignments), et chaque
--   pro y répond une seule fois (survey_responses, answers jsonb).
--   Permission admin : has_section('surveys') (voir migration 011/012).
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.surveys (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.survey_questions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  label text NOT NULL,
  qtype text NOT NULL DEFAULT 'text' CHECK (qtype = ANY (ARRAY['text','scale','choice'])),
  options jsonb DEFAULT '[]'::jsonb,   -- pour qtype='choice' : liste d'options
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.survey_assignments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, professional_id)
);

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,   -- { "<question_id>": valeur }
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey   ON public.survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_assignments_survey ON public.survey_assignments(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_assignments_pro    ON public.survey_assignments(professional_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey   ON public.survey_responses(survey_id);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.surveys             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses    ENABLE ROW LEVEL SECURITY;

-- Helper : le pro connecté est-il assigné à ce sondage ?
CREATE OR REPLACE FUNCTION public.is_survey_assignee(sid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.survey_assignments
    WHERE survey_id = sid AND professional_id = auth.uid()
  );
$$;

-- gère (admin OU pro avec permission sondages)
-- surveys
CREATE POLICY "surveys_manage" ON public.surveys
  FOR ALL TO public
  USING (is_admin() OR public.has_section('surveys'))
  WITH CHECK (is_admin() OR public.has_section('surveys'));
CREATE POLICY "surveys_select_assignee" ON public.surveys
  FOR SELECT TO public
  USING (is_admin() OR public.has_section('surveys') OR public.is_survey_assignee(id));

-- survey_questions
CREATE POLICY "sq_manage" ON public.survey_questions
  FOR ALL TO public
  USING (is_admin() OR public.has_section('surveys'))
  WITH CHECK (is_admin() OR public.has_section('surveys'));
CREATE POLICY "sq_select_assignee" ON public.survey_questions
  FOR SELECT TO public
  USING (is_admin() OR public.has_section('surveys') OR public.is_survey_assignee(survey_id));

-- survey_assignments
CREATE POLICY "sa_manage" ON public.survey_assignments
  FOR ALL TO public
  USING (is_admin() OR public.has_section('surveys'))
  WITH CHECK (is_admin() OR public.has_section('surveys'));
CREATE POLICY "sa_select_own" ON public.survey_assignments
  FOR SELECT TO public
  USING (is_admin() OR public.has_section('surveys') OR professional_id = auth.uid());

-- survey_responses : admin/gestionnaire voit tout ; le pro gère la sienne
CREATE POLICY "sr_select" ON public.survey_responses
  FOR SELECT TO public
  USING (is_admin() OR public.has_section('surveys') OR professional_id = auth.uid());
CREATE POLICY "sr_insert_own" ON public.survey_responses
  FOR INSERT TO public
  WITH CHECK (professional_id = auth.uid() OR is_admin());
CREATE POLICY "sr_update_own" ON public.survey_responses
  FOR UPDATE TO public
  USING (professional_id = auth.uid() OR is_admin())
  WITH CHECK (professional_id = auth.uid() OR is_admin());

-- ── Grants (API Data) ───────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys            TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_questions   TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_assignments TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_responses   TO authenticated, anon, service_role;
