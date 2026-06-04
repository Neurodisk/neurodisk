-- ============================================================
-- NEURODISK — Données de test (développement uniquement)
-- ============================================================
-- ATTENTION : ne pas exécuter en production.
-- Exécuter APRÈS schema.sql.
--
-- Étapes :
--   1. Créer les comptes via Supabase Auth (magic link ou
--      Authentication > Users > Invite user) pour obtenir
--      les UUIDs réels, puis remplacer les UUIDs ci-dessous.
--   2. Ou utiliser ces UUIDs fictifs dans un projet de dev
--      local (supabase start).
-- ============================================================

-- UUIDs fictifs pour les tests locaux
-- Remplacer par les vrais UUIDs de auth.users en production
DO $$
DECLARE
  admin_id  UUID := '00000000-0000-0000-0000-000000000001';
  patient1  UUID := '00000000-0000-0000-0000-000000000002';
  patient2  UUID := '00000000-0000-0000-0000-000000000003';
  res1      UUID := uuid_generate_v4();
  res2      UUID := uuid_generate_v4();
  res3      UUID := uuid_generate_v4();
  res4      UUID := uuid_generate_v4();
BEGIN

  -- Profils (l'admin doit déjà exister dans auth.users)
  INSERT INTO public.profiles (id, email, full_name, is_admin) VALUES
    (admin_id, 'admin@neurodisk.ca',        'Dr Christian Bergeron', true),
    (patient1, 'patient.test1@exemple.com', 'Marie Tremblay',        false),
    (patient2, 'patient.test2@exemple.com', 'Jean Gagné',            false)
  ON CONFLICT (id) DO NOTHING;

  -- Ressources
  INSERT INTO public.resources
    (id, title, description, type, condition_tag, bunny_video_id, thumbnail_url, duration_sec, sort_order)
  VALUES
    (res1,
     'Comprendre votre arthrose cervicale',
     'Explication des mécanismes de l''arthrose au niveau du cou et des solutions conservatrices disponibles.',
     'video', 'arthrose',
     'REMPLACER_PAR_ID_BUNNY',
     NULL, 420, 1),

    (res2,
     'Exercices de stabilisation lombaire',
     'Programme d''exercices progressifs pour renforcer les muscles stabilisateurs du bas du dos.',
     'video', 'hernie_discale',
     'REMPLACER_PAR_ID_BUNNY',
     NULL, 780, 1),

    (res3,
     'Guide : vivre avec la douleur chronique',
     'Document PDF expliquant les stratégies de gestion de la douleur persistante au quotidien.',
     'pdf', 'douleurs_persistantes',
     NULL, NULL, NULL, 1),

    (res4,
     'La décompression discale SpineMED : comment ça fonctionne',
     'Vidéo explicative sur la technologie de décompression neuro-vertébrale utilisée à la clinique.',
     'video', 'hernie_discale',
     'REMPLACER_PAR_ID_BUNNY',
     NULL, 300, 2)
  ON CONFLICT DO NOTHING;

  -- Assignations : patient1 voit res1 + res3, patient2 voit res2 + res4
  INSERT INTO public.patient_resources (patient_id, resource_id, assigned_by) VALUES
    (patient1, res1, admin_id),
    (patient1, res3, admin_id),
    (patient2, res2, admin_id),
    (patient2, res4, admin_id)
  ON CONFLICT DO NOTHING;

END $$;
