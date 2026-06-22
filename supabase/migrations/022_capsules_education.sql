-- ============================================================
-- 022 — Capsules d'éducation (neuroscience de la douleur, PNE)
--   Parcours structuré : capsules ordonnées (fiche + vidéo YouTube
--   optionnelle), suivi « Vu » par patient, barre de progression.
--   Une catégorie marquée shows_education affiche le parcours.
--   Permission clinicien : has_section('education').
--   Les 8 capsules PNE sont pré-remplies (langage rassurant,
--   fondées sur les données probantes — Louw, Moseley, Nijs).
-- ============================================================

ALTER TABLE public.resource_categories
  ADD COLUMN IF NOT EXISTS shows_education boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.capsules (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  body text,
  video_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.capsule_views (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  capsule_id uuid NOT NULL REFERENCES public.capsules(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, capsule_id)
);

CREATE INDEX IF NOT EXISTS idx_capsule_views_patient ON public.capsule_views(patient_id);

ALTER TABLE public.capsules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capsule_views  ENABLE ROW LEVEL SECURITY;

-- Capsules : lisibles par tout utilisateur connecté ; gérées par le clinicien.
CREATE POLICY "caps_select" ON public.capsules
  FOR SELECT TO public USING (auth.uid() IS NOT NULL);
CREATE POLICY "caps_write" ON public.capsules
  FOR ALL TO public
  USING (is_admin() OR public.has_section('education'))
  WITH CHECK (is_admin() OR public.has_section('education'));

-- Suivi « Vu » : le patient gère le sien ; le clinicien voit tout.
CREATE POLICY "capv_select" ON public.capsule_views
  FOR SELECT TO public
  USING (patient_id = auth.uid() OR is_admin() OR public.has_section('education'));
CREATE POLICY "capv_insert" ON public.capsule_views
  FOR INSERT TO public WITH CHECK (patient_id = auth.uid());
CREATE POLICY "capv_delete" ON public.capsule_views
  FOR DELETE TO public USING (patient_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capsules      TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capsule_views TO authenticated, anon, service_role;

-- ── Pré-remplir les 8 capsules PNE (si la table est vide) ───
INSERT INTO public.capsules (title, body, sort_order)
SELECT * FROM (VALUES
  ($d$1. La douleur, un système d'alarme$d$, $d$La douleur est le système d'alarme de votre corps : son rôle est de vous protéger, pas de mesurer les dégâts. Comme un détecteur de fumée, elle se déclenche pour attirer votre attention — parfois pour une vraie menace, parfois pour de la simple vapeur. Une douleur forte ne signifie donc pas forcément une blessure grave. Bonne nouvelle : on peut agir sur cette alarme, la calmer, et reprendre vos activités en sécurité.$d$, 1),
  ($d$2. Avoir mal n'est pas se blesser$d$, $d$Avoir mal ne veut pas dire s'abîmer. Beaucoup de personnes sans aucune douleur ont, à l'imagerie, des hernies ou de l'arthrose ; et d'autres ont très mal sans lésion visible. La douleur dépend de bien plus que l'état des tissus. Bouger avec un inconfort tolérable n'endommage pas votre dos — au contraire, l'immobilité prolongée l'affaiblit. « Ça fait mal » n'est pas « ça s'aggrave ».$d$, 2),
  ($d$3. Quand l'alarme devient trop sensible$d$, $d$Quand la douleur persiste, le système nerveux peut devenir plus sensible : l'alarme se règle trop bas et se déclenche pour des sollicitations normales. Ce n'est pas « dans la tête » — c'est un phénomène biologique réel, et il est réversible. En bougeant progressivement, en dormant mieux et en réduisant le stress, on aide le système à se recalibrer.$d$, 3),
  ($d$4. Le cerveau module la douleur$d$, $d$C'est le cerveau qui décide, au final, de produire ou non de la douleur, selon tout le contexte : fatigue, stress, émotions, croyances, expériences passées. La même sollicitation peut faire mal un jour et pas un autre. Cela ne rend pas votre douleur moins réelle — ça ouvre des leviers : agir sur le sommeil, le stress et la confiance diminue réellement la douleur.$d$, 4),
  ($d$5. Bouger est sécuritaire$d$, $d$Le mouvement est l'un des meilleurs traitements pour le dos. Il nourrit les disques, entretient la force et envoie au cerveau un message de sécurité qui calme l'alarme. Commencez par des doses confortables et augmentez progressivement. Un inconfort passager pendant l'effort est normal et sans danger. Le repos prolongé, lui, entretient la douleur et l'incapacité.$d$, 5),
  ($d$6. Sommeil, stress et douleur$d$, $d$Sommeil, stress et douleur forment un cercle : mal dormir et être tendu abaissent le seuil de douleur, et la douleur perturbe le sommeil. Bonne nouvelle : agir sur un maillon aide les autres. Une routine de sommeil régulière, la respiration, la marche et les activités plaisantes réduisent la sensibilité de l'alarme.$d$, 6),
  ($d$7. Reprendre par paliers$d$, $d$Reprendre ses activités se fait par paliers, pas tout d'un coup. On choisit un niveau confortable, on le tient quelques jours, puis on augmente un peu — comme un entraînement. Les poussées de douleur font partie du chemin et ne signifient pas un recul. L'objectif n'est pas d'éviter la douleur à tout prix, mais de regagner progressivement vos activités.$d$, 7),
  ($d$8. Mon plan de rétablissement$d$, $d$Votre rétablissement combine trois choses : la décompression (réduire la pression sur le disque), les exercices actifs (renforcer et rassurer le système) et l'autogestion (sommeil, stress, reprise par paliers). La décompression ouvre la fenêtre ; vos actions au quotidien font la différence durable. Vous êtes l'acteur principal de vos résultats.$d$, 8)
) AS t(title, body, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.capsules);
