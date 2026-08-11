// ============================================================
// PDF « Programme d'entraînement adapté » — Clinique Neurodisk
//
// Rendu vectoriel dans l'application (jsPDF), police Inter incorporée,
// palette clinique marine + turquoise. Texte sélectionnable, liens vidéo
// cliquables, images nettes, aucun en-tête/pied de page du navigateur.
// Aucune donnée envoyée à un service externe : jsPDF/qrcode-generator sont
// chargés en modules (CDN jsDelivr, déjà autorisé par la CSP), la police
// Inter est incorporée localement (js/inter-font.js) et tout le rendu se
// fait côté client.
//
// Le cœur `drawProgram()` est une fonction pure (dépendances injectées),
// réutilisée telle quelle par le banc d'essai Node
// (tools/gen_sample_program_pdf.mjs) pour générer/inspecter de vrais PDF.
//
// ⚠️ Contenu clinique jamais modifié : cette couche ne fait que la MISE EN
// PAGE. La normalisation du dosage n'altère que la présentation.
// ============================================================

import { INTER_REGULAR_B64, INTER_BOLD_B64 } from './inter-font.js';

// ── Palette ─────────────────────────────────────────────────
const NAVY      = [13, 39, 74];    // marine profond — structure, titres
const NAVY_SOFT = [31, 58, 95];
const TEAL      = [22, 158, 166];  // turquoise du logo — accent distinctif
const TEAL_DEEP = [13, 112, 120];
const TEAL_PALE = [228, 245, 244]; // notes du professionnel
const OFFWHITE  = [250, 249, 245]; // blanc cassé chaleureux
const PALEBLUE  = [234, 242, 251]; // informations générales / dosage
const BORDER    = [222, 229, 237];
const TEXT      = [43, 54, 68];
const MUTED     = [108, 121, 138];
const LABEL     = [72, 87, 107];   // libellés à contraste renforcé (lisibilité 55-70 ans)
const LINE_SOFT = [196, 205, 218]; // lignes de la zone notes (plus visibles à l'impression)
const CORAL_BG  = [253, 236, 231]; // précautions
const CORAL_BD  = [242, 205, 195];
const CORAL_TX  = [176, 72, 55];
const WHITE     = [255, 255, 255];

const PT = 0.352778; // 1pt en mm

let FONT = 'helvetica';
function registerFonts(doc) {
  try {
    doc.addFileToVFS('Inter-Regular.ttf', INTER_REGULAR_B64);
    doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
    doc.addFileToVFS('Inter-Bold.ttf', INTER_BOLD_B64);
    doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
    FONT = 'Inter';
  } catch (_) { FONT = 'helvetica'; }
}

