import fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  HeadingLevel, PageNumber, ImageRun, VerticalAlign,
} from 'docx';

const NAVY = '1B2B6B', BLUE = '2563EB', LIGHT = 'EEF2FB', GREY = '5F6B7A';
const logo = fs.readFileSync('assets/logo-neurodisk.png');

const COND_LABEL = {
  trousse_depart: 'Trousse de départ', hernie_discale: 'Hernie discale', sciatique: 'Sciatique',
  radiculopathie: 'Radiculopathie', stenose_foraminale: 'Sténose foraminale', stenose_spinale: 'Sténose spinale',
  arthrose_cervicale: 'Arthrose cervicale', arthrose_lombaire: 'Arthrose lombaire',
  spondylolyse: 'Spondylolyse', spondylolisthesis: 'Spondylolisthésis', autre: 'Autre',
};

function parseSql(path) {
  const sql = fs.readFileSync(path, 'utf8');
  const re = /\(\$d\$(.*?)\$d\$,\s*\$d\$(.*?)\$d\$,\s*\$d\$(.*?)\$d\$,\s*ARRAY\[(.*?)\]\)/gs;
  const rows = [];
  let m;
  while ((m = re.exec(sql)) !== null) {
    const title = m[1].trim();
    const descr = m[2];
    const muscle = m[3].trim();
    const conds = m[4].split(',').map(s => s.trim().replace(/^'|'$/g, ''));
    let film = '';
    const i = descr.search(/À filmer/i);
    if (i >= 0) {
      film = descr.slice(i).replace(/^À filmer\s*[:\-—]?\s*/i, '').trim();
      film = film.replace(/\$d\$\s*$/, '').replace(/\s*\.\s*$/, '').trim();
    }
    rows.push({ title, muscle, conds, film });
  }
  return rows;
}

const base = parseSql('supabase/migrations/016_exercise_bank.sql');
const adv = parseSql('supabase/migrations/017_exercise_bank_advanced.sql');

const p1 = base.filter(e => e.conds.includes('trousse_depart'));
const p2 = base.filter(e => !e.conds.includes('trousse_depart'));
const p3 = adv;

// ---- rendu ----------------------------------------------------------------
const B = { style: BorderStyle.SINGLE, size: 1, color: 'CCD6E5' };
const borders = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };
const W = 9360, C = [360, 3000, 3600, 2400];

function tc(children, w, opts = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    verticalAlign: VerticalAlign.CENTER,
    children,
  });
}
const run = (text, o = {}) => new TextRun({ text, size: 17, ...o });
const para = (children, o = {}) => new Paragraph({ spacing: { after: 0, line: 240 }, children, ...o });

function headerRow() {
  const h = (t, w) => tc([para([run(t, { bold: true, color: 'FFFFFF' })])], w, { fill: NAVY });
  return new TableRow({ tableHeader: true, children: [h('#', C[0]), h('Exercice', C[1]), h('À filmer', C[2]), h('Suivi', C[3])] });
}

function exRow(n, e, shade) {
  const condStr = e.conds.map(c => COND_LABEL[c] || c).join(', ');
  const cellEx = tc([
    para([run(e.title, { bold: true, color: NAVY })]),
    para([run(e.muscle, { italics: true, color: BLUE, size: 15 })]),
    para([run(condStr, { color: GREY, size: 14 })]),
  ], C[1]);
  const cellFilm = tc([para([run(e.film || '—', { size: 16 })])], C[2]);
  const cellTrack = tc([
    para([run('☐ Filmé', { size: 16 })]),
    para([run('☐ Monté', { size: 16 })]),
    para([run('☐ En ligne', { size: 16 })]),
  ], C[3]);
  return new TableRow({ children: [
    tc([para([run(String(n), { bold: true })], { alignment: AlignmentType.CENTER })], C[0], shade ? { fill: LIGHT } : {}),
    cellEx, cellFilm, cellTrack,
  ] });
}

function section(title, subtitle, list, startNo) {
  const out = [];
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`${title}  (${list.length})`)] }));
  out.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: subtitle, italics: true, color: GREY, size: 17 })] }));
  const rows = [headerRow()];
  list.forEach((e, i) => rows.push(exRow(startNo + i, e, i % 2 === 1)));
  out.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: C, borders, rows }));
  out.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  return out;
}

const children = [];
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
  children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 200, height: 71 },
    altText: { title: 'Neurodisk', description: 'Logo', name: 'logo' } })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 },
  children: [new TextRun({ text: 'Feuille de tournage — banque d’exercices', bold: true, color: NAVY, size: 32 })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 6 } },
  children: [new TextRun({ text: `${p1.length + p2.length + p3.length} exercices · classés par priorité de tournage`, color: GREY, size: 18 })] }));

children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Consignes de tournage')] }));
[
  'Cadrage, fond, tenue et éclairage identiques pour tous les clips (cohérence de marque).',
  'Angle de profil pour la plupart des mouvements du rachis, sauf indication contraire dans « À filmer ».',
  'Démonstration lente, 2 à 3 répétitions, clips courts (30 à 60 s).',
  'Nommez chaque fichier avec le titre exact de l’exercice pour accélérer l’upload.',
  'Accessibilité 50+ : mouvement lent, narration claire, sous-titres en gros caractères.',
  'Filmez par lots en suivant l’ordre ci-dessous (Priorité 1 d’abord).',
].forEach(t => children.push(new Paragraph({
  numbering: undefined, bullet: { level: 0 }, spacing: { after: 30 },
  children: [new TextRun({ text: t, size: 18 })] })));
children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));

let n = 1;
section('Priorité 1 — Trousse de départ', 'Exercices universels remis à presque tous les patients : à tourner en premier.', p1, n)
  .forEach(c => children.push(c)); n += p1.length;
section('Priorité 2 — Banque de base (par condition)', 'Exercices ciblés selon la condition (hernie, sciatique, sténose, arthrose, spondylo, cervical).', p2, n)
  .forEach(c => children.push(c)); n += p2.length;
section('Priorité 3 — Avancé (retour au sport)', 'Mise en charge, ports, pliométrie douce, retour à la course : moins de patients y arrivent.', p3, n)
  .forEach(c => children.push(c));

const doc = new Document({
  creator: 'Clinique Neurodisk',
  title: 'Feuille de tournage Neurodisk',
  styles: {
    default: { document: { run: { font: 'Arial', size: 18, color: '222222' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: NAVY, font: 'Arial' },
        paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 20, bold: true, color: BLUE, font: 'Arial' },
        paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCD6E5', space: 4 } },
      children: [new TextRun({ text: 'Clinique Neurodisk — Feuille de tournage', color: NAVY, bold: true, size: 15 })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Page ', color: GREY, size: 15 }),
        new TextRun({ children: [PageNumber.CURRENT], color: GREY, size: 15 }),
        new TextRun({ text: ' de ', color: GREY, size: 15 }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GREY, size: 15 })] })] }) },
    children,
  }],
});

const out = 'C:/Users/gabgi/Downloads/Feuille_de_tournage_Neurodisk.docx';
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf);
  console.log('OK', out, buf.length, '| P1:', p1.length, 'P2:', p2.length, 'P3:', p3.length); });
