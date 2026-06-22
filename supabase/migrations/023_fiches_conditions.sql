-- ============================================================
-- 023 — Fiches patient par condition (ressources PDF)
--   Crée la catégorie patient « Mes recommandations » et 11
--   ressources PDF (une par condition) pointant vers les fiches
--   vulgarisées servies en statique (/fiches/<slug>.pdf).
--   Les fiches deviennent assignables aux patients comme toute
--   ressource. Idempotent (par pdf_url).
-- ============================================================

INSERT INTO public.resource_categories (id, label, icon, sort_order, audience)
VALUES ('recommandations', 'Mes recommandations', 'clipboard', 5, 'patient')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.resources (title, type, condition_tag, category, pdf_url, audience, sort_order, description)
SELECT v.title, 'pdf', v.tag, 'recommandations', v.url, 'patient', v.ord,
       'Conseils simples et rassurants pour votre condition.'
FROM (VALUES
  ('Mes recommandations — Bien démarrer',        'trousse_depart',     'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/trousse_depart.pdf',     1),
  ('Mes recommandations — Hernie discale',        'hernie_discale',     'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/hernie_discale.pdf',     2),
  ('Mes recommandations — Sciatique',             'sciatique',          'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/sciatique.pdf',          3),
  ('Mes recommandations — Racine nerveuse irritée','radiculopathie',    'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/radiculopathie.pdf',     4),
  ('Mes recommandations — Sténose foraminale',    'stenose_foraminale', 'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/stenose_foraminale.pdf', 5),
  ('Mes recommandations — Sténose spinale',       'stenose_spinale',    'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/stenose_spinale.pdf',    6),
  ('Mes recommandations — Arthrose cervicale',    'arthrose_cervicale', 'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/arthrose_cervicale.pdf', 7),
  ('Mes recommandations — Arthrose lombaire',     'arthrose_lombaire',  'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/arthrose_lombaire.pdf',  8),
  ('Mes recommandations — Spondylolyse',          'spondylolyse',       'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/spondylolyse.pdf',       9),
  ('Mes recommandations — Spondylolisthésis',     'spondylolisthesis',  'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/spondylolisthesis.pdf', 10),
  ('Mes recommandations — Recommandations générales','autre',           'https://neurodisk.gabrielgirard-kin.workers.dev/fiches/autre.pdf',             11)
) AS v(title, tag, url, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.resources r WHERE r.pdf_url = v.url);