// ── Helpers couleur / police ────────────────────────────────
function fc(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
function sc(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
function dc(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }
function F(doc, weight, size) { doc.setFont(FONT, weight); if (size) doc.setFontSize(size); }
function lh(size, factor = 1.35) { return size * PT * factor; }

// ════════════════════════════════════════════════════════════
// Normalisation du dosage (présentation seulement)
// ════════════════════════════════════════════════════════════
export function normalizeDosageLines(d = {}) {
  const lines = [];
  const sets = d.sets != null && d.sets !== '' ? Number(d.sets) : null;
  const repsRaw = d.reps != null ? String(d.reps).trim() : '';
  const repsIsNum = /^\d+$/.test(repsRaw);

  if (sets && repsRaw) {
    const rep = repsIsNum ? `${repsRaw} répétition${Number(repsRaw) > 1 ? 's' : ''}` : repsRaw;
    lines.push(`${sets} série${sets > 1 ? 's' : ''} de ${rep}`);
  } else if (sets) {
    lines.push(`${sets} série${sets > 1 ? 's' : ''}`);
  } else if (repsRaw) {
    lines.push(repsIsNum ? `${repsRaw} répétition${Number(repsRaw) > 1 ? 's' : ''}` : repsRaw);
  }

  if (d.holdSec) lines.push(`Maintien : ${fmtSeconds(d.holdSec)}`);
  if (d.restSec) lines.push(`Repos : ${fmtSeconds(d.restSec)}`);
  if (d.frequency) lines.push(`Fréquence : ${normalizeFrequency(d.frequency)}`);
  return lines;
}

function fmtSeconds(sec) {
  sec = Number(sec);
  if (!sec) return '';
  if (sec >= 60) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return s ? `${m} min ${s} secondes` : `${m} minute${m > 1 ? 's' : ''}`;
  }
  return `${sec} seconde${sec > 1 ? 's' : ''}`;
}

function normalizeFrequency(f) {
  let s = String(f).trim();
  s = s.replace(/(\d+)\s*x\s*\/\s*(jour|semaine|jr|sem)/gi, (_, n, unit) => {
    const u = /jour|jr/i.test(unit) ? 'jour' : 'semaine';
    return `${n} fois par ${u}`;
  });
  s = s.replace(/\bsec\b\.?/gi, 'secondes').replace(/\bs\b(?=\s|$)/g, 'secondes');
  s = s.replace(/\bmin\b\.?/gi, 'minutes');
  return s;
}

// ════════════════════════════════════════════════════════════
// Pictogrammes sobres (tracés vectoriels)
// ════════════════════════════════════════════════════════════
function icoTarget(doc, cx, cy, r, color) {
  dc(doc, color); doc.setLineWidth(0.5);
  doc.circle(cx, cy, r, 'S');
  doc.circle(cx, cy, r * 0.55, 'S');
  fc(doc, color); doc.circle(cx, cy, r * 0.16, 'F');
}
function icoCheck(doc, cx, cy, r, color) {
  dc(doc, color); doc.setLineWidth(0.5);
  doc.circle(cx, cy, r, 'S');
  doc.setLineWidth(0.7);
  doc.lines([[1.1, 1.2], [2.2, -2.6]], cx - 1.5, cy + 0.1);
}
// Pictogramme d'avertissement universel (triangle centré + point
// d'exclamation) — remplace l'ancien bouclier, confondu avec une flèche.
function icoWarning(doc, cx, cy, r, color) {
  dc(doc, color); doc.setLineWidth(0.55);
  doc.triangle(
    cx, cy - r * 0.95,
    cx - r * 0.95, cy + r * 0.7,
    cx + r * 0.95, cy + r * 0.7,
    'S'
  );
  fc(doc, color);
  doc.roundedRect(cx - 0.28, cy - r * 0.28, 0.56, r * 0.62, 0.28, 0.28, 'F');
  doc.circle(cx, cy + r * 0.52, 0.34, 'F');
}
function icoPlay(doc, cx, cy, r, color) {
  fc(doc, color);
  doc.triangle(cx - r * 0.4, cy - r * 0.6, cx - r * 0.4, cy + r * 0.6, cx + r * 0.7, cy, 'F');
}
// Signature visuelle : courbe fluide unique inspirée de la colonne / du
// symbole du logo — remplace l'ancienne colonne de points (trop générique).
// Une seule ligne bézier, discrète, qui ne concurrence jamais le titre.
function spineCurve(doc, x, y, color) {
  dc(doc, color); doc.setLineWidth(1.0);
  doc.lines([[3.5, 8, -3.5, 16, 0, 26]], x, y, undefined, 'S', false);
}

// ════════════════════════════════════════════════════════════
// Cœur : dessine le programme dans un doc jsPDF
// ════════════════════════════════════════════════════════════
export function drawProgram(doc, data, deps = {}) {
  const makeQr = deps.makeQr || (() => null);
  registerFonts(doc);
  doc.setLineHeightFactor(1.3); // interligne confortable ET cohérent mesure/dessin
  F(doc, 'normal', 11);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 16;
  const TOP = 14, BOT = 16;
  const CW = pageW - 2 * M;
  const contentBottom = pageH - BOT;
  const G = { pageW, pageH, M, TOP, BOT, CW, contentBottom };

  // ══ PAGE 1 — page d'accueil ══
  drawCover(doc, data, G);

  // ══ PAGES SUIVANTES — exercices ══
  const exercises = data.exercises || [];
  if (exercises.length) {
    doc.addPage();
    let y = drawRunningHeader(doc, data, G);

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const isLast = i === exercises.length - 1;
      let h = layoutExercise(doc, ex, { x: M, y, w: CW }, { draw: false });

      if (y + h > contentBottom) {
        doc.addPage();
        y = drawRunningHeader(doc, data, G);
      }
      // Dernier exercice seul en haut d'une page → variante agrandie (équilibre).
      const aloneOnPage = isLast && Math.abs(y - (TOP)) < 40; // y proche du haut après header
      const enlarged = aloneOnPage && (contentBottom - y) > h + 60;
      h = layoutExercise(doc, ex, { x: M, y, w: CW }, { draw: true, makeQr, enlarged });
      y += h + 8;

      // Exercice seul sur sa page : la zone « Notes personnelles » occupe
      // TOUT l'espace restant jusqu'au pied de page (répartition intentionnelle,
      // pas de grand vide résiduel).
      if (isLast && aloneOnPage && contentBottom - y > 30) {
        drawNotesArea(doc, { x: M, y, w: CW }, contentBottom - y);
        y = contentBottom;
      }
    }

    // Cas général (dernière page se termine avec ≥2 exercices) : zone de
    // notes plus modeste si l'espace le permet.
    if (y < contentBottom - 46) {
      drawNotesArea(doc, { x: M, y, w: CW }, contentBottom - y - 4);
    }
  }

  drawFooters(doc, data, G);
}

