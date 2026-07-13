// ============================================================
// Génération du PDF « Programme d'entraînement adapté » (Neurodisk)
//
// Rendu vectoriel dans l'application (jsPDF) — texte sélectionnable,
// liens vidéo cliquables, images nettes, aucun en-tête/pied de page
// du navigateur. Aucune donnée envoyée à un service externe : jsPDF et
// qrcode-generator sont chargés en modules (CDN jsDelivr, déjà autorisé
// par la CSP) et tout le rendu se fait côté client.
//
// Le cœur `drawProgram()` est une fonction pure à dépendances injectées,
// réutilisée telle quelle par le banc d'essai Node (tools/gen_sample_program_pdf.mjs)
// pour générer et inspecter de vrais PDF.
// ============================================================

// ── Palette clinique ────────────────────────────────────────
const NAVY       = [11, 31, 58];
const BLUE       = [24, 95, 165];
const BLUE_SOFT  = [234, 242, 251];
const BORDER     = [216, 222, 232];
const TEXT       = [40, 54, 79];
const MUTED      = [90, 112, 133];
const WATCH_BG   = [251, 241, 239];
const WATCH_BD   = [235, 211, 205];
const WATCH_TX   = [122, 46, 37];
const NOTE_BG    = [255, 249, 236];
const NOTE_BD    = [201, 162, 39];
const NOTE_TX    = [92, 74, 18];
const BG_SOFT    = [248, 250, 252];

const PT = 0.352778; // 1pt en mm

// ── Normalisation du dosage (présentation seulement) ────────
// Ne modifie PAS la prescription : réordonne et uniformise l'affichage.
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

// Uniformise « sec/s » → « secondes », « 2x/jour » → « 2 fois par jour »
// sans réécrire la valeur clinique saisie par le professionnel.
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

