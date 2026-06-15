// Génère 4 documents Word (modèles Loi 25) pour la Clinique Neurodisk.
// Usage : node tools/gen_loi25_docs.mjs
import fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, TabStopType, TabStopPosition,
} from 'docx';

const BLUE = '1B2B6B';
const OUT = 'docs/loi25';
fs.mkdirSync(OUT, { recursive: true });

const CW = 9360; // largeur contenu (US Letter, marges 1po)

// ── Helpers ────────────────────────────────────────────────
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P  = (t, opts = {}) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: t, ...opts })] });
const SMALL = t => new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: t, size: 18, italics: true, color: '666666' })] });
const BULLET = t => new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 60 }, children: [Array.isArray(t) ? null : new TextRun(t)].filter(Boolean) });
const BULLETR = runs => new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 60 }, children: runs });
const NUM = t => new Paragraph({ numbering: { reference: 'n', level: 0 }, spacing: { after: 60 }, children: [new TextRun(t)] });
const FIELD = (label, val = '__________________________') =>
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: label + ' : ', bold: true }), new TextRun({ text: val })] });
const SPACER = () => new Paragraph({ children: [new TextRun('')] });

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(text, w, { head = false, bold = false } = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: head ? { fill: 'D5DBF0', type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: head || bold, size: 20 })] })],
  });
}
function table(rows, widths) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({
      children: r.map((c, j) => cell(c, widths[j], { head: i === 0 })),
    })),
  });
}

function buildDoc(titre, sousTitre, children) {
  return new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, color: BLUE, font: 'Arial' },
          paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, color: BLUE, font: 'Arial' },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      ],
    },
    numbering: {
      config: [
        { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
        { reference: 'n', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 2 } },
        children: [new TextRun({ text: 'Clinique Neurodisk', bold: true, color: BLUE, size: 18 }),
                   new TextRun({ text: '\tConfidentiel — Document interne', size: 16, color: '888888' })],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        children: [new TextRun({ text: titre + ' — ', size: 16, color: '888888' }),
                   new TextRun({ text: 'Page ', size: 16, color: '888888' }),
                   new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888' })],
      })] }) },
      children: [
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: titre, bold: true, size: 40, color: BLUE })] }),
        new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE, space: 4 } },
          children: [new TextRun({ text: sousTitre, size: 22, color: '555555' })] }),
        SMALL('⚠️ MODÈLE DE TRAVAIL — à valider par un conseiller juridique ou un responsable de la protection des renseignements personnels avant adoption officielle. Les champs [À COMPLÉTER] doivent être remplis par la clinique.'),
        SPACER(),
        ...children,
      ],
    }],
  });
}

async function save(name, doc) {
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(`${OUT}/${name}`, buf);
  console.log('✓', `${OUT}/${name}`);
}

