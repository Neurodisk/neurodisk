// ============================================================
// Templates de programmes R12 / R24 (jalons du protocole 24 traitements)
//   Regroupés par PROFIL MÉCANIQUE (données probantes) plutôt que par
//   condition. 5 profils × 2 phases = 10 templates de 3 exercices.
//   R12 = phase fondamentale (mobilité, contrôle moteur, activation).
//   R24 = progression (mise en charge, renforcement, fonctionnel).
//
//   Les exercices référencent la banque probante (migration 016) par
//   TITRE — résolus en exercise_id à l'application (admin/index.html).
//   Le clinicien peut ensuite ajuster le programme généré.
//
//   Base probante : voir docs/exercices-base-probante.md
//     • Hernie/radiculopathie → biais extension (McKenzie/MDT)
//     • Sténoses/spondylolisthésis → biais flexion, décompression
//     • Spondylolyse/arthrose lombaire → stabilisation neutre (McGill)
//     • Cervical → mobilité + fléchisseurs profonds + scapulaire
// ============================================================

// Routage condition → profil (première correspondance l'emporte)
export const TEMPLATE_PROFILES = [
  { code: 'lombaire_extension', label: 'Lombaire — biais extension (McKenzie)',       conditions: ['hernie_discale', 'radiculopathie', 'sciatique'] },
  { code: 'lombaire_flexion',   label: 'Lombaire — biais flexion / décompression',    conditions: ['stenose_foraminale', 'stenose_spinale', 'spondylolisthesis'] },
  { code: 'lombaire_neutre',    label: 'Lombaire — stabilisation (neutre)',           conditions: ['spondylolyse', 'arthrose_lombaire'] },
  { code: 'cervical',           label: 'Cervical',                                    conditions: ['arthrose_cervicale'] },
  { code: 'universel',          label: 'Universel / trousse de départ',               conditions: ['trousse_depart', 'autre'] },
];

export function profileForConditions(conditionIds = []) {
  for (const p of TEMPLATE_PROFILES) {
    if (conditionIds.some(c => p.conditions.includes(c))) return p.code;
  }
  return 'universel';
}
export function profileLabel(code) {
  return (TEMPLATE_PROFILES.find(p => p.code === code) || {}).label || code;
}

const ex = (title, sets, reps, rest_sec, frequency, notes = '') => ({ title, sets, reps, rest_sec, frequency, notes });

