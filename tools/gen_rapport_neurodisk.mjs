import fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, BorderStyle, WidthType,
  ShadingType, HeadingLevel, PageNumber, ImageRun, VerticalAlign, PageBreak,
} from 'docx';

const NAVY = '1B2B6B';
const BLUE = '2563EB';
const LIGHT = 'EEF2FB';
const GREY = '5F6B7A';

const logo = fs.readFileSync('assets/logo-neurodisk.png');

// ---- helpers ---------------------------------------------------------------
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 264 },
  children: [new TextRun({ text, ...opts })],
});
const bullet = (text, ref = 'bul') => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 40, line: 252 },
  children: Array.isArray(text) ? text : [new TextRun(text)],
});
const note = (text) => new Paragraph({
  spacing: { before: 80, after: 120 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: BLUE, space: 10 } },
  shading: { type: ShadingType.CLEAR, fill: LIGHT },
  children: [new TextRun({ text, italics: true, color: NAVY, size: 19 })],
});

const cell = (children, { w, fill, bold, color, align } = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
  margins: { top: 60, bottom: 60, left: 110, right: 110 },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({
    alignment: align || AlignmentType.LEFT,
    children: [new TextRun({ text: children, bold: !!bold, color: color || '222222', size: 19 })],
  })],
});

const B = { style: BorderStyle.SINGLE, size: 1, color: 'CCD6E5' };
const borders = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };

// Tableau de plan (lignes [label, valeur])
function planTable(rows, totalLabel, totalVal) {
  const W = 9360, c1 = 7400, c2 = 1960;
  const trs = rows.map(([l, v]) => new TableRow({ children: [
    cell(l, { w: c1 }),
    cell(v, { w: c2, align: AlignmentType.CENTER, bold: true, color: NAVY }),
  ] }));
  trs.push(new TableRow({ children: [
    cell(totalLabel, { w: c1, fill: NAVY, bold: true, color: 'FFFFFF' }),
    cell(totalVal, { w: c2, fill: NAVY, bold: true, color: 'FFFFFF', align: AlignmentType.CENTER }),
  ] }));
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [c1, c2], borders, rows: trs });
}

// Champ à remplir : "Label : ____"
const field = (label) => new Paragraph({
  spacing: { after: 80 },
  children: [
    new TextRun({ text: label + ' : ', bold: true, color: NAVY, size: 20 }),
    new TextRun({ text: ' '.repeat(40), underline: {} }),
  ],
});

// ---------------------------------------------------------------------------
const children = [];

// ===== PAGE COUVERTURE =====
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 },
  children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 230, height: 82 },
    altText: { title: 'Neurodisk', description: 'Logo Clinique Neurodisk', name: 'logo' } })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
  children: [new TextRun({ text: 'Rapport des résultats et plan de traitement', bold: true, color: NAVY, size: 36 })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
  children: [new TextRun({ text: 'Décompression neuro-vertébrale et réadaptation active', color: BLUE, size: 24 })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 8 } },
  children: [new TextRun({ text: 'Clinique Neurodisk  ·  443 Racine Est, Chicoutimi (Québec) G7H 1T5  ·  418 543-1113', color: GREY, size: 18 })] }));

children.push(H2('Votre condition'));
children.push(field('Nom du patient'));
children.push(field('Radiographies effectuées le'));
children.push(field('Colonne cervicale'));
children.push(field('Colonne lombaire'));
children.push(field('Date du rapport'));

// ===== SECTION 1 — La décompression =====
children.push(H1('La décompression neuro-vertébrale'));
children.push(P('En présence d’une ou de plusieurs hernies discales, la décompression neuro-vertébrale applique une traction axiale contrôlée et pilotée par ordinateur. Elle vise à réduire la pression à l’intérieur du disque afin de créer des conditions plus favorables à la cicatrisation de l’anneau et de diminuer la sollicitation des structures nerveuses. En présence d’arthrose (discopathie dégénérative), l’objectif est de réduire la charge sur le disque affaissé pour soutenir la fonction et le confort.'));
children.push(P('La séance est généralement bien tolérée et la majorité des patients ne ressentent aucune douleur pendant le traitement. Nos appareils permettent de traiter les segments atteints aux niveaux cervical (cou) et lombaire (bas du dos).'));
children.push(note('L’efficacité de la décompression repose sur des données cliniques de qualité variable et la réponse diffère d’une personne à l’autre; elle est réévaluée tout au long de la prise en charge. Les meilleures données actuelles soutiennent une approche qui combine la décompression à une réadaptation active (exercices, marche, autogestion) plutôt qu’au repos ou à l’immobilisation prolongés.'));