// ── Utilitaires de dessin ───────────────────────────────────
function rc(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
function sc(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
function dc(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }

// ── Cœur : dessine le programme dans un doc jsPDF ───────────
// deps: { makeQr(url) -> dataURL PNG | null }
// data: voir tools/gen_sample_program_pdf.mjs pour la forme complète.
export function drawProgram(doc, data, deps = {}) {
  const makeQr = deps.makeQr || (() => null);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15;                 // marge latérale
  const TOP = 14, BOT = 16;     // marge haut / bas (bas = espace pied de page)
  const CW = pageW - 2 * M;     // largeur de contenu
  const contentBottom = pageH - BOT;

  doc.setFont('helvetica', 'normal');

  // ══ PAGE 1 — page d'accueil compacte (fusionnée) ══
  drawCover(doc, data, { pageW, pageH, M, TOP, CW });

  // ══ PAGES SUIVANTES — exercices, 2 par page si l'espace le permet ══
  const exercises = data.exercises || [];
  if (exercises.length) {
    doc.addPage();
    let y = TOP;
    y = drawExercisesHeader(doc, data, { M, TOP, CW, y });

    for (const ex of exercises) {
      const h = measureExercise(doc, ex, CW);
      // Nouveau bloc : ne pas couper entre deux pages.
      if (y + h > contentBottom) {
        doc.addPage();
        y = TOP;
      }
      drawExercise(doc, ex, { x: M, y, w: CW }, { makeQr });
      y += h + 6; // espace inter-bloc
    }
  }

  // ══ Pieds de page (numérotation discrète Neurodisk) ══
  drawFooters(doc, { pageW, pageH, M });
}

// ── Page d'accueil ──────────────────────────────────────────
function drawCover(doc, data, g) {
  const { pageW, M, CW } = g;
  let y = g.TOP;

  // Bandeau navy avec logo + titres
  const bandH = 30;
  rc(doc, NAVY);
  doc.roundedRect(M, y, CW, bandH, 3, 3, 'F');

  // Logo (pastille blanche)
  const logoBox = 20;
  const logoX = M + 6, logoY = y + (bandH - logoBox) / 2;
  if (data.logoData) {
    rc(doc, [255, 255, 255]);
    doc.roundedRect(logoX, logoY, logoBox, logoBox, 2, 2, 'F');
    try { doc.addImage(data.logoData, 'PNG', logoX + 2, logoY + 2, logoBox - 4, logoBox - 4, undefined, 'FAST'); } catch (_) {}
  }

  const tx = M + (data.logoData ? logoBox + 12 : 8);
  sc(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('CLINIQUE NEURODISK', tx, y + 8);
  doc.setFontSize(17);
  doc.text('Programme d\'entraînement adapté', tx, y + 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
  sc(doc, [220, 230, 245]);
  doc.text('Plan d\'exercices personnalisé', tx, y + 24);

  y += bandH + 8;

  // Bloc d'informations (patient / pro / date / programme / région)
  const rows = [
    ['Patient', data.patientName || '—'],
    ['Professionnel', data.professionalName || 'Votre professionnel Neurodisk'],
    ['Date du programme', data.createdDate || '—'],
    ['Programme', data.programName || '—'],
  ];
  if (data.region) rows.push(['Région ciblée', data.region]);

  const rowH = 8;
  const infoH = rows.length * rowH + 6;
  rc(doc, BLUE_SOFT); dc(doc, BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, infoH, 2.5, 2.5, 'FD');
  let ry = y + 3 + rowH / 2 + 1;
  doc.setFontSize(10);
  rows.forEach((r, i) => {
    sc(doc, MUTED); doc.setFont('helvetica', 'normal');
    doc.text(r[0], M + 6, ry);
    sc(doc, NAVY); doc.setFont('helvetica', 'bold');
    doc.text(String(r[1]), pageW - M - 6, ry, { align: 'right', maxWidth: CW - 55 });
    if (i < rows.length - 1) { dc(doc, [220, 228, 240]); doc.setLineWidth(0.2); doc.line(M + 6, ry + rowH / 2 - 1, pageW - M - 6, ry + rowH / 2 - 1); }
    ry += rowH;
  });
  y += infoH + 8;

  // Encadré clinique rassurant
  const introTxt = 'Ce programme a été conçu pour vous aider à bouger progressivement, renforcer les bonnes zones et améliorer votre confort au quotidien.';
  y = drawSoftBox(doc, introTxt, { x: M, y, w: CW });
  y += 7;

  // Objectifs
  const objectives = (data.objectives && data.objectives.length)
    ? data.objectives
    : ['Améliorer le contrôle du mouvement', 'Renforcer progressivement les zones ciblées', 'Réduire les irritations liées aux positions prolongées', 'Favoriser un retour sécuritaire aux activités'];
  y = drawSection(doc, 'Objectifs du programme', objectives, { x: M, y, w: CW });
  y += 4;

  // Comment utiliser
  y = drawSection(doc, 'Comment utiliser votre programme', [
    'Faites les exercices dans l\'ordre présenté.',
    'Respectez le dosage indiqué pour chaque exercice.',
    'La qualité du mouvement est plus importante que la quantité.',
    'Respirez normalement pendant les exercices.',
  ], { x: M, y, w: CW });
  y += 4;

  // Précautions générales
  y = drawSection(doc, 'Précautions générales', [
    'Faites les mouvements lentement et sans forcer.',
    'Respectez vos douleurs : un léger inconfort est acceptable, une douleur vive ne l\'est pas.',
    'Cessez l\'exercice si la douleur augmente fortement, descend dans la jambe ou provoque des engourdissements importants.',
    'Communiquez avec votre professionnel si vos symptômes changent.',
  ], { x: M, y, w: CW });
}

function drawSoftBox(doc, txt, g) {
  const padX = 5, padY = 4, lh = 10 * PT * 1.35;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const lines = doc.splitTextToSize(txt, g.w - 2 * padX);
  const h = lines.length * lh + 2 * padY;
  rc(doc, BLUE_SOFT); dc(doc, BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(g.x, g.y, g.w, h, 2, 2, 'FD');
  // barre latérale navy
  rc(doc, NAVY); doc.rect(g.x, g.y, 1.4, h, 'F');
  sc(doc, [38, 54, 79]);
  doc.text(lines, g.x + padX, g.y + padY + lh * 0.75);
  return g.y + h;
}

function drawSection(doc, title, items, g) {
  let y = g.y;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
  sc(doc, NAVY);
  doc.text(title, g.x, y + 4);
  y += 5.5;
  dc(doc, BLUE_SOFT); doc.setLineWidth(0.6);
  doc.line(g.x, y, g.x + g.w, y);
  y += 4;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  sc(doc, TEXT);
  const lh = 10 * PT * 1.35;
  const bulletX = g.x + 1.5, textX = g.x + 6, textW = g.w - 6;
  items.forEach(it => {
    const lines = doc.splitTextToSize(it, textW);
    rc(doc, NAVY);
    doc.circle(bulletX, y - 1.1, 0.9, 'F');
    doc.text(lines, textX, y);
    y += lines.length * lh + 1.5;
  });
  return y;
}

// ── En-tête au-dessus des exercices ─────────────────────────
function drawExercisesHeader(doc, data, g) {
  let y = g.y;
  if (data.logoData) {
    try { doc.addImage(data.logoData, 'PNG', g.M, y, 8, 8, undefined, 'FAST'); } catch (_) {}
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  sc(doc, NAVY);
  doc.text('Programme d\'entraînement adapté', g.M + (data.logoData ? 11 : 0), y + 6);
  y += 11;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  sc(doc, MUTED);
  const meta = [data.professionalName || 'Votre professionnel Neurodisk', data.createdDate].filter(Boolean).join('  ·  ');
  doc.text(meta, g.M, y);
  y += 3;
  dc(doc, BORDER); doc.setLineWidth(0.5);
  doc.line(g.M, y, g.M + g.CW, y);
  return y + 6;
}

// ── Mesure de la hauteur d'un bloc d'exercice ───────────────
const EX = {
  headH: 7, pad: 5, imgColW: 60, colGap: 6,
  nameSize: 13, catSize: 8, doseSize: 10, labelSize: 8, textSize: 9.5,
};

function exTextColW(cw) { return cw - EX.imgColW - EX.colGap - 2 * EX.pad; }

function measureExercise(doc, ex, cw) {
  const textW = exTextColW(cw);
  let h = EX.headH + EX.pad;

  // Colonne texte
  doc.setFontSize(EX.nameSize);
  const nameLines = doc.splitTextToSize(ex.name || '', textW);
  let textH = nameLines.length * EX.nameSize * PT * 1.2 + 1.5;
  if (ex.category) textH += 5.5;

  const doseLines = normalizeDosageLines(ex.dosage);
  if (doseLines.length) textH += 4 + doseLines.length * (EX.doseSize * PT * 1.35) + 4;

  doc.setFontSize(EX.textSize);
  if (ex.consignes) textH += 6.5 + doc.splitTextToSize(ex.consignes, textW).length * EX.textSize * PT * 1.35 + 2;
  if (ex.surveiller) textH += 4.5 + doc.splitTextToSize(ex.surveiller, textW - 6).length * EX.textSize * PT * 1.35 + 5;
  if (ex.note) textH += doc.splitTextToSize(ex.note, textW - 6).length * EX.textSize * PT * 1.35 + 7;
  if (ex.videoUrl) textH += 16;

  // Colonne image
  const imgH = imageStackHeight(ex);

  h += Math.max(textH, imgH) + EX.pad;
  return h;
}

function imageStackHeight(ex) {
  const imgs = (ex.imageData || []).slice(0, 3);
  if (!imgs.length) return 34; // placeholder
  const w = EX.imgColW;
  let total = 0;
  imgs.forEach((im, i) => {
    const ar = (im.w && im.h) ? im.w / im.h : 1.4;
    let hh = w / ar;
    hh = Math.min(hh, 48);
    total += hh + (i > 0 ? 3 : 0);
  });
  return Math.max(total, 30);
}

// ── Dessin d'un bloc d'exercice ─────────────────────────────
function drawExercise(doc, ex, box, deps) {
  const { x, y, w } = box;
  const h = measureExercise(doc, ex, w);

  // Cadre
  rc(doc, [255, 255, 255]); dc(doc, BORDER); doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');

  // Bandeau numéro
  rc(doc, NAVY);
  doc.roundedRect(x, y, w, EX.headH, 2.5, 2.5, 'F');
  doc.rect(x, y + EX.headH - 3, w, 3, 'F'); // coin bas droit du bandeau
  sc(doc, [255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(`EXERCICE ${ex.index}`, x + EX.pad, y + 4.9);

  const bodyY = y + EX.headH + EX.pad;
  const imgX = x + EX.pad;
  const textX = x + EX.pad + EX.imgColW + EX.colGap;
  const textW = exTextColW(w);

  // ── Colonne image ──
  drawImageStack(doc, ex, { x: imgX, y: bodyY, w: EX.imgColW });

  // ── Colonne texte ──
  let ty = bodyY + 1;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(EX.nameSize); sc(doc, NAVY);
  const nameLines = doc.splitTextToSize(ex.name || '', textW);
  doc.text(nameLines, textX, ty + EX.nameSize * PT * 0.9);
  ty += nameLines.length * EX.nameSize * PT * 1.2 + 1.5;

  if (ex.category) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(EX.catSize);
    const cat = ex.category.toUpperCase();
    const cw = doc.getTextWidth(cat) + 6;
    rc(doc, BLUE_SOFT); dc(doc, BORDER); doc.setLineWidth(0.2);
    doc.roundedRect(textX, ty - 0.5, cw, 4.6, 1.2, 1.2, 'FD');
    sc(doc, NAVY);
    doc.text(cat, textX + 3, ty + 2.7);
    ty += 5.5;
  }

  // Dosage
  const doseLines = normalizeDosageLines(ex.dosage);
  if (doseLines.length) {
    ty += 2;
    const dlh = EX.doseSize * PT * 1.35;
    const boxH = doseLines.length * dlh + 4;
    rc(doc, BLUE_SOFT); dc(doc, BORDER); doc.setLineWidth(0.25);
    doc.roundedRect(textX, ty, textW, boxH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(EX.doseSize); sc(doc, NAVY);
    let dy = ty + 3;
    doseLines.forEach((l, i) => {
      if (i === 0) doc.setFont('helvetica', 'bold'); else doc.setFont('helvetica', 'normal');
      doc.text(l, textX + 3, dy);
      dy += dlh;
    });
    ty += boxH + 4;
  }

  // Consignes
  if (ex.consignes) {
    ty = drawTextBlock(doc, 'CONSIGNES', ex.consignes, { x: textX, y: ty, w: textW }, { labelColor: MUTED, textColor: TEXT });
    ty += 2;
  }

  // À surveiller
  if (ex.surveiller) {
    const tlh = EX.textSize * PT * 1.35;
    const lines = doc.splitTextToSize(ex.surveiller, textW - 6);
    const boxH = lines.length * tlh + 7;
    rc(doc, WATCH_BG); dc(doc, WATCH_BD); doc.setLineWidth(0.25);
    doc.roundedRect(textX, ty, textW, boxH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(EX.labelSize); sc(doc, WATCH_TX);
    doc.text('À SURVEILLER', textX + 3, ty + 3.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(EX.textSize); sc(doc, WATCH_TX);
    doc.text(lines, textX + 3, ty + 7);
    ty += boxH + 3;
  }

  // Note du professionnel
  if (ex.note) {
    const tlh = EX.textSize * PT * 1.35;
    const lines = doc.splitTextToSize(ex.note, textW - 6);
    const boxH = lines.length * tlh + 7;
    rc(doc, NOTE_BG); doc.setLineWidth(0);
    doc.roundedRect(textX, ty, textW, boxH, 1.5, 1.5, 'F');
    rc(doc, NOTE_BD); doc.rect(textX, ty, 1.4, boxH, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(EX.labelSize); sc(doc, NOTE_TX);
    doc.text('NOTE DE VOTRE PROFESSIONNEL', textX + 4, ty + 3.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(EX.textSize); sc(doc, NOTE_TX);
    doc.text(lines, textX + 4, ty + 7);
    ty += boxH + 3;
  }

  // Accès vidéo : lien cliquable + QR
  if (ex.videoUrl) {
    const qr = deps.makeQr ? deps.makeQr(ex.videoUrl) : null;
    const qrSize = 13;
    dc(doc, BORDER); doc.setLineWidth(0.2);
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.line(textX, ty, textX + textW, ty);
    doc.setLineDashPattern([], 0);
    ty += 3.5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); sc(doc, BLUE);
    const label = 'Voir la vidéo de démonstration';
    doc.textWithLink(label, textX, ty + 2, { url: ex.videoUrl });
    const lw = doc.getTextWidth(label);
    doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]); doc.setLineWidth(0.3);
    doc.line(textX, ty + 3, textX + lw, ty + 3); // soulignement
    doc.setFontSize(7.5); sc(doc, MUTED); doc.setFont('helvetica', 'normal');
    doc.text('Scannez le code ou touchez le lien', textX, ty + 7.5);
    if (qr) {
      try {
        const qx = textX + textW - qrSize;
        doc.addImage(qr, 'PNG', qx, ty - 2, qrSize, qrSize, undefined, 'FAST');
        doc.link(qx, ty - 2, qrSize, qrSize, { url: ex.videoUrl });
      } catch (_) {}
    }
  }
}

function drawTextBlock(doc, label, txt, g, colors) {
  let y = g.y;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(EX.labelSize); sc(doc, colors.labelColor);
  doc.text(label, g.x, y + 2.5);
  y += 6.5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(EX.textSize); sc(doc, colors.textColor);
  const lines = doc.splitTextToSize(txt, g.w);
  doc.text(lines, g.x, y);
  return y + lines.length * EX.textSize * PT * 1.35;
}

function drawImageStack(doc, ex, g) {
  const imgs = (ex.imageData || []).slice(0, 3);
  if (!imgs.length) {
    rc(doc, BG_SOFT); dc(doc, BORDER); doc.setLineWidth(0.3);
    doc.roundedRect(g.x, g.y, g.w, 30, 2, 2, 'FD');
    doc.setFontSize(8); sc(doc, MUTED); doc.setFont('helvetica', 'normal');
    doc.text('Voir la vidéo', g.x + g.w / 2, g.y + 16, { align: 'center' });
    return;
  }
  let y = g.y;
  imgs.forEach((im) => {
    const ar = (im.w && im.h) ? im.w / im.h : 1.4;
    let hh = Math.min(g.w / ar, 48);
    let ww = hh * ar;
    if (ww > g.w) { ww = g.w; hh = ww / ar; }
    const ix = g.x + (g.w - ww) / 2;
    rc(doc, BG_SOFT); dc(doc, BORDER); doc.setLineWidth(0.3);
    doc.roundedRect(g.x, y, g.w, hh, 2, 2, 'FD');
    try { doc.addImage(im.dataUrl, im.fmt || 'JPEG', ix, y, ww, hh, undefined, 'FAST'); } catch (_) {}
    y += hh + 3;
  });
}

// ── Pieds de page (numérotation discrète) ───────────────────
function drawFooters(doc, g) {
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const fy = g.pageH - 9;
    dc(doc, BORDER); doc.setLineWidth(0.3);
    doc.line(g.M, fy, g.pageW - g.M, fy);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); sc(doc, MUTED);
    doc.text('Neurodisk — Programme d\'entraînement adapté', g.M, fy + 4);
    doc.text(`Page ${p} / ${total}`, g.pageW - g.M, fy + 4, { align: 'right' });
  }
}

// ════════════════════════════════════════════════════════════
// Entrée navigateur : charge jsPDF + QR (CDN), prépare les données,
// dessine, puis télécharge le fichier.
// ════════════════════════════════════════════════════════════
export async function generateProgramPdf(input, opts = {}) {
  const format = opts.format === 'letter' ? 'letter' : 'a4';
  const [{ jsPDF }, qrmod] = await Promise.all([
    import('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm'),
    import('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm'),
  ]);
  const QR = qrmod.default || qrmod;
  const makeQr = (url) => {
    try { const q = QR(0, 'M'); q.addData(url); q.make(); return q.createDataURL(4, 2); }
    catch { return null; }
  };

  // Charge le logo + toutes les images d'exercice en dataURL (avec dimensions).
  const logoData = await loadImageData(opts.logoUrl || '/assets/logo-neurodisk.png');
  for (const ex of (input.exercises || [])) {
    ex.imageData = [];
    for (const url of (ex.imageUrls || []).slice(0, 3)) {
      const d = await loadImageData(url);
      if (d) ex.imageData.push(d);
    }
  }
  input.logoData = logoData?.dataUrl || null;

  const doc = new jsPDF({ unit: 'mm', format, compress: true });
  drawProgram(doc, input, { makeQr });

  const safe = (input.programName || 'programme').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  doc.save(`Programme_${safe || 'Neurodisk'}.pdf`);
}

// Charge une image (même origine ou CORS Supabase) en dataURL + dimensions.
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
