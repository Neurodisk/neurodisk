-- ============================================================
-- 016 — Banque d'exercices Neurodisk (rachis cervical/dorsal/lombaire)
--   ~58 exercices cliniques avec consignes, dosage suggéré,
--   précautions et suggestion de média à filmer. Tagués par
--   condition avec les biais cliniques appropriés :
--     • Extension (McKenzie)  → hernie discale / radiculopathie
--     • Flexion / décompression → sténoses, spondylolisthésis
--     • Stabilisation sans hyperextension → spondylolyse/listhésis
--     • Neurodynamique → sciatique / radiculopathie
--   Idempotent : ignore un exercice si le titre existe déjà, et ne
--   tague que les conditions présentes dans la table conditions.
--
--   ⚠️ Suggestions à valider par le professionnel selon chaque
--   patient. Le dosage réel se règle à l'assignation (patient_exercises).
-- ============================================================

DO $$
DECLARE
  ex_id uuid;
  rec   record;
  cond  text;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES

    -- ════════ CERVICAL ════════
    ($d$Rétraction cervicale (double menton)$d$, $d$Consignes : assis bien droit, glissez la tête vers l'arrière en rentrant le menton (créez un « double menton ») sans baisser le regard. Maintenez 3 secondes puis relâchez. • Dosage suggéré : 10 répétitions, 3x/jour. • Précautions : mouvement lent et indolore, sans forcer. • À filmer : vue de profil montrant le recul horizontal de la tête.$d$, $d$Mobilité cervicale$d$, ARRAY['trousse_depart','arthrose_cervicale','radiculopathie']),

    ($d$Rotation cervicale active$d$, $d$Consignes : tête droite, tournez lentement vers une épaule jusqu'à une tension confortable, revenez au centre, puis de l'autre côté. • Dosage suggéré : 8 à 10 répétitions par côté, 2x/jour. • Précautions : rester dans l'amplitude sans douleur ni étourdissement. • À filmer : vue de face, amplitude de rotation des deux côtés.$d$, $d$Mobilité cervicale$d$, ARRAY['trousse_depart','arthrose_cervicale']),

    ($d$Inclinaison latérale cervicale$d$, $d$Consignes : approchez doucement l'oreille vers l'épaule sans monter l'épaule, revenez, puis changez de côté. • Dosage suggéré : 8 répétitions par côté, 2x/jour. • Précautions : épaules relâchées, mouvement contrôlé. • À filmer : vue de face, inclinaison symétrique.$d$, $d$Mobilité cervicale$d$, ARRAY['arthrose_cervicale']),

    ($d$Fléchisseurs profonds du cou (chin tuck couché)$d$, $d$Consignes : couché sur le dos, rentrez le menton pour aplatir l'arrière du cou contre le sol sans soulever la tête. Maintenez 5 à 10 secondes. • Dosage suggéré : 10 répétitions, 2x/jour. • Précautions : mouvement subtil, pas de poussée forte. • À filmer : vue de profil, léger acquiescement du menton.$d$, $d$Stabilisation cervicale$d$, ARRAY['arthrose_cervicale','radiculopathie']),

    ($d$Isométrie cervicale multidirectionnelle$d$, $d$Consignes : placez la main sur le front, poussez la tête contre la main SANS bouger (résistance), 5 secondes. Répétez sur les côtés et l'arrière. • Dosage suggéré : 5 secondes x 5 par direction, 1x/jour. • Précautions : contraction douce (30-50 %), aucune douleur. • À filmer : vue de face, main résistant au front et aux tempes.$d$, $d$Stabilisation cervicale$d$, ARRAY['arthrose_cervicale']),

    ($d$Étirement du trapèze supérieur$d$, $d$Consignes : assis, une main tient le siège, inclinez la tête du côté opposé en aidant doucement avec l'autre main. Maintenez 20 à 30 secondes. • Dosage suggéré : 2 à 3 fois par côté, 1 à 2x/jour. • Précautions : étirement doux, sans à-coups. • À filmer : vue de face, main guidant l'inclinaison.$d$, $d$Étirement cervical$d$, ARRAY['arthrose_cervicale']),

    ($d$Étirement de l'angulaire de l'omoplate$d$, $d$Consignes : tournez la tête à 45° vers l'aisselle et regardez vers le bas, aidez doucement avec la main. Maintenez 20 à 30 secondes. • Dosage suggéré : 2 à 3 fois par côté. • Précautions : tension confortable seulement. • À filmer : vue de 3/4, nez vers l'aisselle.$d$, $d$Étirement cervical$d$, ARRAY['arthrose_cervicale']),

    ($d$Rétraction scapulaire (serrer les omoplates)$d$, $d$Consignes : assis ou debout, serrez les omoplates vers l'arrière et le bas sans hausser les épaules. Maintenez 5 secondes. • Dosage suggéré : 10 à 15 répétitions, 2x/jour. • Précautions : ne pas cambrer le bas du dos. • À filmer : vue de dos, rapprochement des omoplates.$d$, $d$Renforcement scapulaire$d$, ARRAY['trousse_depart','arthrose_cervicale']),

    ($d$Renforcement scapulaire Y-T-W au mur$d$, $d$Consignes : dos au mur, bras formant un Y, puis un T, puis un W en gardant le contact des avant-bras au mur. • Dosage suggéré : 8 répétitions par position, 1x/jour. • Précautions : gardez le bas du dos neutre, pas de cambrure. • À filmer : vue de face au mur, les 3 positions.$d$, $d$Renforcement scapulaire$d$, ARRAY['arthrose_cervicale']),

    ($d$Glissement neural du nerf médian$d$, $d$Consignes : bras tendu sur le côté, paume vers le haut ; alternez extension du poignet + inclinaison de la tête du côté opposé, puis relâchez. Mouvement de va-et-vient (« flossing »). • Dosage suggéré : 10 allers-retours, 2x/jour. • Précautions : NE PAS aller dans la douleur ; glissement, pas étirement maintenu. • À filmer : vue de face, coordination bras/tête.$d$, $d$Neurodynamique$d$, ARRAY['radiculopathie']),

    ($d$Glissement neural du nerf cubital$d$, $d$Consignes : formez un « masque » avec le pouce et l'index près de l'œil, coude fléchi, puis éloignez doucement la main ; va-et-vient lent. • Dosage suggéré : 10 allers-retours, 2x/jour. • Précautions : amplitude sans fourmillement intense. • À filmer : vue de face, position « lunette » près du visage.$d$, $d$Neurodynamique$d$, ARRAY['radiculopathie']),

    -- ════════ DORSAL / POSTURE ════════
    ($d$Extension thoracique sur chaise$d$, $d$Consignes : assis, mains derrière la tête, cambrez doucement le haut du dos par-dessus le dossier de la chaise en inspirant. • Dosage suggéré : 8 à 10 répétitions, 2x/jour. • Précautions : le mouvement vient du milieu du dos, pas du bas du dos. • À filmer : vue de profil, ouverture thoracique.$d$, $d$Mobilité thoracique$d$, ARRAY['trousse_depart','arthrose_cervicale','arthrose_lombaire']),

    ($d$Rotation thoracique « livre ouvert »$d$, $d$Consignes : couché sur le côté, genoux fléchis, bras tendus joints devant ; ouvrez le bras du dessus vers l'arrière en suivant du regard, jusqu'à sentir le haut du dos tourner. • Dosage suggéré : 8 rotations par côté, 1x/jour. • Précautions : laissez les genoux ensemble, mouvement lent. • À filmer : vue du dessus/3-4, ouverture du bras.$d$, $d$Mobilité thoracique$d$, ARRAY['trousse_depart','arthrose_lombaire']),

    ($d$Étirement des pectoraux au cadre de porte$d$, $d$Consignes : avant-bras contre le cadre, coude à hauteur d'épaule, avancez un pas pour sentir l'étirement à l'avant de l'épaule. Maintenez 20 à 30 secondes. • Dosage suggéré : 2 à 3 fois par côté. • Précautions : pas de douleur à l'épaule. • À filmer : vue de profil dans le cadre de porte.$d$, $d$Étirement$d$, ARRAY['trousse_depart','arthrose_cervicale']),

    ($d$Chat-chameau (cat-camel)$d$, $d$Consignes : à quatre pattes, alternez lentement l'arrondi du dos (regard vers le nombril) et le creux (regard devant). • Dosage suggéré : 10 cycles lents, 2x/jour. • Précautions : amplitude confortable, sans forcer aux extrêmes. • À filmer : vue de profil, alternance arrondi/creux.$d$, $d$Mobilité du rachis$d$, ARRAY['trousse_depart','hernie_discale','arthrose_lombaire','sciatique']),

    -- ════════ LOMBAIRE — MOBILITÉ / FLEXION ════════
    ($d$Bascule du bassin (pelvic tilt)$d$, $d$Consignes : couché sur le dos, genoux fléchis, basculez le bassin pour plaquer le bas du dos au sol en contractant les abdominaux, puis relâchez. • Dosage suggéré : 12 répétitions, 2x/jour. • Précautions : mouvement doux, respiration continue. • À filmer : vue de profil, bascule du bassin.$d$, $d$Stabilisation lombaire$d$, ARRAY['trousse_depart','hernie_discale','arthrose_lombaire','spondylolisthesis','spondylolyse','stenose_spinale']),

    ($d$Genou-poitrine (une jambe)$d$, $d$Consignes : couché sur le dos, ramenez un genou vers la poitrine à deux mains, maintenez 20 à 30 secondes, changez de jambe. • Dosage suggéré : 2 à 3 fois par jambe. • Précautions : douleur permise nulle dans la jambe ; gardez l'autre pied au sol. • À filmer : vue de profil, genou ramené.$d$, $d$Mobilité lombaire (flexion)$d$, ARRAY['stenose_spinale','stenose_foraminale','arthrose_lombaire','spondylolisthesis','sciatique']),

    ($d$Double genou-poitrine$d$, $d$Consignes : couché sur le dos, ramenez les deux genoux vers la poitrine, bercez doucement. Maintenez 20 à 30 secondes. • Dosage suggéré : 3 fois, 1 à 2x/jour. • Précautions : à éviter si aggrave les symptômes ; privilégié pour les sténoses. • À filmer : vue de profil, flexion lombaire douce.$d$, $d$Mobilité lombaire (flexion)$d$, ARRAY['stenose_spinale','stenose_foraminale','arthrose_lombaire','spondylolisthesis']),

    ($d$Rotation lombaire douce en décubitus$d$, $d$Consignes : couché sur le dos, genoux fléchis et joints, laissez tomber lentement les genoux d'un côté puis de l'autre. • Dosage suggéré : 10 par côté, 2x/jour. • Précautions : amplitude indolore, épaules au sol. • À filmer : vue du dessus, genoux qui basculent.$d$, $d$Mobilité lombaire$d$, ARRAY['trousse_depart','arthrose_lombaire','hernie_discale']),

    ($d$Position de repos en flexion (posture de l'enfant)$d$, $d$Consignes : à genoux, asseyez les fesses vers les talons, bras tendus devant, front au sol ; respirez lentement. Maintenez 30 à 60 secondes. • Dosage suggéré : 2 à 3 fois, au besoin. • Précautions : adaptez avec un coussin sous les fesses si genoux sensibles. • À filmer : vue de profil, position repliée.$d$, $d$Décompression (flexion)$d$, ARRAY['stenose_spinale','stenose_foraminale','spondylolisthesis']),

    -- ════════ LOMBAIRE — EXTENSION (McKenzie) ════════
    ($d$Extension sur les coudes (sphinx)$d$, $d$Consignes : couché sur le ventre, appuyez-vous sur les avant-bras pour relever le tronc, bassin au sol, dos relâché. Maintenez 10 à 30 secondes. • Dosage suggéré : 8 à 10 répétitions, plusieurs fois/jour. • Précautions : recherchez la centralisation (douleur qui remonte vers le dos) ; arrêtez si la douleur descend dans la jambe. • À filmer : vue de profil, appui sur les coudes.$d$, $d$Extension (McKenzie)$d$, ARRAY['hernie_discale','radiculopathie']),

    ($d$Extension bras tendus (press-up McKenzie)$d$, $d$Consignes : couché sur le ventre, poussez sur les mains pour redresser le haut du corps en gardant le bassin et les jambes relâchés au sol. • Dosage suggéré : 10 répétitions, 1 set toutes les 2-3 heures en phase aiguë. • Précautions : pour hernie/radiculopathie seulement ; À ÉVITER en sténose et spondylolisthésis. • À filmer : vue de profil, extension lombaire bras tendus.$d$, $d$Extension (McKenzie)$d$, ARRAY['hernie_discale','radiculopathie']),

    ($d$Extension lombaire debout$d$, $d$Consignes : debout, mains dans le bas du dos, cambrez doucement vers l'arrière en regardant devant. • Dosage suggéré : 8 à 10 répétitions, au besoin après position assise prolongée. • Précautions : éviter en sténose/spondylolisthésis ; amplitude confortable. • À filmer : vue de profil, extension debout.$d$, $d$Extension (McKenzie)$d$, ARRAY['hernie_discale']),

    ($d$Décubitus ventral progressif (prone lying)$d$, $d$Consignes : couché sur le ventre, bras le long du corps, relâchez complètement 2 à 5 minutes (ajoutez un coussin sous la poitrine puis retirez-le pour progresser vers l'extension). • Dosage suggéré : 1 à 2 fois/jour. • Précautions : respiration calme, aucune douleur irradiante. • À filmer : vue de profil, position détendue.$d$, $d$Extension douce$d$, ARRAY['hernie_discale']),

    -- ════════ STABILISATION / GAINAGE ════════
    ($d$Activation du transverse (abdominal hollowing)$d$, $d$Consignes : couché sur le dos genoux fléchis, rentrez doucement le nombril vers la colonne sans bouger le bassin ni retenir votre souffle. Maintenez 10 secondes. • Dosage suggéré : 10 répétitions, 2x/jour. • Précautions : contraction légère (« 20 % »), continuez à respirer. • À filmer : vue rapprochée du ventre, légère rentrée.$d$, $d$Stabilisation lombaire$d$, ARRAY['trousse_depart','hernie_discale','spondylolyse','spondylolisthesis','arthrose_lombaire','stenose_spinale']),

    ($d$Bug mort (dead bug)$d$, $d$Consignes : sur le dos, hanches et genoux à 90°, bas du dos plaqué au sol ; descendez lentement un bras et la jambe opposée, revenez, alternez. • Dosage suggéré : 8 à 10 par côté, 2 séries. • Précautions : le bas du dos ne doit pas se creuser ; réduisez l'amplitude si besoin. • À filmer : vue de profil, mouvements croisés contrôlés.$d$, $d$Stabilisation lombaire$d$, ARRAY['hernie_discale','spondylolyse','spondylolisthesis','arthrose_lombaire']),

    ($d$Pont fessier (glute bridge)$d$, $d$Consignes : sur le dos, genoux fléchis, soulevez le bassin en serrant les fessiers jusqu'à aligner épaules-hanches-genoux, sans cambrer. Maintenez 3 à 5 secondes. • Dosage suggéré : 10 à 12 répétitions, 2 séries. • Précautions : poussez par les fessiers, pas par le bas du dos. • À filmer : vue de profil, alignement en haut du pont.$d$, $d$Renforcement fessiers$d$, ARRAY['trousse_depart','hernie_discale','arthrose_lombaire','spondylolisthesis','stenose_spinale']),

    ($d$Pont fessier sur une jambe$d$, $d$Consignes : en position de pont, tendez une jambe et maintenez le bassin de niveau, sans rotation. • Dosage suggéré : 6 à 8 par jambe, 2 séries. • Précautions : progression du pont classique ; gardez le bassin stable. • À filmer : vue de profil/3-4, bassin de niveau.$d$, $d$Renforcement fessiers$d$, ARRAY['arthrose_lombaire','spondylolisthesis']),

    ($d$Chien d'arrêt (bird-dog)$d$, $d$Consignes : à quatre pattes, dos neutre, tendez simultanément un bras et la jambe opposée à l'horizontale sans cambrer, revenez, alternez. • Dosage suggéré : 8 à 10 par côté, 2 séries. • Précautions : gardez le bassin immobile, ne montez pas la jambe trop haut. • À filmer : vue de profil, alignement bras-tronc-jambe.$d$, $d$Stabilisation lombaire$d$, ARRAY['hernie_discale','spondylolyse','spondylolisthesis','arthrose_lombaire']),

    ($d$Curl-up de McGill$d$, $d$Consignes : sur le dos, une jambe fléchie une tendue, mains sous le creux lombaire ; soulevez à peine la tête et les épaules sans aplatir le dos. Maintenez 8 à 10 secondes. • Dosage suggéré : 5 à 6 répétitions, 2 séries. • Précautions : ne pas rentrer le menton ni tirer sur la nuque. • À filmer : vue de profil, faible décollement des épaules.$d$, $d$Gainage$d$, ARRAY['hernie_discale','spondylolyse','spondylolisthesis']),

    ($d$Planche ventrale (gainage)$d$, $d$Consignes : appui sur les avant-bras et les orteils (ou genoux pour débuter), corps gréé en ligne, abdominaux et fessiers serrés. Maintenez 10 à 30 secondes. • Dosage suggéré : 3 à 5 répétitions. • Précautions : ne pas creuser le bas du dos ; version sur genoux si douleur. • À filmer : vue de profil, alignement tête-bassin-talons.$d$, $d$Gainage$d$, ARRAY['spondylolyse','spondylolisthesis','arthrose_lombaire']),

    ($d$Planche latérale (side plank)$d$, $d$Consignes : sur le côté, appui sur l'avant-bras (genoux fléchis pour débuter), soulevez le bassin en ligne droite. Maintenez 10 à 20 secondes par côté. • Dosage suggéré : 3 répétitions par côté. • Précautions : épaule au-dessus du coude, pas d'affaissement du bassin. • À filmer : vue de face/profil, alignement latéral.$d$, $d$Gainage$d$, ARRAY['hernie_discale','spondylolyse','spondylolisthesis','arthrose_lombaire']),

    ($d$Apprentissage du « hip hinge » (charnière de hanche)$d$, $d$Consignes : debout, un bâton le long du dos (touche tête/dos/sacrum) ; reculez les hanches en gardant le dos neutre, genoux légèrement fléchis. • Dosage suggéré : 10 répétitions, 2x/jour. • Précautions : le mouvement vient des hanches, le dos reste droit. • À filmer : vue de profil, contact du bâton maintenu.$d$, $d$Contrôle moteur$d$, ARRAY['trousse_depart','hernie_discale','arthrose_lombaire','spondylolisthesis']),

    ($d$Auto-grandissement et posture neutre$d$, $d$Consignes : debout, grandissez-vous comme tiré par le sommet du crâne, bassin neutre, épaules basses ; tenez la posture en respirant. • Dosage suggéré : 5 fois 20 à 30 secondes/jour. • Précautions : aucune ; intégrer dans les activités quotidiennes. • À filmer : vue de profil, posture alignée.$d$, $d$Contrôle postural$d$, ARRAY['trousse_depart','spondylolisthesis','arthrose_lombaire']),

    -- ════════ HANCHES / FESSIERS ════════
    ($d$Coquille (clamshell)$d$, $d$Consignes : couché sur le côté, hanches et genoux fléchis, talons joints ; ouvrez le genou du dessus en gardant le bassin immobile. • Dosage suggéré : 12 à 15 par côté, 2 séries. • Précautions : pas de bascule du bassin vers l'arrière. • À filmer : vue de face, ouverture du genou.$d$, $d$Renforcement fessier moyen$d$, ARRAY['trousse_depart','sciatique','arthrose_lombaire','hernie_discale']),

    ($d$Abduction de hanche en décubitus latéral$d$, $d$Consignes : couché sur le côté, jambe du dessus tendue, montez-la lentement vers le plafond puis redescendez avec contrôle. • Dosage suggéré : 12 par côté, 2 séries. • Précautions : ne pas rouler le bassin vers l'arrière. • À filmer : vue de face, montée contrôlée de la jambe.$d$, $d$Renforcement fessier$d$, ARRAY['sciatique','arthrose_lombaire']),

    ($d$Extension de hanche debout$d$, $d$Consignes : debout, appui sur une chaise, reculez une jambe tendue en serrant le fessier, sans cambrer le bas du dos. • Dosage suggéré : 12 par côté, 2 séries. • Précautions : tronc droit, le mouvement vient de la hanche. • À filmer : vue de profil, recul de la jambe.$d$, $d$Renforcement fessier$d$, ARRAY['arthrose_lombaire','stenose_spinale']),

    ($d$Marche latérale avec élastique (monster walk)$d$, $d$Consignes : élastique aux chevilles ou genoux, demi-squat, faites des pas latéraux contrôlés en gardant tension constante. • Dosage suggéré : 10 pas par direction, 2 séries. • Précautions : genoux alignés avec les orteils, dos neutre. • À filmer : vue de face, pas latéraux.$d$, $d$Renforcement fessier$d$, ARRAY['arthrose_lombaire']),

    -- ════════ MEMBRES INFÉRIEURS / FONCTIONNEL ════════
    ($d$Squat partiel au mur (wall sit)$d$, $d$Consignes : dos au mur, glissez jusqu'à une légère flexion des genoux (max 60°), maintenez en gardant le dos appuyé. • Dosage suggéré : 5 maintiens de 10 à 20 secondes. • Précautions : genoux derrière les orteils, aucune douleur. • À filmer : vue de profil, position assise au mur.$d$, $d$Renforcement quadriceps$d$, ARRAY['trousse_depart','arthrose_lombaire','stenose_spinale']),

    ($d$Transfert assis-debout contrôlé$d$, $d$Consignes : depuis une chaise, penchez le tronc vers l'avant (hanches) et levez-vous sans élan, redescendez avec contrôle. • Dosage suggéré : 8 à 10 répétitions, 2 séries. • Précautions : utilisez les jambes, pas le dos ; appui des mains si besoin. • À filmer : vue de profil, lever et descente.$d$, $d$Fonctionnel$d$, ARRAY['trousse_depart','stenose_spinale','arthrose_lombaire']),

    ($d$Fente avant contrôlée$d$, $d$Consignes : un grand pas en avant, descendez le genou arrière vers le sol en gardant le tronc droit, poussez pour revenir. • Dosage suggéré : 8 par jambe, 2 séries. • Précautions : genou avant aligné, amplitude selon le confort. • À filmer : vue de profil, descente verticale.$d$, $d$Renforcement membres inférieurs$d$, ARRAY['arthrose_lombaire']),

    ($d$Équilibre sur une jambe$d$, $d$Consignes : tenez-vous sur une jambe près d'un appui, gardez le bassin de niveau ; progressez en fermant les yeux. • Dosage suggéré : 3 maintiens de 20 à 30 secondes par jambe. • Précautions : appui à proximité pour la sécurité. • À filmer : vue de face, équilibre stable.$d$, $d$Proprioception$d$, ARRAY['trousse_depart','arthrose_lombaire','stenose_spinale']),

    -- ════════ ÉTIREMENTS MEMBRES INFÉRIEURS ════════
    ($d$Étirement des ischio-jambiers (sangle)$d$, $d$Consignes : couché sur le dos, une sangle au pied, tendez la jambe vers le plafond jusqu'à une tension à l'arrière de la cuisse. Maintenez 30 secondes. • Dosage suggéré : 2 à 3 fois par jambe. • Précautions : gardez l'autre genou fléchi, dos au sol ; arrêtez si fourmillements dans la jambe. • À filmer : vue de profil, jambe tendue avec sangle.$d$, $d$Étirement$d$, ARRAY['trousse_depart','sciatique','stenose_foraminale','arthrose_lombaire']),

    ($d$Étirement du piriforme (figure 4)$d$, $d$Consignes : couché sur le dos, croisez une cheville sur le genou opposé et tirez la cuisse vers vous jusqu'à sentir l'étirement dans la fesse. Maintenez 30 secondes. • Dosage suggéré : 2 à 3 fois par côté. • Précautions : étirement dans la fesse, pas de douleur lombaire. • À filmer : vue de profil, position en « 4 ».$d$, $d$Étirement$d$, ARRAY['sciatique','radiculopathie']),

    ($d$Étirement des fléchisseurs de hanche (fente)$d$, $d$Consignes : en fente genou arrière au sol, avancez doucement le bassin en serrant le fessier arrière, tronc droit. Maintenez 30 secondes. • Dosage suggéré : 2 fois par côté. • Précautions : ne PAS cambrer le bas du dos ; gardez les abdominaux engagés. • À filmer : vue de profil, bassin en rétroversion.$d$, $d$Étirement$d$, ARRAY['arthrose_lombaire','trousse_depart']),

    ($d$Étirement du quadriceps debout$d$, $d$Consignes : debout avec appui, attrapez la cheville et ramenez le talon vers la fesse, genoux côte à côte. Maintenez 30 secondes. • Dosage suggéré : 2 fois par côté. • Précautions : bassin neutre, ne pas cambrer. • À filmer : vue de profil, talon vers la fesse.$d$, $d$Étirement$d$, ARRAY['arthrose_lombaire','trousse_depart']),

    ($d$Étirement fessier genou croisé$d$, $d$Consignes : assis ou couché, ramenez le genou vers l'épaule opposée jusqu'à une tension dans la fesse. Maintenez 30 secondes. • Dosage suggéré : 2 fois par côté. • Précautions : étirement confortable, sans à-coups. • À filmer : vue de profil, genou vers l'épaule opposée.$d$, $d$Étirement$d$, ARRAY['sciatique','arthrose_lombaire']),

    ($d$Étirement de la chaîne postérieure (flexion debout douce)$d$, $d$Consignes : debout, penchez-vous lentement vers l'avant en déroulant le dos, descendez selon le confort, remontez en déroulant. • Dosage suggéré : 6 à 8 répétitions lentes. • Précautions : privilégié pour les sténoses ; éviter en phase aiguë de hernie. • À filmer : vue de profil, flexion progressive.$d$, $d$Étirement$d$, ARRAY['stenose_spinale','arthrose_lombaire']),

    -- ════════ NEURODYNAMIQUE — SCIATIQUE ════════
    ($d$Glissement neural du sciatique (assis)$d$, $d$Consignes : assis, tendez le genou en relevant la tête, puis fléchissez le genou en baissant le menton ; va-et-vient fluide (« flossing »). • Dosage suggéré : 10 à 15 allers-retours, 2 à 3x/jour. • Précautions : glissement sans douleur, ne pas maintenir en tension. • À filmer : vue de profil, coordination genou/tête.$d$, $d$Neurodynamique$d$, ARRAY['sciatique','radiculopathie','stenose_foraminale']),

    ($d$Mise en tension neurale douce (SLR actif)$d$, $d$Consignes : couché sur le dos, montez lentement la jambe tendue jusqu'au premier signe de tension dans l'arrière de la jambe, redescendez. • Dosage suggéré : 10 répétitions douces, 1 à 2x/jour. • Précautions : rester sous le seuil de douleur ; mouvement, pas étirement maintenu. • À filmer : vue de profil, montée de la jambe tendue.$d$, $d$Neurodynamique$d$, ARRAY['sciatique','radiculopathie']),

    -- ════════ AÉROBIE / RESPIRATION ════════
    ($d$Marche progressive$d$, $d$Consignes : marchez à allure confortable en augmentant graduellement la durée (ex. +2 minutes par semaine). • Dosage suggéré : 15 à 30 minutes, la plupart des jours. • Précautions : en sténose, de courtes marches répétées et une légère flexion (canne, chariot) soulagent. • À filmer : non requis (consigne de marche).$d$, $d$Aérobie$d$, ARRAY['trousse_depart','stenose_spinale','arthrose_lombaire','hernie_discale','spondylolisthesis']),

    ($d$Vélo stationnaire (légèrement penché)$d$, $d$Consignes : pédalez à intensité modérée, tronc légèrement incliné vers l'avant (position de flexion confortable). • Dosage suggéré : 10 à 20 minutes, 3 à 5x/semaine. • Précautions : excellente option en sténose (flexion soulage) ; réglez la selle pour le confort. • À filmer : non requis.$d$, $d$Aérobie$d$, ARRAY['stenose_spinale','stenose_foraminale','arthrose_lombaire']),

    ($d$Aquaforme / marche en piscine$d$, $d$Consignes : marchez et mobilisez dans l'eau à hauteur de poitrine ; la flottabilité réduit la charge sur le rachis. • Dosage suggéré : 20 à 30 minutes, 2 à 3x/semaine. • Précautions : douce pour toutes les conditions, idéale en phase de reprise. • À filmer : non requis.$d$, $d$Aérobie$d$, ARRAY['trousse_depart','arthrose_lombaire','arthrose_cervicale','stenose_spinale']),

    ($d$Respiration diaphragmatique$d$, $d$Consignes : couché ou assis, une main sur le ventre, inspirez par le nez en gonflant le ventre, expirez lentement par la bouche. • Dosage suggéré : 5 minutes, 1 à 2x/jour. • Précautions : aide à relâcher les tensions et à gérer la douleur. • À filmer : vue rapprochée du ventre qui se soulève.$d$, $d$Contrôle / détente$d$, ARRAY['trousse_depart','hernie_discale','sciatique']),

    ($d$Renforcement doux des extenseurs lombaires$d$, $d$Consignes : couché sur le ventre, soulevez SEULEMENT les bras (puis une jambe en progression) en gardant le regard au sol, sans hyperextension. • Dosage suggéré : 8 à 10 répétitions, 2 séries. • Précautions : amplitude modérée ; À ÉVITER en spondylolisthésis et sténose. • À filmer : vue de profil, léger décollement des bras.$d$, $d$Renforcement lombaire$d$, ARRAY['arthrose_lombaire'])

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