// ===== SECTION 2 — Approche combinée =====
children.push(H1('Une approche combinée'));
children.push(P('Votre plan associe la décompression à un programme d’exercices actifs personnalisé, accessible sur la plateforme Neurodisk. Cette combinaison vise trois objectifs :'));
children.push(bullet([new TextRun({ text: 'Objectif 1 — ', bold: true, color: NAVY }), new TextRun('limiter la progression de l’atteinte du ou des disques concernés.')]));
children.push(bullet([new TextRun({ text: 'Objectif 2 — ', bold: true, color: NAVY }), new TextRun('en présence d’un bombement ou d’une hernie, réduire la pression intradiscale pour favoriser un environnement de cicatrisation et diminuer la pression sur les structures nerveuses.')]));
children.push(bullet([new TextRun({ text: 'Objectif 3 — ', bold: true, color: NAVY }), new TextRun('restaurer progressivement la mobilité, la force et la fonction par l’exercice actif et l’autogestion.')]));

// ===== SECTION 3 — Recommandations =====
children.push(H1('Recommandations cliniques'));
children.push(P('Ces recommandations s’appliquent aux atteintes cervicales et lombaires. Elles suivent les données probantes actuelles, qui privilégient le mouvement et déconseillent le repos et l’immobilisation prolongés.'));
children.push(bullet('Restez actif au quotidien et reprenez la marche progressivement; évitez le repos prolongé.'));
children.push(bullet('Durant la phase intensive, limitez temporairement les charges lourdes (p. ex. > 9 kg / 20 lb) ainsi que les flexions et torsions répétées ou chargées du tronc, surtout dans les heures suivant une séance.'));
children.push(bullet('Portez votre soutien lombaire ou votre collier cervical pour des périodes ciblées, selon la recommandation du clinicien, plutôt qu’en continu, afin d’éviter le déconditionnement musculaire.'));
children.push(bullet('Réalisez les exercices actifs de votre programme Neurodisk dès qu’ils sont tolérés.'));
children.push(bullet('Appliquez de la glace au besoin pour le confort (environ 15 à 20 minutes).'));
children.push(bullet('Hydratez-vous bien; la modération des breuvages diurétiques (café, alcool) peut aider au confort.'));
children.push(bullet('Signalez tout changement de vos symptômes à l’équipe à chaque visite.'));
children.push(note('Courbe de douleur : l’évolution présentée à titre indicatif est une estimation fondée sur des observations cliniques. L’évolution réelle varie d’une personne à l’autre et n’est pas garantie.'));

// ===== SECTION 4 — Protocole =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Protocole des soins'));
children.push(H2('Première étape — 1re année (protocole initial)'));
children.push(P('Recommandé pour toutes les conditions discales.'));
children.push(bullet('24 traitements intensifs : 3 traitements par semaine pendant 8 semaines (2 premiers mois).'));
children.push(bullet('14 traitements de stabilisation (10 mois suivants) : 1 par semaine pendant 3 semaines, puis 1 aux 2 semaines pendant 6 semaines, puis 1 aux 3 semaines pour la balance de l’année.'));
children.push(H2('Deuxième étape — maintien (non inclus, à réévaluer)'));
children.push(bullet('2e année : 18 traitements, soit 1 traitement aux 3 semaines pendant 52 semaines.'));

// ===== SECTION 5 — Plans et tarifs =====
children.push(H1('Plans et tarifs'));
children.push(H2('Plan annuel — décompression discale'));
children.push(planTable([
  ['3 traitements/semaine pendant 8 semaines intensives (2 mois)', '24'],
  ['1 traitement/semaine pendant 3 semaines', '3'],
  ['1 traitement aux 2 semaines pendant 6 semaines', '3'],
  ['1 traitement aux 3 semaines pour la balance de l’année', '8'],
], 'Total des traitements', '38'));
children.push(P('38 traitements à 140 $ = 5 320 $. 3 réévaluations incluses.', { bold: true, color: NAVY }));
children.push(bullet('Paiement à la visite : 140 $ avant chaque séance (ou 420 $/semaine durant l’intensif).'));
children.push(bullet('Paiement mensuel (chèques postdatés ou carte) : 443,33 $ × 12 versements (5 320 $ / 12 mois).'));

children.push(H2('Plan combo annuel — cervical et lombaire'));
children.push(planTable([
  ['38 traitements cervicaux à 140 $', '5 320 $'],
  ['38 traitements lombaires à 140 $ (-50 %)', '2 660 $'],
  ['3 réévaluations incluses', '—'],
], 'Total', '7 980 $'));
children.push(bullet('Paiement à la visite : 210 $ avant chaque séance (ou 630 $/semaine durant l’intensif).'));
children.push(bullet('Paiement mensuel (chèques postdatés ou carte) : 665 $ × 12 versements (7 980 $ / 12 mois).'));
children.push(P('Des frais de 15 $ s’appliquent à tout chèque retourné. Le plan se termine au terme des 12 mois. Modes acceptés : Visa, Mastercard, paiement direct, comptant, chèque.', { size: 17, color: GREY }));
children.push(field('Date'));