// ── Page d'accueil ──────────────────────────────────────────
function drawCover(doc, data, g) {
  const { pageW, M, CW } = g;
  let y = g.TOP + 2;

  // Logo couleur (ratio réel, sur fond clair — pas de rectangle)
  const logo = data.logoData;
  if (logo && logo.w && logo.h) {
    const hh = 13, ww = hh * (logo.w / logo.h);
    try { doc.addImage(logo.dataUrl, logo.fmt || 'PNG', M, y, ww, hh, undefined, 'FAST'); } catch (_) {}
  }
  // Signature visuelle (discrète, à droite — n'entre jamais en conflit avec le titre)
  spineCurve(doc, pageW - M - 4, y, TEAL);

  y += 20;

  // Titre + sous-titre
  F(doc, 'bold', 23); sc(doc, NAVY);
  doc.text('Programme d\'entraînement adapté', M, y);
  y += 8;
  F(doc, 'normal', 13); sc(doc, TEAL_DEEP);
  doc.text('Plan d\'exercices personnalisé', M, y);
  y += 5;
  // Filet bicolore (signature)
  dc(doc, NAVY); doc.setLineWidth(1.1); doc.line(M, y, M + 32, y);
  dc(doc, TEAL); doc.setLineWidth(1.1); doc.line(M + 33, y, M + 52, y);
  y += 8;

  // Bloc patient / programme — hauteur de ligne dynamique pour absorber les
  // noms/titres/programmes longs (retour à la ligne, jamais de débordement).
  const rows = [
    ['Patient', data.patientName || '—'],
    ['Professionnel', data.professionalName || 'Votre professionnel Neurodisk'],
    ['Date du programme', data.createdDate || '—'],
    ['Programme', data.programName || '—'],
  ];
  if (data.region) rows.push(['Région ciblée', data.region]);
  const valueW = CW - 62, valSize = 11, valLh = lh(valSize, 1.3);
  const rowMeta = rows.map(r => {
    F(doc, 'bold', valSize);
    const vLines = doc.splitTextToSize(String(r[1]), valueW);
    return { label: r[0], vLines, h: Math.max(8.5, vLines.length * valLh + 3.5) };
  });
  const infoH = rowMeta.reduce((s, r) => s + r.h, 0) + 6;
  fc(doc, OFFWHITE); dc(doc, BORDER); doc.setLineWidth(0.4);
  doc.roundedRect(M, y, CW, infoH, 2.5, 2.5, 'FD');
  fc(doc, TEAL); doc.roundedRect(M, y, 2, infoH, 1, 1, 'F'); // liseré turquoise
  let ry = y + 3;
  rowMeta.forEach((r, i) => {
    const midY = ry + r.h / 2 + 0.5;
    F(doc, 'normal', 11); sc(doc, LABEL);
    doc.text(r.label, M + 7, midY - (r.vLines.length - 1) * valLh / 2);
    F(doc, 'bold', valSize); sc(doc, NAVY);
    doc.text(r.vLines, pageW - M - 6, midY - (r.vLines.length - 1) * valLh / 2, { align: 'right' });
    if (i < rowMeta.length - 1) { dc(doc, [219, 227, 238]); doc.setLineWidth(0.2); doc.line(M + 7, ry + r.h - 1, pageW - M - 6, ry + r.h - 1); }
    ry += r.h;
  });
  y += infoH + 7;

  // Intro rassurante (encadré bleu pâle)
  y = softIntro(doc, 'Ce programme a été conçu pour vous aider à bouger progressivement, renforcer les bonnes zones et améliorer votre confort au quotidien.', { x: M, y, w: CW });
  y += 6;

  // Sections avec pictogrammes
  const objectives = (data.objectives && data.objectives.length)
    ? data.objectives
    : ['Améliorer le contrôle du mouvement', 'Renforcer progressivement les zones ciblées', 'Réduire les irritations liées aux positions prolongées', 'Favoriser un retour sécuritaire aux activités'];

  y = section(doc, icoTarget, 'Objectifs du programme', objectives, { x: M, y, w: CW });
  y += 4;
  y = section(doc, icoCheck, 'Comment utiliser votre programme', [
    'Faites les exercices dans l\'ordre présenté.',
    'Respectez le dosage indiqué pour chaque exercice.',
    'La qualité du mouvement est plus importante que la quantité.',
    'Respirez normalement pendant les exercices.',
  ], { x: M, y, w: CW });
  y += 4;
  y = section(doc, icoWarning, 'Précautions générales', [
    'Faites les mouvements lentement et sans forcer.',
    'Respectez vos douleurs : un léger inconfort est acceptable, une douleur vive ne l\'est pas.',
    'Cessez l\'exercice si la douleur augmente fortement, descend dans la jambe ou provoque des engourdissements importants.',
    'Communiquez avec votre professionnel si vos symptômes changent.',
  ], { x: M, y, w: CW }, CORAL_TX);
}

