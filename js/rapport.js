// ============================================================
// Rapport patient Neurodisk — génération Word côté navigateur.
//   Réutilise la lib `docx` chargée en UMD (window.docx).
//   Rempli depuis la BD : nom, date RX, constats cervical/lombaire,
//   plan choisi.
// ============================================================

import * as D from 'https://cdn.jsdelivr.net/npm/docx@9.7.1/+esm';

const NAVY = '1B2B6B', BLUE = '2563EB', LIGHT = 'EEF2FB', GREY = '5F6B7A';

export async function buildRapportBlob(data) {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
    AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType, HeadingLevel,
    PageNumber, ImageRun, VerticalAlign, PageBreak,
  } = D;

  // Logo
  let logoData = null;
  try { logoData = new Uint8Array(await (await fetch('/assets/logo-neurodisk.png')).arrayBuffer()); } catch {}

  const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
  const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
  const P = (text, opts = {}) => new Paragraph({ spacing: { after: 120, line: 264 }, children: [new TextRun({ text, ...opts })] });
  const bullet = (text, ref = 'bul') => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 40, line: 252 }, children: [new TextRun(text)] });
  const note = (text) => new Paragraph({
    spacing: { before: 80, after: 120 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: BLUE, space: 10 } },
    shading: { type: ShadingType.CLEAR, fill: LIGHT },
    children: [new TextRun({ text, italics: true, color: NAVY, size: 19 })],
  });
  const field = (label, value) => new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label + ' : ', bold: true, color: NAVY, size: 20 }),
      value
        ? new TextRun({ text: value, size: 20 })
        : new TextRun({ text: ' '.repeat(40), underline: {} }),
    ],
  });

  const B = { style: BorderStyle.SINGLE, size: 1, color: 'CCD6E5' };
  const borders = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };
  const cell = (txt, { w, fill, bold, color, align } = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: align || AlignmentType.LEFT, children: [new TextRun({ text: txt, bold: !!bold, color: color || '222222', size: 19 })] })],
  });
  const planTable = (rows, totalLabel, totalVal) => {
    const c1 = 7400, c2 = 1960;
    const trs = rows.map(([l, v]) => new TableRow({ children: [cell(l, { w: c1 }), cell(v, { w: c2, align: AlignmentType.CENTER, bold: true, color: NAVY })] }));
    trs.push(new TableRow({ children: [cell(totalLabel, { w: c1, fill: NAVY, bold: true, color: 'FFFFFF' }), cell(totalVal, { w: c2, fill: NAVY, bold: true, color: 'FFFFFF', align: AlignmentType.CENTER })] }));
    return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [c1, c2], borders, rows: trs });
  };

  const children = [];

  // Couverture
  if (logoData) children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 }, children: [new ImageRun({ type: 'png', data: logoData, transformation: { width: 230, height: 82 }, altText: { title: 'Neurodisk', description: 'Logo', name: 'logo' } })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Rapport des résultats et plan de traitement', bold: true, color: NAVY, size: 36 })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Décompression neuro-vertébrale et réadaptation active', color: BLUE, size: 24 })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 8 } }, children: [new TextRun({ text: 'Clinique Neurodisk  ·  443 Racine Est, Chicoutimi (Québec) G7H 1T5  ·  418 543-1113', color: GREY, size: 18 })] }));

  children.push(H2('Votre condition'));
  children.push(field('Nom du patient', data.name || ''));
  children.push(field('Radiographies effectuées le', data.rxDate || ''));
  children.push(field('Colonne cervicale', data.cervical || ''));
  children.push(field('Colonne lombaire', data.lumbar || ''));
  children.push(field('Date du rapport', new Date().toLocaleDateString('fr-CA')));

  children.push(H1('La décompression neuro-vertébrale'));
  children.push(P('En présence d’une ou de plusieurs hernies discales, la décompression neuro-vertébrale applique une traction axiale contrôlée et pilotée par ordinateur. Elle vise à réduire la pression à l’intérieur du disque afin de créer des conditions plus favorables à la cicatrisation de l’anneau et de diminuer la sollicitation des structures nerveuses. En présence d’arthrose (discopathie dégénérative), l’objectif est de réduire la charge sur le disque affaissé pour soutenir la fonction et le confort.'));
  children.push(P('La séance est généralement bien tolérée et la majorité des patients ne ressentent aucune douleur pendant le traitement. Nos appareils permettent de traiter les segments atteints aux niveaux cervical (cou) et lombaire (bas du dos).'));
  children.push(note('L’efficacité de la décompression repose sur des données cliniques de qualité variable et la réponse diffère d’une personne à l’autre; elle est réévaluée tout au long de la prise en charge. Les meilleures données actuelles soutiennent une approche qui combine la décompression à une réadaptation active (exercices, marche, autogestion) plutôt qu’au repos ou à l’immobilisation prolongés.'));

  children.push(H1('Recommandations cliniques'));
  children.push(P('Ces recommandations suivent les données probantes actuelles, qui privilégient le mouvement et déconseillent le repos et l’immobilisation prolongés.'));
  [
    'Restez actif au quotidien et reprenez la marche progressivement; évitez le repos prolongé.',
    'Durant la phase intensive, limitez temporairement les charges lourdes (p. ex. > 9 kg / 20 lb) ainsi que les flexions et torsions répétées du tronc, surtout après une séance.',
    'Portez votre soutien lombaire ou collier cervical pour des périodes ciblées, selon la recommandation, plutôt qu’en continu.',
    'Réalisez les exercices actifs de votre programme Neurodisk dès qu’ils sont tolérés.',
    'Appliquez de la glace au besoin pour le confort (15 à 20 minutes).',
    'Signalez tout changement de vos symptômes à l’équipe à chaque visite.',
  ].forEach(t => children.push(bullet(t)));

  // Suivi de la douleur (NPRS) si disponible
  if (data.nprs && data.nprs.length) {
    children.push(H2('Suivi de la douleur (0-10)'));
    const rows = data.nprs.map(r => new TableRow({ children: [
      cell(new Date(r.completed_at).toLocaleDateString('fr-CA'), { w: 4680 }),
      cell(String(r.score) + ' / 10', { w: 4680, align: AlignmentType.CENTER, bold: true, color: NAVY }),
    ] }));
    rows.unshift(new TableRow({ children: [cell('Date', { w: 4680, fill: LIGHT, bold: true, color: NAVY }), cell('Douleur', { w: 4680, fill: LIGHT, bold: true, color: NAVY, align: AlignmentType.CENTER })] }));
    children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680], borders, rows }));
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(H1('Protocole des soins'));
  children.push(H2('Première étape — 1re année (protocole initial)'));
  children.push(bullet('24 traitements intensifs : 3 par semaine pendant 8 semaines (2 premiers mois).'));
  children.push(bullet('14 traitements de stabilisation : 1/semaine pendant 3 semaines, puis 1 aux 2 semaines pendant 6 semaines, puis 1 aux 3 semaines pour la balance de l’année.'));
  children.push(H2('Deuxième étape — maintien (non inclus, à réévaluer)'));
  children.push(bullet('2e année : 18 traitements, soit 1 aux 3 semaines pendant 52 semaines.'));

  // Plan choisi
  const showAnnuel = !data.planType || data.planType === 'annuel';
  const showCombo = !data.planType || data.planType === 'combo';
  children.push(H1('Plan et tarifs' + (data.planType ? ` — ${data.planType === 'combo' ? 'combo (cervical + lombaire)' : 'annuel'}` : '')));
  if (showAnnuel) {
    children.push(H2('Plan annuel — décompression discale'));
    children.push(planTable([
      ['3 traitements/semaine pendant 8 semaines intensives (2 mois)', '24'],
      ['1 traitement/semaine pendant 3 semaines', '3'],
      ['1 traitement aux 2 semaines pendant 6 semaines', '3'],
      ['1 traitement aux 3 semaines pour la balance de l’année', '8'],
    ], 'Total des traitements', '38'));
    children.push(P('38 traitements à 140 $ = 5 320 $. 3 réévaluations incluses.', { bold: true, color: NAVY }));
    children.push(bullet('Paiement à la visite : 140 $ (ou 420 $/semaine en intensif).'));
    children.push(bullet('Mensuel : 443,33 $ × 12 versements (5 320 $ / 12 mois).'));
  }
  if (showCombo) {
    children.push(H2('Plan combo annuel — cervical et lombaire'));
    children.push(planTable([
      ['38 traitements cervicaux à 140 $', '5 320 $'],
      ['38 traitements lombaires à 140 $ (-50 %)', '2 660 $'],
      ['3 réévaluations incluses', '—'],
    ], 'Total', '7 980 $'));
    children.push(bullet('Paiement à la visite : 210 $ (ou 630 $/semaine en intensif).'));
    children.push(bullet('Mensuel : 665 $ × 12 versements (7 980 $ / 12 mois).'));
  }
  children.push(P('Des frais de 15 $ s’appliquent à tout chèque retourné. Modes acceptés : Visa, Mastercard, paiement direct, comptant, chèque.', { size: 17, color: GREY }));
  children.push(field('Date', ''));

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(H1('À faire et à ne pas faire'));
  children.push(H2('À faire'));
  [
    'Bougez régulièrement : de courtes marches et des changements de position favorisent la récupération.',
    'Reprenez vos activités progressivement, selon votre tolérance.',
    'Réalisez les exercices actifs prescrits dans votre programme Neurodisk.',
    'Portez votre soutien lombaire ou cervical pour des périodes ciblées, tel que recommandé.',
    'Signalez tout changement de symptômes à l’équipe à chaque visite.',
  ].forEach(t => children.push(bullet(t, 'check')));
  children.push(H2('À limiter ou éviter (surtout en phase intensive)'));
  [
    'Évitez l’immobilisation et le repos prolongés : ils nuisent à la récupération.',
    'Évitez les charges lourdes (> 9 kg / 20 lb) et les efforts maximaux.',
    'Limitez les flexions et torsions répétées du tronc juste après une séance.',
    'Ne reprenez pas trop vite les activités intenses, même en cas de soulagement.',
  ].forEach(t => children.push(bullet(t, 'no')));
  children.push(note('Ce document est un outil d’information et de planification. Il ne remplace pas l’évaluation et le jugement clinique du professionnel, qui adapte les recommandations à votre situation.'));

  const doc = new Document({
    creator: 'Clinique Neurodisk',
    title: 'Rapport Neurodisk',
    styles: {
      default: { document: { run: { font: 'Arial', size: 20, color: '222222' } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: NAVY, font: 'Arial' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, color: BLUE, font: 'Arial' }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 1 } },
      ],
    },
    numbering: { config: [
      { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { run: { color: BLUE }, paragraph: { indent: { left: 460, hanging: 260 } } } }] },
      { reference: 'check', levels: [{ level: 0, format: LevelFormat.BULLET, text: '✓', alignment: AlignmentType.LEFT, style: { run: { color: '1E8A4C' }, paragraph: { indent: { left: 460, hanging: 260 } } } }] },
      { reference: 'no', levels: [{ level: 0, format: LevelFormat.BULLET, text: '✕', alignment: AlignmentType.LEFT, style: { run: { color: 'C0392B' }, paragraph: { indent: { left: 460, hanging: 260 } } } }] },
    ] },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCD6E5', space: 4 } }, children: [new TextRun({ text: 'Clinique Neurodisk', color: NAVY, bold: true, size: 16 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Clinique Neurodisk  ·  418 543-1113  ·  Page ', color: GREY, size: 15 }), new TextRun({ children: [PageNumber.CURRENT], color: GREY, size: 15 }), new TextRun({ text: ' de ', color: GREY, size: 15 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GREY, size: 15 })] })] }) },
      children,
    }],
  });

  return Packer.toBlob(doc);
}
