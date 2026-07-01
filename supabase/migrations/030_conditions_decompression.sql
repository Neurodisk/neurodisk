-- ============================================================
-- 030 — Nouvelles conditions cliniques (clinique de décompression)
--   + tag des exercices de la banque (migration 016) pour ces
--   conditions ET pour les 2 conditions cervicales déjà ajoutées
--   mais restées sans exercices (radiculopathie/hernie cervicales).
--
--   Ajouts (validés par le clinicien) :
--     Niveau 1 (disques dégénératifs — cœur de la décompression) :
--       discopathie dégénérative L/C, protrusion discale L/C
--     Niveau 2 (générateurs de douleur fréquents) :
--       syndrome facettaire, dysfonction sacro-iliaque,
--       céphalée cervicogénique
--
--   Idempotent : ON CONFLICT DO NOTHING sur conditions ; garde
--   NOT EXISTS sur exercise_conditions. Ne tague que si l'exercice
--   et la condition existent. Le routage des templates R12/R24 est
--   dans js/program-templates.js (profils mécaniques).
-- ============================================================

-- ── 1) Nouvelles conditions ───────────────────────────────
INSERT INTO public.conditions (id, label, sort_order) VALUES
  ('discopathie_degenerative_lombaire',  'Discopathie dégénérative Lombaire',  13),
  ('discopathie_degenerative_cervicale', 'Discopathie dégénérative Cervicale', 14),
  ('protrusion_discale_lombaire',        'Protrusion discale Lombaire',        15),
  ('protrusion_discale_cervicale',       'Protrusion discale Cervicale',       16),
  ('syndrome_facettaire',                'Syndrome facettaire',                17),
  ('dysfonction_sacro_iliaque',          'Dysfonction sacro-iliaque',          18),
  ('cephalee_cervicogenique',            'Céphalée cervicogénique',            19)
ON CONFLICT (id) DO NOTHING;