function softIntro(doc, txt, g) {
  const padX = 6, padY = 4.5, size = 11.5;
  F(doc, 'normal', size);
  const lines = doc.splitTextToSize(txt, g.w - 2 * padX - 3);
  const h = lines.length * lh(size, 1.4) + 2 * padY;
  fc(doc, PALEBLUE); dc(doc, BORDER); doc.setLineWidth(0.35);
  doc.roundedRect(g.x, g.y, g.w, h, 2.5, 2.5, 'FD');
  fc(doc, NAVY); doc.roundedRect(g.x, g.y, 2, h, 1, 1, 'F');
  sc(doc, NAVY_SOFT);
  doc.text(lines, g.x + padX, g.y + padY + lh(size, 1.4) * 0.72);
  return g.y + h;
}

function section(doc, icon, title, items, g, accent) {
  let y = g.y;
  const iconColor = accent || TEAL_DEEP;
  icon(doc, g.x + 3, y + 1.4, 3, iconColor);
  F(doc, 'bold', 13.5); sc(doc, NAVY);
  doc.text(title, g.x + 9, y + 3);
  y += 6;
  dc(doc, TEAL); doc.setLineWidth(0.5); doc.line(g.x, y, g.x + 20, y);
  dc(doc, BORDER); doc.setLineWidth(0.4); doc.line(g.x + 20, y, g.x + g.w, y);
  y += 4.5;

  F(doc, 'normal', 11.5); sc(doc, TEXT);
  const size = 11.5, textX = g.x + 6.5, textW = g.w - 6.5;
  const bulletColor = accent || TEAL;
  items.forEach(it => {
    const lines = doc.splitTextToSize(it, textW);
    fc(doc, bulletColor); doc.circle(g.x + 1.6, y - 1.1, 1.0, 'F');
    doc.text(lines, textX, y);
    y += lines.length * lh(size, 1.4) + 2;
  });
  return y;
}