// ════════════════════════════════════════════════════════════
// 1) ÉFVP
// ════════════════════════════════════════════════════════════
const efvp = buildDoc('Évaluation des facteurs relatifs à la vie privée (ÉFVP)',
  'Plateforme clinique Neurodisk — traitement de renseignements de santé', [
  H1('1. Contexte et objet'),
  P('La présente évaluation porte sur la plateforme web Neurodisk, utilisée par les kinésiologues et médecins de la Clinique Neurodisk pour gérer les dossiers de patients et leur donner accès à une bibliothèque de ressources cliniques (programmes d’exercices, formulaires, documents). Le système traite des renseignements personnels sensibles, notamment des renseignements de santé.'),
  P('Cette ÉFVP est réalisée conformément à l’article 3.3 de la Loi sur la protection des renseignements personnels dans le secteur privé (Loi 25). Elle doit être révisée à chaque modification importante du système.'),
  FIELD('Responsable de l’ÉFVP', '[À COMPLÉTER — nom et titre]'),
  FIELD('Date de l’évaluation', '[À COMPLÉTER]'),
  FIELD('Version du système évaluée', '[À COMPLÉTER]'),

  H1('2. Description des renseignements traités'),
  table([
    ['Catégorie', 'Exemples', 'Sensibilité'],
    ['Identité', 'Nom, adresse courriel', 'Modérée'],
    ['Renseignements de santé', 'Diagnostics/conditions, programmes d’exercices, formulaires de santé, lettres de référence', 'Élevée'],
    ['Données d’usage', 'Progression des exercices, formulaires remplis, messages professionnels', 'Élevée'],
    ['Données techniques', 'Journaux d’accès (audit), sessions d’authentification', 'Modérée'],
  ], [2200, 5160, 2000]),

  H1('3. Finalités'),
  BULLET('Assurer le suivi clinique des patients (programmes, exercices, formulaires).'),
  BULLET('Donner aux patients un accès sécurisé à leurs ressources personnalisées.'),
  BULLET('Permettre la communication entre professionnels de la clinique.'),
  P('Les renseignements ne sont utilisés à aucune autre fin et ne font l’objet d’aucune communication à des tiers, sauf obligation légale.'),

  H1('4. Cycle de vie et hébergement'),
  table([
    ['Étape', 'Mesure'],
    ['Collecte', 'Saisie par le personnel ou le patient via formulaires; consentement obtenu.'],
    ['Stockage', 'Base de données Supabase (PostgreSQL), région Canada (ca-central-1). Médias génériques sur Bunny; pages servies par Cloudflare.'],
    ['Conservation', 'Dossiers de santé conservés selon les obligations professionnelles applicables. Journaux d’audit purgés après 24 mois.'],
    ['Destruction', 'Effacement définitif sur demande ou à la fin de la finalité (fonction d’effacement patient), avec trace de l’opération.'],
  ], [2200, 7160]),

  H1('5. Mesures de sécurité en place'),
  BULLET('Chiffrement en transit (HTTPS/TLS, HSTS) et au repos (AES-256).'),
  BULLET('Contrôle d’accès par règles de sécurité au niveau des lignes (RLS) : chaque patient ne voit que ses propres données.'),
  BULLET('Authentification à deux facteurs (TOTP) pour les administrateurs et professionnels.'),
  BULLET('Journal d’audit traçant les accès et modifications des renseignements de santé.'),
  BULLET('En-têtes de sécurité (CSP, X-Frame-Options) limitant les attaques web.'),
  BULLET('Hébergement des données au Canada (atténue les risques liés aux transferts hors Québec).'),

  H1('6. Analyse des risques résiduels'),
  table([
    ['Risque', 'Probabilité', 'Gravité', 'Mesure d’atténuation'],
    ['Accès non autorisé à un compte', 'Faible', 'Élevée', 'MFA, RLS, journal d’audit'],
    ['Fuite de données chez un sous-traitant', 'Faible', 'Élevée', 'Hébergement Canada, fournisseurs certifiés, contrats'],
    ['Erreur humaine (mauvais partage)', 'Moyenne', 'Modérée', 'Permissions granulaires, formation, audit'],
    ['Conservation excessive', 'Faible', 'Modérée', 'Politique de rétention + purge automatique'],
  ], [2900, 1500, 1400, 3560]),

  H1('7. Conclusion et plan d’action'),
  P('Au terme de l’évaluation, le niveau de protection est jugé [À COMPLÉTER : adéquat / à renforcer]. Les actions de suivi suivantes sont retenues :'),
  NUM('Désigner formellement le responsable de la protection des renseignements personnels.'),
  NUM('Confirmer l’exécution des ententes de sous-traitance (Supabase, Cloudflare, Bunny).'),
  NUM('Déployer le MFA à l’ensemble des administrateurs et professionnels.'),
  NUM('Réviser la présente ÉFVP à chaque changement important.'),
  SPACER(),
  FIELD('Approuvé par', '[À COMPLÉTER — nom, titre, signature, date]'),
]);

