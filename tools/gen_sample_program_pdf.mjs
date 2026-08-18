// Banc d'essai : génère de vrais PDF échantillons du programme d'entraînement
// pour inspection visuelle, en réutilisant EXACTEMENT le layout du navigateur
// (js/program-pdf.js). Aucune dépendance au navigateur ici.
//
//   node tools/gen_sample_program_pdf.mjs [dossier_sortie]
//
import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import QR from 'qrcode-generator';
import { drawProgram } from '../js/program-pdf.js';

const OUT = process.argv[2] || '.';
fs.mkdirSync(OUT, { recursive: true });

const makeQr = (url) => {
  try { const q = QR(0, 'M'); q.addData(url); q.make(); return q.createDataURL(4, 2); }
  catch { return null; }
};

// ── Images de test (dataURL + vraies dimensions) à partir d'assets locaux ──
function pngDims(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }
function loadLocal(rel) {
  try {
    const buf = fs.readFileSync(rel);
    const b64 = buf.toString('base64');
    const fmt = /\.png$/i.test(rel) ? 'PNG' : 'JPEG';
    const mime = fmt === 'PNG' ? 'image/png' : 'image/jpeg';
    const dims = fmt === 'PNG' ? pngDims(buf) : { w: 0, h: 0 };
    return { dataUrl: `data:${mime};base64,${b64}`, fmt, ...dims };
  } catch { return null; }
}

// Logo couleur complet (couverture) + icône simplifiée (en-têtes p2/p3) +
// une image d'exercice de substitution (logo mot-symbole, placeholder visuel).
const logo = loadLocal('assets/logo-neurodisk-hd.png');
const logoMark = loadLocal('assets/logo-neurodisk-mark.png');
const demoImg = loadLocal('assets/logo-neurodisk-hd.png');

const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function ex(i, over = {}) {
  return {
    index: i,
    name: over.name || `Exercice de mobilité lombaire n°${i}`,
    category: over.category ?? 'Lombaires',
    dosage: over.dosage ?? { sets: 3, reps: 12, restSec: 60, frequency: '2x/jour' },
    consignes: over.consignes ?? 'Placez-vous à quatre pattes, dos neutre. Alternez lentement entre le dos rond et le dos creux en synchronisant avec votre respiration. Gardez le mouvement fluide et contrôlé.',
    surveiller: over.surveiller ?? 'Cessez si une douleur descend dans la jambe ou provoque des engourdissements.',
    note: over.note ?? null,
    videoUrl: over.videoUrl === undefined ? VIDEO : over.videoUrl,
    imageData: over.imageData === undefined ? (demoImg ? [demoImg] : []) : over.imageData,
  };
}

const baseData = (n, extra = {}) => ({
  patientName: 'Ozzy Osbourne',
  professionalName: 'Gabriel Girard',
  createdDate: '13 juillet 2026',
  programName: 'Programme lombaire — phase 1',
  region: 'Région lombaire',
  objectives: ['Réduire la douleur au bas du dos', 'Améliorer la mobilité en flexion/extension', 'Reprendre la marche quotidienne'],
  logoData: logo || null,
  logoMarkData: logoMark || logo || null,
  exercises: Array.from({ length: n }, (_, k) => ex(k + 1)),
  ...extra,
});

const SCENARIOS = {
  '1_exercice': baseData(1),
  '2_exercices': baseData(2),
  '3_exercices': baseData(3),
  '6_exercices': baseData(6),
  'note_longue': baseData(2, {
    exercises: [
      ex(1, { note: 'Commencez par une amplitude réduite cette semaine. Si tout va bien, augmentez progressivement l\'amplitude et le nombre de répétitions la semaine prochaine. Portez une attention particulière à ne pas retenir votre respiration pendant l\'effort — c\'est fréquent et cela augmente la tension. On réévalue au prochain rendez-vous.' }),
      ex(2, { note: null }),
    ],
  }),
  'sans_note_sans_video': baseData(2, {
    exercises: [ex(1, { note: null, videoUrl: null }), ex(2, { note: null, videoUrl: null })],
  }),
  'sans_image': baseData(2, {
    exercises: [ex(1, { imageData: [] }), ex(2, { imageData: [] })],
  }),
  'pro_manquant': baseData(2, { professionalName: null, region: null, objectives: [] }),
  'dosage_varie': baseData(3, {
    exercises: [
      ex(1, { dosage: { sets: 2, reps: '30 s/jambe', frequency: '3x/semaine' } }),
      ex(2, { dosage: { sets: 3, reps: 10, holdSec: 10, restSec: 90, frequency: '1x/jour' } }),
      ex(3, { dosage: { reps: 15, frequency: 'matin et soir' } }),
    ],
  }),
  // Reproduit le cas du brief : titre exact avec terme anglais préservé,
  // consignes/précautions commençant en minuscule (à corriger), note de
  // l'exercice 1 redondante avec son « à surveiller » (doit être masquée),
  // note distincte sur l'exercice 2 (doit rester affichée), page 3 rééquilibrée.
  'brief_reel': baseData(3, {
    exercises: [
      ex(1, {
        name: 'Rétraction cervicale (chin tuck assis)',
        consignes: 'assis bien droit, rentrez légèrement le menton comme pour faire un double menton, sans baisser la tête.',
        surveiller: 'mouvement lent et indolore, sans forcer.',
        note: 'Mouvement lent et indolore, sans forcer.', // ≈ identique à « à surveiller » -> doit être MASQUÉE
      }),
      ex(2, {
        name: 'Fléchisseurs profonds du cou (chin tuck couché)',
        consignes: 'couché sur le dos, rentrez le menton en gardant l\'arrière de la tête au sol.',
        surveiller: 'mouvement subtil, pas de poussée forte.',
        note: 'Patient rapporte une raideur cervicale résiduelle le matin — insister sur la lenteur du mouvement.', // distincte -> doit rester AFFICHÉE
      }),
      ex(3, {
        name: 'Étirement des extenseurs du cou',
        consignes: 'assis ou debout, penchez doucement la tête vers l\'avant.',
        surveiller: 'ne pas cambrer le bas du dos.',
        note: null,
      }),
    ],
  }),
};

let count = 0;
for (const [name, data] of Object.entries(SCENARIOS)) {
  for (const format of ['letter', 'a4']) {
    if (format === 'a4' && name !== '3_exercices') continue; // Lettre = défaut ; A4 : un cas de contrôle
    const doc = new jsPDF({ unit: 'mm', format, compress: true });
    drawProgram(doc, JSON.parse(JSON.stringify(data)) , { makeQr });
    // ré-attacher logoData/imageData (perdus par le clone JSON si dataURL longs -> en fait conservés)
    const buf = Buffer.from(doc.output('arraybuffer'));
    const file = path.join(OUT, `programme_${name}_${format}.pdf`);
    fs.writeFileSync(file, buf);
    console.log('✓', file, `(${doc.internal.getNumberOfPages()} pages)`);
    count++;
  }
}
console.log(`\n${count} PDF générés dans ${path.resolve(OUT)}`);