-- ── 2) Tag des exercices (condition ↔ exercice par titre) ──
DO $$
DECLARE
  rec  record;
  exid uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES

      -- ═══ Radiculopathie cervicale (existante, était vide) ═══
      ('radiculopathie_cervicale', 'Rétraction cervicale (double menton)'),
      ('radiculopathie_cervicale', 'Rotation cervicale active'),
      ('radiculopathie_cervicale', 'Fléchisseurs profonds du cou (chin tuck couché)'),
      ('radiculopathie_cervicale', 'Isométrie cervicale multidirectionnelle'),
      ('radiculopathie_cervicale', 'Rétraction scapulaire (serrer les omoplates)'),
      ('radiculopathie_cervicale', 'Glissement neural du nerf médian'),
      ('radiculopathie_cervicale', 'Glissement neural du nerf cubital'),
      ('radiculopathie_cervicale', 'Extension thoracique sur chaise'),

      -- ═══ Hernie discale cervicale (existante, était vide) ═══
      ('hernie_discale_cervicale', 'Rétraction cervicale (double menton)'),
      ('hernie_discale_cervicale', 'Fléchisseurs profonds du cou (chin tuck couché)'),
      ('hernie_discale_cervicale', 'Isométrie cervicale multidirectionnelle'),
      ('hernie_discale_cervicale', 'Rétraction scapulaire (serrer les omoplates)'),
      ('hernie_discale_cervicale', 'Renforcement scapulaire Y-T-W au mur'),
      ('hernie_discale_cervicale', 'Extension thoracique sur chaise'),
      ('hernie_discale_cervicale', 'Rotation cervicale active'),

      -- ═══ Discopathie dégénérative cervicale ═══
      ('discopathie_degenerative_cervicale', 'Fléchisseurs profonds du cou (chin tuck couché)'),
      ('discopathie_degenerative_cervicale', 'Isométrie cervicale multidirectionnelle'),
      ('discopathie_degenerative_cervicale', 'Rétraction cervicale (double menton)'),
      ('discopathie_degenerative_cervicale', 'Rétraction scapulaire (serrer les omoplates)'),
      ('discopathie_degenerative_cervicale', 'Renforcement scapulaire Y-T-W au mur'),
      ('discopathie_degenerative_cervicale', 'Extension thoracique sur chaise'),
      ('discopathie_degenerative_cervicale', 'Rotation cervicale active'),
      ('discopathie_degenerative_cervicale', 'Respiration diaphragmatique'),

      -- ═══ Protrusion discale cervicale ═══
      ('protrusion_discale_cervicale', 'Rétraction cervicale (double menton)'),
      ('protrusion_discale_cervicale', 'Fléchisseurs profonds du cou (chin tuck couché)'),
      ('protrusion_discale_cervicale', 'Isométrie cervicale multidirectionnelle'),
      ('protrusion_discale_cervicale', 'Rétraction scapulaire (serrer les omoplates)'),
      ('protrusion_discale_cervicale', 'Extension thoracique sur chaise'),
      ('protrusion_discale_cervicale', 'Rotation cervicale active'),

      -- ═══ Céphalée cervicogénique ═══
      ('cephalee_cervicogenique', 'Rétraction cervicale (double menton)'),
      ('cephalee_cervicogenique', 'Fléchisseurs profonds du cou (chin tuck couché)'),
      ('cephalee_cervicogenique', 'Étirement du trapèze supérieur'),
      ('cephalee_cervicogenique', 'Étirement de l''angulaire de l''omoplate'),
      ('cephalee_cervicogenique', 'Rétraction scapulaire (serrer les omoplates)'),
      ('cephalee_cervicogenique', 'Extension thoracique sur chaise'),
      ('cephalee_cervicogenique', 'Isométrie cervicale multidirectionnelle'),
      ('cephalee_cervicogenique', 'Respiration diaphragmatique'),

      -- ═══ Discopathie dégénérative lombaire (stabilisation) ═══
      ('discopathie_degenerative_lombaire', 'Activation du transverse (abdominal hollowing)'),
      ('discopathie_degenerative_lombaire', 'Bascule du bassin (pelvic tilt)'),
      ('discopathie_degenerative_lombaire', 'Chat-chameau (cat-camel)'),
      ('discopathie_degenerative_lombaire', 'Bug mort (dead bug)'),
      ('discopathie_degenerative_lombaire', 'Chien d''arrêt (bird-dog)'),
      ('discopathie_degenerative_lombaire', 'Pont fessier (glute bridge)'),
      ('discopathie_degenerative_lombaire', 'Planche ventrale (gainage)'),
      ('discopathie_degenerative_lombaire', 'Apprentissage du « hip hinge » (charnière de hanche)'),
      ('discopathie_degenerative_lombaire', 'Marche progressive'),

      -- ═══ Protrusion discale lombaire (biais extension/McKenzie) ═══
      ('protrusion_discale_lombaire', 'Extension sur les coudes (sphinx)'),
      ('protrusion_discale_lombaire', 'Extension bras tendus (press-up McKenzie)'),
      ('protrusion_discale_lombaire', 'Décubitus ventral progressif (prone lying)'),
      ('protrusion_discale_lombaire', 'Bascule du bassin (pelvic tilt)'),
      ('protrusion_discale_lombaire', 'Activation du transverse (abdominal hollowing)'),
      ('protrusion_discale_lombaire', 'Pont fessier (glute bridge)'),
      ('protrusion_discale_lombaire', 'Chien d''arrêt (bird-dog)'),
      ('protrusion_discale_lombaire', 'Marche progressive'),

      -- ═══ Syndrome facettaire (neutre, éviter l'extension) ═══
      ('syndrome_facettaire', 'Activation du transverse (abdominal hollowing)'),
      ('syndrome_facettaire', 'Bascule du bassin (pelvic tilt)'),
      ('syndrome_facettaire', 'Genou-poitrine (une jambe)'),
      ('syndrome_facettaire', 'Chat-chameau (cat-camel)'),
      ('syndrome_facettaire', 'Bug mort (dead bug)'),
      ('syndrome_facettaire', 'Chien d''arrêt (bird-dog)'),
      ('syndrome_facettaire', 'Pont fessier (glute bridge)'),
      ('syndrome_facettaire', 'Étirement de la chaîne postérieure (flexion debout douce)'),
      ('syndrome_facettaire', 'Marche progressive'),

      -- ═══ Dysfonction sacro-iliaque (fessiers/stabilisation) ═══
      ('dysfonction_sacro_iliaque', 'Activation du transverse (abdominal hollowing)'),
      ('dysfonction_sacro_iliaque', 'Pont fessier (glute bridge)'),
      ('dysfonction_sacro_iliaque', 'Pont fessier sur une jambe'),
      ('dysfonction_sacro_iliaque', 'Coquille (clamshell)'),
      ('dysfonction_sacro_iliaque', 'Abduction de hanche en décubitus latéral'),
      ('dysfonction_sacro_iliaque', 'Chien d''arrêt (bird-dog)'),
      ('dysfonction_sacro_iliaque', 'Bascule du bassin (pelvic tilt)'),
      ('dysfonction_sacro_iliaque', 'Étirement du piriforme (figure 4)'),
      ('dysfonction_sacro_iliaque', 'Marche progressive')

    ) AS t(cond, title)
  LOOP
    SELECT id INTO exid FROM public.exercises WHERE title = rec.title LIMIT 1;
    IF exid IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.conditions WHERE id = rec.cond) THEN CONTINUE; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.exercise_conditions WHERE exercise_id = exid AND condition_id = rec.cond
    ) THEN
      INSERT INTO public.exercise_conditions (exercise_id, condition_id) VALUES (exid, rec.cond);
    END IF;
  END LOOP;
END $$;