// ════════════════════════════════════════════════════════════
// 2) Politique de confidentialité + consentement
// ════════════════════════════════════════════════════════════
const pol = buildDoc('Politique de confidentialité et consentement',
  'Clinique Neurodisk — plateforme web de suivi clinique', [
  H1('1. Notre engagement'),
  P('La Clinique Neurodisk accorde une grande importance à la protection de vos renseignements personnels et de santé. La présente politique explique quels renseignements nous recueillons, pourquoi, comment nous les protégeons et quels sont vos droits, conformément à la Loi 25.'),
  FIELD('Responsable de la protection des renseignements personnels', '[À COMPLÉTER — nom]'),
  FIELD('Pour nous joindre', '[À COMPLÉTER — courriel / téléphone]'),

  H1('2. Renseignements que nous recueillons'),
  BULLET('Renseignements d’identité : nom, adresse courriel.'),
  BULLET('Renseignements de santé : conditions/diagnostics, programmes d’exercices, formulaires de santé, lettres de référence.'),
  BULLET('Données d’utilisation : progression de vos exercices, formulaires remplis.'),

  H1('3. Pourquoi nous les utilisons'),
  P('Vos renseignements servent uniquement à assurer votre suivi clinique, à vous donner accès à vos ressources personnalisées et à communiquer avec vous au sujet de vos soins. Nous ne vendons jamais vos renseignements et ne les communiquons à des tiers que si la loi l’exige.'),

  H1('4. Comment nous les protégeons'),
  BULLET('Hébergement des données au Canada.'),
  BULLET('Chiffrement de vos données en transit et au repos.'),
  BULLET('Accès restreint : seul le personnel autorisé peut consulter votre dossier.'),
  BULLET('Authentification à deux facteurs pour le personnel et journal des accès.'),

  H1('5. Conservation et destruction'),
  P('Nous conservons vos renseignements de santé aussi longtemps que l’exigent nos obligations professionnelles, puis nous les détruisons de façon sécuritaire. Vous pouvez demander la suppression de votre compte (voir vos droits ci-dessous).'),

  H1('6. Vos droits'),
  BULLET('Accéder à vos renseignements et en obtenir une copie.'),
  BULLET('Faire corriger un renseignement inexact.'),
  BULLET('Retirer votre consentement et demander la suppression de votre compte.'),
  BULLET('Porter plainte auprès de la Commission d’accès à l’information du Québec (CAI).'),

  H1('7. Sous-traitants'),
  P('Pour fournir le service, nous faisons appel à des fournisseurs technologiques (hébergement et diffusion). Ceux-ci sont tenus par contrat de protéger vos renseignements et les données sont hébergées au Canada.'),

  H1('8. Formulaire de consentement'),
  P('En signant ci-dessous, je reconnais avoir lu et compris la présente politique de confidentialité et je consens à ce que la Clinique Neurodisk recueille, utilise et conserve mes renseignements personnels et de santé aux fins de mon suivi clinique.'),
  SPACER(),
  FIELD('Nom du patient', ''),
  FIELD('Signature', ''),
  FIELD('Date', ''),
  SPACER(),
  SMALL('Pour un patient mineur ou inapte, signature du parent ou du représentant légal, avec mention du lien.'),
]);

// ════════════════════════════════════════════════════════════
// 3) Registre des incidents + procédure CAI
// ════════════════════════════════════════════════════════════
const inc = buildDoc('Procédure de gestion des incidents de confidentialité',
  'Clinique Neurodisk — registre et notification (Loi 25)', [
  H1('1. Objet'),
  P('Cette procédure décrit les étapes à suivre lorsqu’un incident de confidentialité survient (accès, utilisation, communication ou perte non autorisés de renseignements personnels), conformément à la Loi 25. Tout membre du personnel qui soupçonne un incident doit le signaler immédiatement au responsable.'),
  FIELD('Responsable à aviser', '[À COMPLÉTER — nom, courriel, téléphone]'),

  H1('2. Étapes à suivre'),
  NUM('Contenir : limiter immédiatement l’incident (révoquer un accès, réinitialiser des mots de passe, isoler le système).'),
  NUM('Consigner : inscrire l’incident au registre (section 4) dès sa découverte.'),
  NUM('Évaluer le risque de préjudice sérieux pour les personnes concernées (sensibilité des données, probabilité d’utilisation malveillante).'),
  NUM('Notifier, si le risque est sérieux : aviser la Commission d’accès à l’information (CAI) et les personnes concernées, avec diligence.'),
  NUM('Corriger : mettre en place des mesures pour éviter que l’incident se reproduise.'),

  H1('3. Critères de notification'),
  P('La CAI et les personnes concernées doivent être avisées si l’incident présente un risque qu’un préjudice sérieux soit causé. Facteurs à considérer : sensibilité des renseignements (les renseignements de santé sont hautement sensibles), conséquences appréhendées, probabilité d’usage malveillant.'),
  P('La notification aux personnes concernées comprend : la description de l’incident, les renseignements visés, les mesures prises et les mesures qu’elles peuvent prendre pour se protéger, ainsi que les coordonnées pour obtenir plus d’information.'),

  H1('4. Registre des incidents'),
  P('Le registre doit être tenu à jour et conservé au moins 5 ans. Reproduire le tableau ci-dessous pour chaque incident.'),
  table([
    ['Champ', 'Information'],
    ['N° de l’incident', ''],
    ['Date de survenance / découverte', ''],
    ['Description de l’incident', ''],
    ['Renseignements concernés', ''],
    ['Nombre de personnes touchées', ''],
    ['Évaluation du risque de préjudice', ''],
    ['CAI notifiée (oui/non, date)', ''],
    ['Personnes notifiées (oui/non, date)', ''],
    ['Mesures de confinement et correctives', ''],
    ['Responsable du suivi', ''],
  ], [3200, 6160]),
  SPACER(),
  SMALL('Modèle de fiche — à dupliquer pour chaque incident. Conserver le registre en lieu sûr et à accès restreint.'),
]);