export const PROGRAM_TEMPLATES = {
  // ── 1. Lombaire — biais extension (McKenzie) ──────────────
  lombaire_extension: {
    R12: {
      name: 'Programme R12 — Lombaire (extension / McKenzie)',
      rationale: 'Phase fondamentale : préférence directionnelle en extension, recherche de centralisation, activation du tronc.',
      exercises: [
        ex('Extension sur les coudes (sphinx)', 1, '10', 30, '3 à 4×/jour', 'Rechercher la centralisation ; cesser si la douleur descend dans la jambe.'),
        ex('Bascule du bassin (pelvic tilt)', 2, '12', 30, '2×/jour', ''),
        ex('Activation du transverse (abdominal hollowing)', 2, '10 (tenue 10 s)', 30, '2×/jour', ''),
      ],
    },
    R24: {
      name: 'Programme R24 — Lombaire (extension / McKenzie)',
      rationale: 'Progression : extension bras tendus, renforcement fessiers et stabilisation dynamique.',
      exercises: [
        ex('Extension bras tendus (press-up McKenzie)', 2, '10', 30, '2 à 3×/jour', 'Bassin relâché au sol.'),
        ex('Pont fessier (glute bridge)', 2, '12', 45, '1×/jour', ''),
        ex("Chien d'arrêt (bird-dog)", 2, '8/côté', 45, '1×/jour', ''),
      ],
    },
  },

  // ── 2. Lombaire — biais flexion / décompression ───────────
  lombaire_flexion: {
    R12: {
      name: 'Programme R12 — Lombaire (flexion / décompression)',
      rationale: 'Phase fondamentale : biais en flexion (soulage sténoses/spondylolisthésis), décompression douce, activation du tronc. Éviter l’extension.',
      exercises: [
        ex('Genou-poitrine (une jambe)', 2, '30 s/jambe', 30, '2×/jour', 'Flexion douce ; garder l’autre pied au sol.'),
        ex("Position de repos en flexion (posture de l'enfant)", 2, '30 à 60 s', 30, '2×/jour', ''),
        ex('Activation du transverse (abdominal hollowing)', 2, '10 (tenue 10 s)', 30, '2×/jour', ''),
      ],
    },
    R24: {
      name: 'Programme R24 — Lombaire (flexion / décompression)',
      rationale: 'Progression : aérobie en position penchée (flexion), renforcement fessiers, stabilisation en neutre sans hyperextension.',
      exercises: [
        ex('Vélo stationnaire (légèrement penché)', 1, '10 à 20 min', 0, '3 à 5×/sem', 'Tronc légèrement penché = flexion, soulage.'),
        ex('Pont fessier (glute bridge)', 2, '12', 45, '1×/jour', ''),
        ex("Chien d'arrêt (bird-dog)", 2, '8/côté', 45, '1×/jour', 'Dos neutre, aucune hyperextension.'),
      ],
    },
  },

  // ── 3. Lombaire — stabilisation neutre ────────────────────
  lombaire_neutre: {
    R12: {
      name: 'Programme R12 — Lombaire (stabilisation neutre)',
      rationale: 'Phase fondamentale : contrôle moteur, activation, mobilité dans une amplitude neutre (spondylolyse/arthrose lombaire).',
      exercises: [
        ex('Activation du transverse (abdominal hollowing)', 2, '10 (tenue 10 s)', 30, '2×/jour', ''),
        ex('Bascule du bassin (pelvic tilt)', 2, '12', 30, '2×/jour', ''),
        ex('Chat-chameau (cat-camel)', 1, '10 cycles', 30, '2×/jour', 'Amplitude confortable, sans forcer les extrêmes.'),
      ],
    },
    R24: {
      name: 'Programme R24 — Lombaire (stabilisation neutre)',
      rationale: 'Progression : gainage progressif de McGill (dead bug, bird-dog, planche) en gardant le rachis neutre.',
      exercises: [
        ex('Bug mort (dead bug)', 2, '8 à 10/côté', 45, '1×/jour', 'Le bas du dos ne doit pas se creuser.'),
        ex("Chien d'arrêt (bird-dog)", 2, '8 à 10/côté', 45, '1×/jour', ''),
        ex('Planche ventrale (gainage)', 3, 'tenue 10 à 30 s', 45, '1×/jour', 'Version sur genoux pour débuter.'),
      ],
    },
  },

  // ── 4. Cervical ───────────────────────────────────────────
  cervical: {
    R12: {
      name: 'Programme R12 — Cervical',
      rationale: 'Phase fondamentale : amplitude cervicale, activation des fléchisseurs profonds, contrôle scapulaire.',
      exercises: [
        ex('Rétraction cervicale (double menton)', 1, '10 (tenue 3 s)', 30, '3×/jour', 'Mouvement lent et indolore.'),
        ex('Fléchisseurs profonds du cou (chin tuck couché)', 2, '10 (tenue 5 à 10 s)', 30, '2×/jour', ''),
        ex('Rétraction scapulaire (serrer les omoplates)', 2, '10 à 15', 30, '2×/jour', ''),
      ],
    },
    R24: {
      name: 'Programme R24 — Cervical',
      rationale: 'Progression : renforcement isométrique multidirectionnel, chaîne scapulaire, maintien de l’amplitude.',
      exercises: [
        ex('Isométrie cervicale multidirectionnelle', 1, '5 s ×5/direction', 30, '1×/jour', 'Contraction douce (30 à 50 %), aucune douleur.'),
        ex('Renforcement scapulaire Y-T-W au mur', 1, '8/position', 45, '1×/jour', 'Bas du dos neutre.'),
        ex('Rotation cervicale active', 2, '8 à 10/côté', 30, '1×/jour', ''),
      ],
    },
  },

  // ── 5. Universel / trousse de départ ──────────────────────
  universel: {
    R12: {
      name: 'Programme R12 — Universel',
      rationale: 'Phase fondamentale sûre pour toute condition : contrôle du tronc, respiration, remise en mouvement aérobie.',
      exercises: [
        ex('Bascule du bassin (pelvic tilt)', 2, '12', 30, '1 à 2×/jour', ''),
        ex('Respiration diaphragmatique', 1, '5 min', 0, '1 à 2×/jour', ''),
        ex('Marche progressive', 1, '15 à 30 min', 0, 'la plupart des jours', 'Augmenter graduellement la durée.'),
      ],
    },
    R24: {
      name: 'Programme R24 — Universel',
      rationale: 'Progression : renforcement fessiers, stabilisation dynamique, intégration posturale.',
      exercises: [
        ex('Pont fessier (glute bridge)', 2, '12', 45, '1×/jour', ''),
        ex("Chien d'arrêt (bird-dog)", 2, '8/côté', 45, '1×/jour', ''),
        ex('Auto-grandissement et posture neutre', 3, '20 à 30 s', 0, 'plusieurs fois/jour', ''),
      ],
    },
  },
};

// Normalise un titre pour un appariement robuste (accents/apostrophes/casse)
export function normalizeTitle(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents
    .replace(/[‘’']/g, "'")                  // apostrophes typographiques → droite
    .replace(/\s+/g, ' ')
    .trim();
}
