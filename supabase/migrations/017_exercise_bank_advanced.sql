-- ============================================================
-- 017 — Banque d'exercices Neurodisk — 2e vague (AVANCÉ)
--   Phase de retour à l'activité/sport : mise en charge progressive,
--   ports de charge, gainage avancé, pliométrie douce, retour à la
--   course et au sport. ~22 exercices.
--
--   ⚠️ PRÉREQUIS pour tous : feu vert clinique, absence de douleur
--   irradiante, maîtrise des exercices de base (migration 016),
--   force et amplitude complètes. À individualiser et superviser.
--
--   BASE PROBANTE (voir docs/exercices-base-probante.md) :
--     • Entraînement en résistance de la chaîne postérieure :
--       preuve FORTE, effet modéré sur la lombalgie chronique (12-16 sem).
--     • Mise en charge progressive (chargée ou non) efficace et sûre
--       si progressée adéquatement ; le VOLUME et la régularité priment
--       sur l'intensité brute.
--     • Retour au sport = CRITÈRES (sans douleur, neuro intact, force
--       et amplitude complètes) + progression graduée sport-spécifique.
--     • Pliométrie en réadaptation lombaire : preuve LIMITÉE → optionnel,
--       fin de parcours, faible amplitude, bien progressé.
--   Biais cliniques conservés : éviter hyperextension/impact en
--   spondylolyse/spondylolisthésis ; charges en colonne neutre.
--
--   Idempotent : ignore les titres existants, ne tague que les
--   conditions présentes.
-- ============================================================