// ===== SECTION 6 — Visites + À faire / À ne pas faire =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Vos visites'));
children.push(bullet('Arrivez quelques minutes avant votre rendez-vous (20 minutes pour le lombaire, afin de profiter de l’infrarouge qui réchauffe le dos).'));
children.push(bullet('Mettez des chaussures d’intérieur, rangez votre manteau au vestiaire et éteignez votre téléphone.'));
children.push(bullet('Passez à la réception pour le paiement, puis suivez les instructions des techniciennes.'));
children.push(bullet('Le traitement s’effectue en douceur : laissez-vous relaxer.'));
children.push(bullet('Après la séance, appliquez de la glace environ 10 minutes au besoin et évitez les efforts intenses dans les heures qui suivent.'));

children.push(H1('À faire et à ne pas faire'));
children.push(H2('À faire'));
children.push(bullet('Bougez régulièrement : de courtes marches et des changements de position favorisent la récupération.', 'check'));
children.push(bullet('Reprenez vos activités progressivement, selon votre tolérance.', 'check'));
children.push(bullet('Réalisez les exercices actifs prescrits dans votre programme Neurodisk.', 'check'));
children.push(bullet('Soignez vos postures assises, debout et couchées.', 'check'));
children.push(bullet('Portez votre soutien lombaire ou cervical pour des périodes ciblées, tel que recommandé.', 'check'));
children.push(bullet('Signalez tout changement de symptômes à l’équipe à chaque visite.', 'check'));
children.push(H2('À limiter ou éviter (surtout durant la phase intensive)'));
children.push(bullet('Évitez l’immobilisation et le repos prolongés : ils nuisent à la récupération.', 'no'));
children.push(bullet('Évitez les charges lourdes (> 9 kg / 20 lb) et les efforts maximaux.', 'no'));
children.push(bullet('Limitez les flexions et torsions répétées ou chargées du tronc juste après une séance.', 'no'));
children.push(bullet('Ne reprenez pas trop vite les activités intenses, même en cas de soulagement.', 'no'));
children.push(bullet('Évitez les talons hauts s’ils causent de l’inconfort.', 'no'));

children.push(H1('Recommandations au patient'));
children.push(P('Procurez-vous un soutien lombaire adéquat et apportez-le dès la première séance. Utilisé pour des périodes ciblées (notamment lors des déplacements en véhicule ou des activités sollicitant le tronc durant la période de traitement), il offre un appui temporaire. Évitez toutefois de le porter en continu : un usage prolongé peut favoriser le déconditionnement.'));
children.push(P('Votre adhésion au protocole et votre participation active sont déterminantes pour les résultats. Considérez cette période comme un temps de récupération, en combinant le repos relatif, le mouvement et les exercices prescrits.'));
children.push(note('Ce document est un outil d’information et de planification. Il ne remplace pas l’évaluation et le jugement clinique du professionnel, qui adapte les recommandations à votre situation.'));

// ---------------------------------------------------------------------------
const doc = new Document({
  creator: 'Clinique Neurodisk',
  title: 'Rapport Neurodisk',
  styles: {
    default: { document: { run: { font: 'Arial', size: 20, color: '222222' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: NAVY, font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, color: BLUE, font: 'Arial' },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { run: { color: BLUE }, paragraph: { indent: { left: 460, hanging: 260 } } } }] },
    { reference: 'check', levels: [{ level: 0, format: LevelFormat.BULLET, text: '✓', alignment: AlignmentType.LEFT,
      style: { run: { color: '1E8A4C' }, paragraph: { indent: { left: 460, hanging: 260 } } } }] },
    { reference: 'no', levels: [{ level: 0, format: LevelFormat.BULLET, text: '✕', alignment: AlignmentType.LEFT,
      style: { run: { color: 'C0392B' }, paragraph: { indent: { left: 460, hanging: 260 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
    headers: { default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCD6E5', space: 4 } },
      children: [new TextRun({ text: 'Clinique Neurodisk', color: NAVY, bold: true, size: 16 })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Clinique Neurodisk  ·  418 543-1113  ·  Page ', color: GREY, size: 15 }),
        new TextRun({ children: [PageNumber.CURRENT], color: GREY, size: 15 }),
        new TextRun({ text: ' de ', color: GREY, size: 15 }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GREY, size: 15 }),
      ] })] }) },
    children,
  }],
});

const out = 'C:/Users/gabgi/Downloads/Rapport_Neurodisk.docx';
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log('OK', out, buf.length); });