// ── En-tête courant (pages 2+) — identique sur toutes les pages ────
// Icône seule (version simplifiée, nette même en petit) + « Neurodisk »
// composé en Inter (jamais un mot-symbole raster minuscule illisible).
function drawRunningHeader(doc, data, g) {
  let y = g.TOP;
  const mark = data.logoMarkData;
  let markW = 0;
  const hh = 8.5;
  if (mark && mark.w && mark.h) {
    markW = hh * (mark.w / mark.h);
    try { doc.addImage(mark.dataUrl, mark.fmt || 'PNG', g.M, y - 1.5, markW, hh, undefined, 'FAST'); } catch (_) {}
  }
  const brandX = g.M + (markW ? markW + 3.5 : 0);
  F(doc, 'bold', 12); sc(doc, NAVY);
  doc.text('Neurodisk', brandX, y + 4.5);
  const brandW = doc.getTextWidth('Neurodisk');
  F(doc, 'normal', 10.5); sc(doc, MUTED);
  doc.text('Programme d\'entraînement adapté', brandX + brandW + 6, y + 4.5);
  y += 8.5;
  dc(doc, NAVY); doc.setLineWidth(0.8); doc.line(g.M, y, g.M + 20, y);
  dc(doc, TEAL); doc.setLineWidth(0.8); doc.line(g.M + 20.5, y, g.M + 34, y);
  dc(doc, BORDER); doc.setLineWidth(0.4); doc.line(g.M + 34.5, y, g.M + g.CW, y);
  return y + 7;
}

// ════════════════════════════════════════════════════════════
// Bloc d'exercice — layout unifié (mesure == dessin)
// ════════════════════════════════════════════════════════════
const EX = {
  pad: 5, gap: 6, numD: 11,
  nameSize: 14, catSize: 8.5, doseSize: 10.5, labelSize: 9, textSize: 11,
  tl: 1.3, // interligne du corps de texte
};

function layoutExercise(doc, ex, box, opts) {
  const draw = !!opts.draw;
  const { x, y, w } = box;
  const enlarged = !!opts.enlarged;
  const imgColW = (enlarged ? 86 : 70);
  const textX = x + EX.pad + imgColW + EX.gap;
  const textW = w - EX.pad * 2 - imgColW - EX.gap;

  // — hauteur en-tête (numéro + nom + catégorie) —
  // Dérivée des positions réelles ; pas de filet séparateur (épuré) donc le
  // corps commence juste sous la pastille de catégorie / le numéro.
  F(doc, 'bold', EX.nameSize);
  const nameLines = doc.splitTextToSize(ex.name || '', w - EX.pad * 2 - EX.numD - 5);
  const lastBaseOff = EX.pad + 3.5 + (nameLines.length - 1) * lh(EX.nameSize, 1.15);
  const circleBottomOff = EX.pad + EX.numD - 1;
  const contentBottomOff = ex.category ? lastBaseOff + 7 : lastBaseOff + 2.5;
  const headH = Math.max(circleBottomOff, contentBottomOff) + 1.5;

  // — hauteur colonne texte (mesure) —
  const rightH = rightColumn(doc, ex, textX, y + headH + 2, textW, { draw: false, enlarged });
  // — hauteur colonne image —
  const leftH = imageStackHeight(ex, imgColW, enlarged);

  const bodyH = Math.max(rightH, leftH);
  const totalH = headH + bodyH + EX.pad;

  if (!draw) return totalH;

  // — cadre —
  fc(doc, OFFWHITE); dc(doc, BORDER); doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, totalH, 3, 3, 'FD');

  // — en-tête : pastille numérotée + nom + catégorie —
  const numCx = x + EX.pad + EX.numD / 2, numCy = y + EX.pad + EX.numD / 2 - 1;
  fc(doc, NAVY); doc.circle(numCx, numCy, EX.numD / 2, 'F');
  fc(doc, TEAL); doc.circle(numCx, numCy, EX.numD / 2, 'S');
  F(doc, 'bold', 13); sc(doc, WHITE);
  doc.text(String(ex.index), numCx, numCy + 1.6, { align: 'center' });

  const nameX = x + EX.pad + EX.numD + 5;
  F(doc, 'bold', EX.nameSize); sc(doc, NAVY);
  doc.text(nameLines, nameX, y + EX.pad + 3.5);
  if (ex.category) {
    const hy = y + lastBaseOff + 5.2; // pastille collée sous la dernière ligne du nom
    F(doc, 'bold', EX.catSize);
    const cat = ex.category;
    const cw = doc.getTextWidth(cat) + 6;
    fc(doc, TEAL_PALE); dc(doc, [200, 230, 228]); doc.setLineWidth(0.2);
    doc.roundedRect(nameX, hy - 3.2, cw, 5, 1.4, 1.4, 'FD');
    sc(doc, TEAL_DEEP); doc.text(cat, nameX + 3, hy + 0.2);
  }

  // — colonnes (le corps démarre juste sous l'en-tête) —
  const bodyY = y + headH + 2;
  drawImageStack(doc, ex, { x: x + EX.pad, y: bodyY, w: imgColW }, enlarged);
  rightColumn(doc, ex, textX, bodyY, textW, { draw: true, makeQr: opts.makeQr, enlarged });

  return totalH;
}

