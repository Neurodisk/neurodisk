// ============================================================
// Définitions des instruments d'évaluation — questionnaire initial
// + réévaluations. Module Neurodisk (§5) = contenu original, codé
// tel quel. QBPDS et STarT Back = structure + scoring officiels,
// texte des items en PLACEHOLDER (droits d'auteur — à remplir avec
// les versions françaises validées avant mise en production).
// ============================================================

const PH = '[[ITEM OFFICIEL FR À INSÉRER]]';

// ---- Module Neurodisk (tronc commun, §5) -------------------
export const NEURODISK_CORE = {
  code: 'neurodisk_core',
  name: 'Module Neurodisk',

  // §5.6 — dépistage sécurité, affiché en premier, court-circuite si positif
  redFlags: [
    { key: 'rf_cauda',    label: 'Perte de contrôle de la vessie ou des intestins, ou engourdissement génital/périnéal' },
    { key: 'rf_weakness', label: 'Faiblesse qui s’aggrave rapidement dans une jambe ou les deux' },
    { key: 'rf_cancer',   label: 'Fièvre, perte de poids inexpliquée, ou antécédent de cancer avec une nouvelle douleur' },
    { key: 'rf_trauma',   label: 'Traumatisme important récent (chute, accident)' },
    { key: 'rf_night',    label: 'Douleur nocturne constante, non soulagée par aucune position' },
  ],

  // §5.1 — douleur (EVA 0-10)
  pain: [
    { key: 'pain_now',      label: 'Douleur au dos / au cou en ce moment', min: 0, max: 10 },
    { key: 'pain_avg7',     label: 'Douleur moyenne des 7 derniers jours', min: 0, max: 10 },
    { key: 'pain_worst7',   label: 'Douleur au pire des 7 derniers jours', min: 0, max: 10 },
    { key: 'pain_radiating',label: 'Douleur qui descend dans la jambe / le bras, intensité actuelle', min: 0, max: 10 },
  ],

  // §5.2 — localisation et irradiation
  location: [
    { key: 'loc_spine',       type: 'check', label: 'Douleur centrée sur la colonne (dos / cou)' },
    { key: 'loc_leg_glute',   type: 'check', label: 'Irradiation fesse / cuisse / sous le genou / pied' },
    { key: 'loc_arm',         type: 'check', label: 'Irradiation épaule / bras / avant-bras / main' },
    { key: 'loc_numb_where',  type: 'text',  label: 'Engourdissements ou picotements — où ?' },
    { key: 'loc_weakness',    type: 'check', label: 'Sensation de faiblesse dans un membre' },
  ],

  // §5.3 — déclencheurs et provocations (échelle 0-4 partagée)
  triggerScale: [
    { value: 0, label: 'Pas du tout' },
    { value: 1, label: 'Un peu' },
    { value: 2, label: 'Modérément' },
    { value: 3, label: 'Beaucoup' },
    { value: 4, label: 'Impossible à faire' },
  ],
  triggers: {
    A: { title: 'Provocations par pression', items: [
      { key: 'trig_cough',  label: 'Quand vous toussez' },
      { key: 'trig_sneeze', label: 'Quand vous éternuez' },
      { key: 'trig_strain', label: 'Quand vous forcez (selle, ou soulever en retenant votre souffle)' },
    ]},
    B: { title: 'Gestes du quotidien', items: [
      { key: 'trig_getup_bed',   label: 'Vous lever du lit le matin' },
      { key: 'trig_getup_chair', label: 'Vous lever d’une chaise après être resté assis' },
      { key: 'trig_bend_shoes',  label: 'Vous pencher pour attacher vos souliers / ramasser un objet' },
      { key: 'trig_dress',       label: 'Enfiler bas et pantalons' },
      { key: 'trig_car',         label: 'Entrer et sortir de l’auto' },
      { key: 'trig_lift_bag',    label: 'Sortir un objet du coffre / soulever un sac d’épicerie' },
    ]},
    C: { title: 'Positions soutenues', items: [
      { key: 'trig_sit_long',    label: 'Rester assis longtemps' },
      { key: 'trig_stand_long',  label: 'Rester debout immobile longtemps' },
      { key: 'trig_extension',   label: 'Se pencher vers l’arrière (extension)' },
      { key: 'trig_stairs',      label: 'Monter / descendre escaliers ou une pente' },
    ]},
    D: { title: 'Nuit et repos', items: [
      { key: 'trig_wakes_night', label: 'La douleur vous réveille-t-elle la nuit ?', scale: ['Jamais', 'Parfois', 'Souvent'] },
      { key: 'trig_morning_stiff', label: 'Raideur matinale au lever', scale: ['< 30 min', '> 30 min'] },
    ]},
  },
  // Marche + patron directionnel (dérivé côté clinicien, pas affiché au patient)
  walkingAndPattern: [
    { key: 'walk_minutes',      type: 'number', label: 'Marche : après combien de minutes la douleur apparaît-elle ?' },
    { key: 'relief_sit_flex',   type: 'yesno',  label: 'La douleur de jambe diminue-t-elle quand vous vous assoyez ou vous penchez vers l’avant ?' },
  ],
  sleep: [
    { key: 'sleep_worse_pos', type: 'text', label: 'Position pour dormir qui aggrave' },
    { key: 'sleep_better_pos', type: 'text', label: 'Position pour dormir qui soulage' },
  ],

  // §5.5 — impression globale de changement (réévaluations seulement)
  pgic: {
    key: 'pgic', followupOnly: true,
    label: 'Depuis le début de vos traitements, votre état est :',
    options: ['Beaucoup mieux', 'Mieux', 'Un peu mieux', 'Inchangé', 'Un peu pire', 'Pire', 'Beaucoup pire'],
  },
};

