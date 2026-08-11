// Construit js/inter-font.js : Inter (Regular + Bold) instanciée depuis la
// police variable officielle, sous-ensemblée aux caractères français, encodée
// en base64 pour incorporation dans le PDF (jsPDF). Aucun Python requis
// (harfbuzz-wasm via subset-font).
//
//   node tools/build_inter_font.mjs
//
import fs from 'fs';
import subsetFont from 'subset-font';

const SRC = 'https://cdn.jsdelivr.net/gh/rsms/inter/docs/font-files/InterVariable.ttf';

// Jeu de caractères : ASCII imprimable + accents/ponctuation français + symboles
// réellement utilisés (× · — – ’ « » ° … etc.).
const ascii = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)).join('');
const french = 'ÀÂÄÇÈÉÊËÎÏÔÖÙÛÜŸàâäçèéêëîïôöùûüÿœŒæÆ';
const punct  = '’‘“”«»—–…·×÷°€£²³½¼¾•→↔';
const CHARSET = ascii + french + punct;

async function main() {
  console.log('Téléchargement de InterVariable.ttf…');
  const resp = await fetch(SRC);
  if (!resp.ok) throw new Error('Téléchargement échoué : ' + resp.status);
  const src = Buffer.from(await resp.arrayBuffer());
  console.log('  source :', (src.length / 1024).toFixed(0), 'Ko');

  const build = async (wght) => {
    const buf = await subsetFont(src, CHARSET, {
      targetFormat: 'truetype',
      variationAxes: { wght },
    });
    return Buffer.from(buf);
  };

  console.log('Instanciation + sous-ensemble (Regular 400)…');
  const reg = await build(400);
  console.log('  →', (reg.length / 1024).toFixed(1), 'Ko');

  console.log('Instanciation + sous-ensemble (Bold 700)…');
  const bold = await build(700);
  console.log('  →', (bold.length / 1024).toFixed(1), 'Ko');

  const out = `// GÉNÉRÉ PAR tools/build_inter_font.mjs — NE PAS ÉDITER À LA MAIN.
// Inter (SIL Open Font License 1.1) instanciée Regular/Bold + sous-ensemblée
// au français, base64, pour incorporation dans le PDF via jsPDF.
export const INTER_REGULAR_B64 = '${reg.toString('base64')}';
export const INTER_BOLD_B64 = '${bold.toString('base64')}';
`;
  fs.writeFileSync('js/inter-font.js', out);
  console.log('✓ js/inter-font.js écrit (', ((reg.length + bold.length) / 1024).toFixed(0), 'Ko de police,', (out.length / 1024).toFixed(0), 'Ko de module )');
}

main().catch(e => { console.error(e); process.exit(1); });