// Colonne de droite : dosage, consignes, à surveiller, note, vidéo.
// Retourne la hauteur ; dessine si draw.
function rightColumn(doc, ex, x, y0, w, opts) {
  const draw = !!opts.draw;
  let y = y0;

  // Dosage (encadré bleu pâle)
  const doseLines = normalizeDosageLines(ex.dosage);
  if (doseLines.length) {
    const dlh = lh(EX.doseSize, 1.35);
    const boxH = doseLines.length * dlh + 4.5;
    if (draw) {
      fc(doc, PALEBLUE); dc(doc, BORDER); doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, boxH, 2, 2, 'FD');
      let dy = y + 4;
      doseLines.forEach((l, i) => {
        F(doc, i === 0 ? 'bold' : 'normal', EX.doseSize); sc(doc, NAVY);
        doc.text(l, x + 4, dy); dy += dlh;
      });
    }
    y += boxH + 3.5;
  }

  // Consignes (fond blanc, aéré)
  if (ex.consignes) {
    F(doc, 'bold', EX.labelSize);
    if (draw) { sc(doc, LABEL); doc.text('Consignes', x, y + 2.5); }
    y += 6.8;
    F(doc, 'normal', EX.textSize);
    const lines = doc.splitTextToSize(ex.consignes, w);
    if (draw) { sc(doc, TEXT); doc.text(lines, x, y); }
    y += lines.length * lh(EX.textSize, EX.tl) + 2;
  }

  // À surveiller (encadré corail)
  if (ex.surveiller) {
    F(doc, 'normal', EX.textSize);
    const lines = doc.splitTextToSize(ex.surveiller, w - 8);
    const boxH = 8.5 + lines.length * lh(EX.textSize, EX.tl) + 1.5;
    if (draw) {
      fc(doc, CORAL_BG); dc(doc, CORAL_BD); doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, boxH, 2, 2, 'FD');
      icoWarning(doc, x + 4, y + 4.2, 2.2, CORAL_TX);
      F(doc, 'bold', EX.labelSize); sc(doc, CORAL_TX);
      doc.text('À surveiller', x + 8, y + 4.6);
      F(doc, 'normal', EX.textSize); sc(doc, CORAL_TX);
      doc.text(lines, x + 4, y + 9.5);
    }
    y += boxH + 3;
  }

  // Note du professionnel (encadré turquoise pâle)
  if (ex.note) {
    F(doc, 'normal', EX.textSize);
    const lines = doc.splitTextToSize(ex.note, w - 9);
    const boxH = 8.5 + lines.length * lh(EX.textSize, EX.tl) + 1.5;
    if (draw) {
      fc(doc, TEAL_PALE); doc.setLineWidth(0);
      doc.roundedRect(x, y, w, boxH, 2, 2, 'F');
      fc(doc, TEAL); doc.rect(x, y, 1.6, boxH, 'F');
      F(doc, 'bold', EX.labelSize); sc(doc, TEAL_DEEP);
      doc.text('Note de votre professionnel', x + 5, y + 4.6);
      F(doc, 'normal', EX.textSize); sc(doc, TEAL_DEEP);
      doc.text(lines, x + 5, y + 9.5);
    }
    y += boxH + 3;
  }

  // Accès vidéo (lien cliquable + QR)
  if (ex.videoUrl) {
    if (draw) {
      dc(doc, BORDER); doc.setLineWidth(0.2);
      doc.setLineDashPattern([0.8, 0.8], 0); doc.line(x, y, x + w, y);
      doc.setLineDashPattern([], 0);
      const ty = y + 4;
      icoPlay(doc, x + 2, ty + 1, 2.2, TEAL);
      F(doc, 'bold', 10.5); sc(doc, TEAL_DEEP);
      const label = 'Voir la vidéo de démonstration';
      doc.textWithLink(label, x + 6, ty + 2, { url: ex.videoUrl });
      const lw = doc.getTextWidth(label);
      dc(doc, TEAL); doc.setLineWidth(0.3); doc.line(x + 6, ty + 3, x + 6 + lw, ty + 3);
      F(doc, 'normal', 8); sc(doc, MUTED);
      doc.text('Scannez le code ou touchez le lien', x + 6, ty + 7);
      const qr = opts.makeQr ? opts.makeQr(ex.videoUrl) : null;
      if (qr) {
        const qs = 13, qx = x + w - qs;
        try { doc.addImage(qr, 'PNG', qx, y + 1, qs, qs, undefined, 'FAST'); doc.link(qx, y + 1, qs, qs, { url: ex.videoUrl }); } catch (_) {}
      }
    }
    y += 13.5;
  }

  return y - y0;
}