// ════════════════════════════════════════════════════════════
// 4) Grille d’évaluation des sous-traitants
// ════════════════════════════════════════════════════════════
const sst = buildDoc('Grille d’évaluation des sous-traitants',
  'Clinique Neurodisk — fournisseurs traitant des renseignements (Loi 25)', [
  H1('1. Objet'),
  P('La Loi 25 exige qu’une entente écrite encadre la communication de renseignements personnels à un sous-traitant et que celui-ci offre une protection équivalente. Cette grille recense les fournisseurs de Neurodisk et l’état des vérifications. Joindre à ce document les ententes (DPA) et certifications de chaque fournisseur.'),

  H1('2. Fournisseurs actuels'),
  table([
    ['Fournisseur', 'Rôle', 'Localisation des données', 'À vérifier'],
    ['Supabase', 'Base de données, authentification, stockage', 'Canada (ca-central-1)', 'DPA signé, certifications (SOC 2)'],
    ['Cloudflare', 'Diffusion du site, sécurité réseau', 'Mondial (CDN); contenu statique', 'DPA, engagements de sécurité'],
    ['Bunny.net', 'Diffusion des vidéos d’exercices (contenu générique, sans données patient)', 'Europe / É.-U.', 'Confirmer absence de données personnelles'],
  ], [1700, 2700, 2360, 2600]),

  H1('3. Points à confirmer pour chaque fournisseur'),
  BULLET('Une entente de traitement des données (DPA) est signée.'),
  BULLET('Le fournisseur offre une protection équivalente à celle exigée par la Loi 25.'),
  BULLET('La localisation des données est connue et documentée (idéalement au Canada).'),
  BULLET('Le fournisseur notifie la clinique en cas d’incident de sécurité.'),
  BULLET('Des certifications reconnues sont disponibles (SOC 2, ISO 27001).'),
  BULLET('La sous-traitance ultérieure (sous-sous-traitants) est encadrée.'),

  H1('4. Évaluation de transfert hors Québec'),
  P('Lorsqu’un fournisseur stocke ou traite des renseignements hors Québec, documenter une évaluation tenant compte de la sensibilité des données, des mesures de protection et du régime juridique applicable. Les données de santé de Neurodisk sont hébergées au Canada (Supabase ca-central-1); les vidéos diffusées par Bunny ne contiennent pas de renseignements personnels (démonstrations d’exercices génériques).'),

  H1('5. Suivi'),
  table([
    ['Fournisseur', 'DPA signé (date)', 'Évaluation faite (date)', 'Prochaine révision'],
    ['Supabase', '', '', ''],
    ['Cloudflare', '', '', ''],
    ['Bunny.net', '', '', ''],
  ], [2400, 2320, 2320, 2320]),
]);

await save('1_EFVP_Neurodisk.docx', efvp);
await save('2_Politique_confidentialite_consentement.docx', pol);
await save('3_Procedure_incidents_CAI.docx', inc);
await save('4_Grille_sous-traitants.docx', sst);
console.log('\nTerminé.');