// ---- QBPDS — Échelle de Québec (lombaire) ------------------
// Version française officielle adaptée (WorkSafeNB, 2006-08-03),
// modifiée de The Québec Back Pain Disability Scale (Kopec et al.,
// Spine 1995;20(3):341-352). Échelle de réponse partagée par les 20 items.
export const QBPDS = {
  code: 'qbpds', name: 'Échelle de Québec (QBPDS)', short: 'QBPDS — lombaire',
  unit: '/100', max: 100, mcid: 17.5, betterHigh: false,
  scale: ['Aucune difficulté', 'Très peu difficile', 'Un peu difficile', 'Difficile', 'Très difficile', 'Incapable'],
  intro: 'Avez-vous de la difficulté aujourd’hui à accomplir les activités suivantes à cause de votre blessure ou de votre condition ?',
  items: [
    'Sortir du lit',
    'Dormir toute la nuit',
    'Vous retourner dans le lit',
    'Vous promener en voiture',
    'Rester debout durant 20 à 30 minutes',
    'Rester assis sur une chaise durant plusieurs heures',
    'Monter un seul étage à pied',
    'Faire plusieurs coins de rue à pied (300 à 400 mètres)',
    'Marcher plusieurs milles',
    'Atteindre des objets sur des tablettes assez élevées',
    'Lancer une balle',
    'Courir un coin de rue (à peu près 100 mètres)',
    'Sortir des aliments du réfrigérateur',
    'Faire votre lit',
    'Mettre vos bas (collants)',
    'Vous pencher pour laver la baignoire',
    'Déplacer une chaise',
    'Tirer ou pousser des portes lourdes',
    'Transporter deux sacs d’épicerie',
    'Soulever et transporter une grosse valise',
  ].map((label, i) => ({ key: `q${i + 1}`, label })),
};

// ---- STarT Back Screening Tool (pronostic, lombaire) -------
// ⚠️ TRADUCTION DE TRAVAIL NON VALIDÉE — traduite par l'IA à partir de
// l'original anglais (© Keele University, 01/08/07), à la demande du
// clinicien responsable. Une échelle clinique traduite informellement
// n'a pas la même validité psychométrique garantie que l'original ou
// qu'une traduction validée par étude transculturelle. Les scores/seuils
// de risque (voir scoreStartBack) restent ceux de l'outil original.
// Afficher translationNotice partout où cet instrument est utilisé.
export const STARTBACK = {
  code: 'startback', name: 'STarT Back Screening Tool', short: 'STarT Back — pronostic',
  max: 9, betterHigh: false,
  translationNotice: 'Traduction de travail non validée scientifiquement (original : © Keele University). À utiliser avec prudence clinique jusqu’à validation transculturelle formelle.',
  intro: 'En pensant aux 2 dernières semaines, indiquez votre réponse aux questions suivantes :',
  items: [
    { key: 'sb1', label: 'Ma douleur au dos s’est propagée dans une ou les deux jambes à un moment donné au cours des 2 dernières semaines', type: 'yesno', psychosocial: false },
    { key: 'sb2', label: 'J’ai eu de la douleur à l’épaule ou au cou à un moment donné au cours des 2 dernières semaines', type: 'yesno', psychosocial: false },
    { key: 'sb3', label: 'Je n’ai marché que de courtes distances à cause de ma douleur au dos', type: 'yesno', psychosocial: false },
    { key: 'sb4', label: 'Au cours des 2 dernières semaines, je me suis habillé(e) plus lentement que d’habitude à cause de ma douleur au dos', type: 'yesno', psychosocial: false },
    { key: 'sb5', label: 'Ce n’est pas vraiment sécuritaire pour une personne ayant une condition comme la mienne d’être physiquement active', type: 'yesno', psychosocial: true },
    { key: 'sb6', label: 'Des pensées inquiétantes m’ont traversé l’esprit très souvent', type: 'yesno', psychosocial: true },
    { key: 'sb7', label: 'J’ai l’impression que ma douleur au dos est terrible et qu’elle ne s’améliorera jamais', type: 'yesno', psychosocial: true },
    { key: 'sb8', label: 'En général, je n’ai pas pris plaisir à toutes les choses que j’appréciais habituellement', type: 'yesno', psychosocial: true },
    { key: 'sb9', label: 'Globalement, à quel point votre douleur au dos vous a-t-elle dérangé(e) au cours des 2 dernières semaines ?', type: 'bothersome', psychosocial: true,
      options: ['Pas du tout', 'Un peu', 'Modérément', 'Beaucoup', 'Extrêmement'] }, // score=1 si "Beaucoup" ou "Extrêmement" (= Very much / Extremely)
  ],
};

export const ASSESSMENT_DEFS = { neurodisk_core: NEURODISK_CORE, qbpds: QBPDS, startback: STARTBACK };