// ── Images empilées ─────────────────────────────────────────
function imageStackHeight(ex, colW, enlarged) {
  const imgs = (ex.imageData || []).slice(0, enlarged ? 4 : 3);
  if (!imgs.length) return enlarged ? 50 : 34;
  const cap = enlarged ? 74 : 56;
  let total = 0;
  imgs.forEach((im, i) => {
    const ar = (im.w && im.h) ? im.w / im.h : 1.4;
    total += Math.min(colW / ar, cap) + (i ? 3 : 0);
  });
  return Math.max(total, 28);
}

function drawImageStack(doc, ex, g, enlarged) {
  const imgs = (ex.imageData || []).slice(0, enlarged ? 4 : 3);
  if (!imgs.length) {
    fc(doc, PALEBLUE); dc(doc, BORDER); doc.setLineWidth(0.3);
    doc.roundedRect(g.x, g.y, g.w, enlarged ? 50 : 34, 2, 2, 'FD');
    icoPlay(doc, g.x + g.w / 2 - 1, g.y + (enlarged ? 22 : 14), 3, TEAL);
    F(doc, 'normal', 9); sc(doc, MUTED);
    doc.text('Voir la vidéo', g.x + g.w / 2, g.y + (enlarged ? 30 : 22), { align: 'center' });
    return;
  }
  const cap = enlarged ? 74 : 56;
  const multi = imgs.length > 1;
  let y = g.y;
  imgs.forEach((im, i) => {
    const ar = (im.w && im.h) ? im.w / im.h : 1.4;
    let hh = Math.min(g.w / ar, cap), ww = hh * ar;
    if (ww > g.w) { ww = g.w; hh = ww / ar; }
    const ix = g.x + (g.w - ww) / 2;
    fc(doc, WHITE); dc(doc, BORDER); doc.setLineWidth(0.3);
    doc.roundedRect(g.x, y, g.w, hh, 2, 2, 'FD');
    try { doc.addImage(im.dataUrl, im.fmt || 'JPEG', ix, y, ww, hh, undefined, 'FAST'); } catch (_) {}
    if (multi) { // badge numéro d'étape discret
      fc(doc, NAVY); doc.circle(g.x + 3.5, y + 3.5, 2.4, 'F');
      F(doc, 'bold', 8); sc(doc, WHITE); doc.text(String(i + 1), g.x + 3.5, y + 4.4, { align: 'center' });
    }
    y += hh + 3;
  });
}