DO $$
DECLARE
  ex_id uuid;
  rec   record;
  cond  text;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES

    -- ════════ MISE EN CHARGE PROGRESSIVE ════════
    ($d$Charnière de hanche chargée (RDL léger)$d$, $d$Niveau avancé. Consignes : debout, haltères ou kettlebell devant les cuisses, reculez les hanches en gardant le dos neutre et les genoux légèrement fléchis, descendez la charge le long des jambes jusqu'à mi-tibia, revenez en serrant les fessiers. • Dosage suggéré : 3 séries de 8 à 10, 2x/semaine, charge progressive. • Précautions : colonne NEUTRE en tout temps (pas d'arrondi ni d'hyperextension) ; débuter léger. • À filmer : vue de profil, dos neutre maintenu.$d$, $d$Mise en charge progressive$d$, ARRAY['hernie_discale','arthrose_lombaire','spondylolisthesis']),

    ($d$Squat gobelet (goblet squat)$d$, $d$Niveau avancé. Consignes : tenez une charge contre la poitrine, descendez en squat (hanches vers l'arrière et le bas) jusqu'au confort, talons au sol, remontez. • Dosage suggéré : 3 séries de 8 à 12, 2x/semaine. • Précautions : profondeur selon le confort, tronc gainé ; option flexion légère bien tolérée en sténose. • À filmer : vue de profil, descente contrôlée.$d$, $d$Mise en charge progressive$d$, ARRAY['arthrose_lombaire','hernie_discale','stenose_spinale']),

    ($d$Soulevé de terre roumain (chaîne postérieure)$d$, $d$Niveau avancé. Consignes : barre/haltères, charnière de hanche stricte, dos neutre, descente jusqu'à tension des ischio-jambiers, remontée par les hanches. • Dosage suggéré : 3 séries de 6 à 10, charge progressive. • Précautions : entraînement de la chaîne postérieure à preuve forte ; maîtriser d'abord la charnière sans charge. • À filmer : vue de profil, neutralité du dos.$d$, $d$Mise en charge progressive$d$, ARRAY['arthrose_lombaire','hernie_discale']),

    ($d$Pont fessier chargé / hip thrust$d$, $d$Niveau avancé. Consignes : haut du dos appuyé sur un banc, charge sur les hanches, poussez le bassin vers le haut en serrant les fessiers, sans cambrer le bas du dos. • Dosage suggéré : 3 séries de 10 à 12. • Précautions : terminez en colonne neutre (pas d'hyperextension lombaire). • À filmer : vue de profil, extension de hanche sans cambrure.$d$, $d$Mise en charge progressive$d$, ARRAY['arthrose_lombaire','hernie_discale','spondylolisthesis']),

    ($d$Fente arrière chargée$d$, $d$Niveau avancé. Consignes : haltères aux mains, grand pas vers l'arrière, descendez le genou vers le sol, tronc droit, poussez pour revenir. • Dosage suggéré : 3 séries de 8 par jambe. • Précautions : équilibre maîtrisé d'abord au poids du corps. • À filmer : vue de profil, descente verticale.$d$, $d$Mise en charge progressive$d$, ARRAY['arthrose_lombaire']),

    ($d$Montée sur step chargée$d$, $d$Niveau avancé. Consignes : haltères aux mains, montez sur une marche/box en poussant par le talon, redescendez avec contrôle. • Dosage suggéré : 3 séries de 8 à 10 par jambe. • Précautions : hauteur selon le confort, genou aligné. • À filmer : vue de profil, montée contrôlée.$d$, $d$Mise en charge progressive$d$, ARRAY['arthrose_lombaire','stenose_spinale']),

    ($d$Tirage horizontal (rowing)$d$, $d$Niveau avancé. Consignes : élastique ou haltère, tirez les coudes vers l'arrière en serrant les omoplates, tronc gainé et stable. • Dosage suggéré : 3 séries de 10 à 12. • Précautions : ne pas compenser par le bas du dos ; renforce la chaîne dorsale (utile aussi en cervicalgie). • À filmer : vue de profil, tronc immobile.$d$, $d$Mise en charge progressive$d$, ARRAY['arthrose_lombaire','arthrose_cervicale','hernie_discale']),

    ($d$Soulevé de terre conventionnel (progression)$d$, $d$Niveau avancé. Consignes : progression de force avec barre, prise de la charge au sol en colonne neutre, extension simultanée hanches/genoux. • Dosage suggéré : 3 à 4 séries de 5, charge progressive selon tolérance. • Précautions : réservé aux patients bien réadaptés ; technique parfaite avant d'augmenter la charge. • À filmer : vue de profil, dos neutre du début à la fin.$d$, $d$Mise en charge progressive$d$, ARRAY['arthrose_lombaire','hernie_discale']),

    -- ════════ GAINAGE / PORTS DE CHARGE AVANCÉS ════════
    ($d$Pallof press (anti-rotation)$d$, $d$Niveau avancé. Consignes : élastique ancré sur le côté à hauteur de poitrine, poussez les mains droit devant en résistant à la rotation, revenez. • Dosage suggéré : 3 séries de 8 à 10 par côté. • Précautions : tronc gainé, bassin immobile ; excellent pour la stabilité (spondylo). • À filmer : vue de face, résistance à la rotation.$d$, $d$Gainage avancé$d$, ARRAY['hernie_discale','spondylolyse','spondylolisthesis','arthrose_lombaire']),

    ($d$Port de charge fermier (farmer carry)$d$, $d$Niveau avancé. Consignes : une charge dans chaque main, marchez droit et gainé sur 15 à 30 m, épaules basses. • Dosage suggéré : 3 à 4 trajets. • Précautions : posture grandie, colonne neutre. • À filmer : vue de face, marche stable et chargée.$d$, $d$Gainage avancé$d$, ARRAY['arthrose_lombaire','hernie_discale','spondylolisthesis']),

    ($d$Port unilatéral (suitcase carry)$d$, $d$Niveau avancé. Consignes : une seule charge d'un côté, marchez sans vous incliner (anti-inclinaison latérale), gainage des obliques. • Dosage suggéré : 3 trajets par côté. • Précautions : rester parfaitement droit, ne pas pencher. • À filmer : vue de face, tronc vertical malgré la charge.$d$, $d$Gainage avancé$d$, ARRAY['arthrose_lombaire','spondylolyse','spondylolisthesis']),

    ($d$Planche dynamique (touches d'épaule)$d$, $d$Niveau avancé. Consignes : en position de planche, touchez alternativement l'épaule opposée en gardant le bassin parfaitement immobile. • Dosage suggéré : 3 séries de 10 touches par côté. • Précautions : aucune rotation du bassin ; régresser sur les genoux au besoin. • À filmer : vue de face, bassin stable.$d$, $d$Gainage avancé$d$, ARRAY['spondylolyse','spondylolisthesis','arthrose_lombaire']),

    -- ════════ PLIOMÉTRIE DOUCE (optionnel, preuve limitée) ════════
    ($d$Petits sauts sur place (pogo)$d$, $d$Niveau avancé — optionnel (preuve limitée). Consignes : petits sauts de faible amplitude sur l'avant-pied, genoux souples, réceptions silencieuses. • Dosage suggéré : 3 séries de 15 à 20 secondes. • Précautions : introduire seulement en fin de réadaptation, sans douleur ; éviter en spondylolyse active et sténose symptomatique. • À filmer : vue de profil, réceptions amorties.$d$, $d$Pliométrie douce$d$, ARRAY['arthrose_lombaire','hernie_discale']),

    ($d$Saut et réception contrôlée (land & stick)$d$, $d$Niveau avancé — optionnel. Consignes : sautez d'une faible hauteur (ou sur place) et figez la réception 2 secondes, genoux fléchis, tronc gainé. • Dosage suggéré : 3 séries de 5 à 6. • Précautions : qualité de réception avant la hauteur ; absorber par les hanches/genoux. • À filmer : vue de profil, réception stable et figée.$d$, $d$Pliométrie douce$d$, ARRAY['arthrose_lombaire','hernie_discale']),

    ($d$Sauts latéraux doux$d$, $d$Niveau avancé — optionnel. Consignes : petits sauts latéraux d'un pied à l'autre, réceptions contrôlées, amplitude progressive. • Dosage suggéré : 3 séries de 20 secondes. • Précautions : surface non glissante, sans douleur. • À filmer : vue de face, déplacements latéraux maîtrisés.$d$, $d$Pliométrie douce$d$, ARRAY['arthrose_lombaire']),

    ($d$Lancer de ballon lesté au sol (slam)$d$, $d$Niveau avancé — optionnel. Consignes : ballon lesté léger au-dessus de la tête, lancez-le au sol avec puissance en expirant, ramassez et répétez. • Dosage suggéré : 3 séries de 8 à 10. • Précautions : charge légère, mouvement fluide ; éviter l'hyperextension à l'armé. • À filmer : vue de profil, geste complet.$d$, $d$Pliométrie douce$d$, ARRAY['arthrose_lombaire','hernie_discale']),

    ($d$Lancer rotatif au mur (médecine-ball)$d$, $d$Niveau avancé — optionnel. Consignes : de côté face à un mur, lancez le ballon en pivotant par les hanches (pas par le bas du dos), réceptionnez. • Dosage suggéré : 3 séries de 8 par côté. • Précautions : la puissance vient des hanches ; tronc gainé. • À filmer : vue du dessus/3-4, rotation par les hanches.$d$, $d$Pliométrie douce$d$, ARRAY['arthrose_lombaire','hernie_discale']),

    -- ════════ RETOUR À LA COURSE / AU SPORT ════════
    ($d$Programme de retour à la course (marche-course)$d$, $d$Niveau avancé. Consignes : alternez intervalles de marche et de course (ex. 1 min course / 2 min marche), augmentez graduellement la part de course chaque semaine selon la tolérance. • Dosage suggéré : 2 à 3 séances/semaine, progression de ~10 %/semaine. • Précautions : aucune douleur pendant ni le lendemain ; reculer d'un palier si symptômes. • À filmer : non requis.$d$, $d$Retour à la course$d$, ARRAY['arthrose_lombaire','hernie_discale']),

    ($d$Changements de direction contrôlés (agilité)$d$, $d$Niveau avancé. Consignes : décélérations et changements de direction progressifs (cônes), d'abord lents puis plus rapides, en gardant le tronc gainé. • Dosage suggéré : 3 à 5 répétitions par patron, 1 à 2x/semaine. • Précautions : qualité avant la vitesse ; introduire après la maîtrise de la course. • À filmer : vue de face, décélérations maîtrisées.$d$, $d$Retour au sport$d$, ARRAY['arthrose_lombaire']),

    ($d$Réintégration sport-spécifique (exposition graduée)$d$, $d$Niveau avancé. Consignes : reproduire progressivement les gestes du sport (volume, vitesse, contacts) par paliers, en respectant la tolérance et la récupération. • Dosage suggéré : progression individualisée par le professionnel. • Précautions : en spondylolyse/spondylolisthésis, réintroduire l'extension et l'impact très progressivement et tardivement. • À filmer : selon le sport.$d$, $d$Retour au sport$d$, ARRAY['arthrose_lombaire','hernie_discale','spondylolyse','spondylolisthesis']),

    ($d$Critères de retour au sport (liste de vérification)$d$, $d$Niveau avancé — repère clinique. Critères avant la reprise : absence de douleur au repos et à l'effort, examen neurologique normal, force et amplitude complètes et symétriques, contrôle moteur et tests fonctionnels réussis, progression graduée tolérée. • Précautions : reprise par paliers, pas tout d'un coup ; reculer si réapparition des symptômes. • À filmer : non requis (outil de décision).$d$, $d$Retour au sport$d$, ARRAY['hernie_discale','spondylolyse','spondylolisthesis','arthrose_lombaire'])

    ) AS t(title, descr, muscle, conds)
  LOOP
    IF EXISTS (SELECT 1 FROM public.exercises WHERE title = rec.title) THEN
      CONTINUE;
    END IF;
    INSERT INTO public.exercises (title, description, muscle_group)
      VALUES (rec.title, rec.descr, rec.muscle)
      RETURNING id INTO ex_id;
    FOREACH cond IN ARRAY rec.conds LOOP
      IF EXISTS (SELECT 1 FROM public.conditions WHERE id = cond) THEN
        INSERT INTO public.exercise_conditions (exercise_id, condition_id)
          VALUES (ex_id, cond);
      END IF;
    END LOOP;
  END LOOP;
END $$;