// ── Zone « Notes personnelles » vierge ──────────────────────
// Occupe toute la hauteur disponible qu'on lui passe (répartition
// intentionnelle de l'espace, jamais de grand vide résiduel).
function drawNotesArea(doc, g, h) {
  fc(doc, OFFWHITE); dc(doc, BORDER); doc.setLineWidth(0.4);
  doc.roundedRect(g.x, g.y, g.w, h, 3, 3, 'FD');
  F(doc, 'bold', 10); sc(doc, LABEL);
  doc.text('Notes personnelles', g.x + 7, g.y + 7.5);
  dc(doc, LINE_SOFT); doc.setLineWidth(0.3);
  let ly = g.y + 15;
  while (ly < g.y + h - 5) { doc.line(g.x + 7, ly, g.x + g.w - 7, ly); ly += 8.5; }
}

// ── Pieds de page uniformes ─────────────────────────────────
function drawFooters(doc, data, g) {
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const fy = g.pageH - 10;
    dc(doc, BORDER); doc.setLineWidth(0.3); doc.line(g.M, fy, g.pageW - g.M, fy);
    F(doc, 'bold', 8); sc(doc, NAVY);
    doc.text('Clinique Neurodisk', g.M, fy + 4);
    F(doc, 'normal', 8); sc(doc, MUTED);
    doc.text('Programme d\'entraînement adapté', g.pageW / 2, fy + 4, { align: 'center' });
    doc.text(`Page ${p} / ${total}`, g.pageW - g.M, fy + 4, { align: 'right' });
  }
}

// ════════════════════════════════════════════════════════════
// Entrée navigateur : charge jsPDF + QR (CDN), prépare les données,
// dessine, puis OUVRE un aperçu du PDF dans un nouvel onglet.
// ════════════════════════════════════════════════════════════
export async function generateProgramPdf(input, opts = {}) {
  const previewWin = window.open('', '_blank');
  if (previewWin) {
    previewWin.document.write('<!doctype html><title>Préparation du programme…</title><body style="font:14px system-ui;color:#5a7085;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">Préparation de votre programme…</body>');
  }

  try {
    const format = opts.format === 'a4' ? 'a4' : 'letter'; // Lettre par défaut (clinique nord-américaine)
    const [{ jsPDF }, qrmod] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm'),
      import('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm'),
    ]);
    const QR = qrmod.default || qrmod;
    const makeQr = (url) => {
      try { const q = QR(0, 'M'); q.addData(url); q.make(); return q.createDataURL(4, 2); }
      catch { return null; }
    };

    const [logoData, logoMarkData] = await Promise.all([
      loadImageData(opts.logoUrl || '/assets/logo-neurodisk.png'),
      loadImageData(opts.logoMarkUrl || '/assets/logo-neurodisk-mark.png'),
    ]);
    for (const ex of (input.exercises || [])) {
      ex.imageData = [];
      for (const url of (ex.imageUrls || []).slice(0, 4)) {
        const d = await loadImageData(url);
        if (d) ex.imageData.push(d);
      }
    }
    input.logoData = logoData || null;
    input.logoMarkData = logoMarkData || logoData || null; // repli sur le logo complet si l'icône est absente

    const doc = new jsPDF({ unit: 'mm', format, compress: true });
    drawProgram(doc, input, { makeQr });

    const safe = (input.programName || 'programme').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60);
    const filename = `Programme_${safe || 'Neurodisk'}.pdf`;
    const blobUrl = doc.output('bloburl');

    if (previewWin && !previewWin.closed) previewWin.location.href = blobUrl;
    else doc.save(filename);
    return { blobUrl, filename };
  } catch (err) {
    if (previewWin && !previewWin.closed) previewWin.close();
    throw err;
  }
}

async function loadImageData(url) {
  if (!url) return null;
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result); fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise((res) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => res({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    const fmt = /png/i.test(blob.type) ? 'PNG' : 'JPEG';
    return { dataUrl, w: dims.w, h: dims.h, fmt };
  } catch { return null; }
}
