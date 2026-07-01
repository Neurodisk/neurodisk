// ============================================================
// Moteur des questionnaires d'évaluation unifiés (assessments).
//   Scoring, dépistage drapeaux rouges, patron directionnel,
//   rendu de formulaire et collecte des réponses.
//   Persistance : tables assessments / assessment_responses /
//   assessment_scores / red_flag_alerts (migration 028).
// ============================================================
import { ASSESSMENT_DEFS, NEURODISK_CORE, QBPDS, STARTBACK } from './assessments-defs.js?v=1';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Dépistage drapeaux rouges (§5.6) ──────────────────────────
// Retourne la liste des clés déclenchées (tableau vide = aucun drapeau).
export function checkRedFlags(answers) {
  return NEURODISK_CORE.redFlags
    .filter(f => answers[f.key] === true || answers[f.key] === 'true')
    .map(f => f.key);
}

// ── Patron directionnel (§5.3-C, dérivé, usage clinicien) ─────
// Aggravé assis/flexion + soulagé debout/marche → discal.
// Aggravé debout/marche + soulagé assis/flexion → sténose.
export function deriveDirectionalPattern(answers) {
  const sitLong   = Number(answers.trig_sit_long   ?? 0);
  const standLong = Number(answers.trig_stand_long ?? 0);
  const extension = Number(answers.trig_extension  ?? 0);
  const reliefSitFlex = answers.relief_sit_flex === true || answers.relief_sit_flex === 'true';

  if (reliefSitFlex && standLong >= 2 && sitLong <= 1) return 'stenose';
  if (!reliefSitFlex && sitLong >= 2 && extension >= 2) return 'discal';
  if (sitLong > standLong + 1) return 'discal';
  if (standLong > sitLong + 1) return 'stenose';
  return 'indetermine';
}

const PATTERN_LABELS = {
  discal:      'Profil discal (aggravé assis/flexion, soulagé en extension/debout)',
  stenose:     'Profil sténose (aggravé debout/marche, soulagé assis/flexion)',
  indetermine: 'Patron indéterminé',
};
export function directionalPatternLabel(code) { return PATTERN_LABELS[code] || ''; }

// ── Scoring QBPDS ──────────────────────────────────────────────
export function scoreQBPDS(answers) {
  let sum = 0, n = 0;
  QBPDS.items.forEach(it => {
    const v = answers[it.key];
    if (v !== undefined && v !== null && v !== '') { sum += Number(v); n++; }
  });
  if (!n) return { score: null, max: 100 };
  // Ramené sur 100 même si des items sont manquants (cohérent avec ODI/NDI)
  const score = Math.round((sum / (n * 5)) * 100);
  return { score, max: 100 };
}

// ── Scoring STarT Back ─────────────────────────────────────────
export function scoreStartBack(answers) {
  let total = 0, psych = 0, nTotal = 0, nPsych = 0;
  STARTBACK.items.forEach(it => {
    const v = answers[it.key];
    if (v === undefined || v === null || v === '') return;
    nTotal++;
    let point = 0;
    if (it.type === 'yesno') point = (v === true || v === 'true' || v === 1 || v === '1') ? 1 : 0;
    else if (it.type === 'bothersome') point = (['Assez', 'Extrêmement'].includes(v)) ? 1 : 0;
    total += point;
    if (it.psychosocial) { nPsych++; psych += point; }
  });
  if (!nTotal) return { score: null, max: 9, psychosocial: null, risk: null };
  let risk;
  if (total <= 3) risk = 'faible';
  else if (psych >= 4) risk = 'eleve';
  else risk = 'moyen';
  return { score: total, max: 9, psychosocial: psych, risk };
}

// ── Dispatch générique ─────────────────────────────────────────
export function scoreAssessmentInstrument(code, answers) {
  if (code === 'qbpds')     return scoreQBPDS(answers);
  if (code === 'startback') { const r = scoreStartBack(answers); return { score: r.score, max: r.max, subscores: { psychosocial: r.psychosocial, risk: r.risk } }; }
  return { score: null, max: null };
}

// ── Rendu du formulaire — QBPDS / STarT Back (placeholders) ────
export function renderPlaceholderScale(def, mountEl) {
  mountEl.innerHTML = def.items.map((it, i) => {
    if (it.type === 'bothersome') {
      return `<fieldset class="assess-item">
        <legend>${i + 1}. ${esc(it.label)}</legend>
        ${it.options.map(o => `<label class="assess-radio"><input type="radio" name="a_${it.key}" value="${esc(o)}">${esc(o)}</label>`).join('')}
      </fieldset>`;
    }
    if (it.type === 'yesno') {
      return `<fieldset class="assess-item">
        <legend>${i + 1}. ${esc(it.label)}</legend>
        <label class="assess-radio"><input type="radio" name="a_${it.key}" value="true">Oui</label>
        <label class="assess-radio"><input type="radio" name="a_${it.key}" value="false">Non</label>
      </fieldset>`;
    }
    // QBPDS : échelle 0-5
    return `<fieldset class="assess-item">
      <legend>${i + 1}. ${esc(it.label)}</legend>
      ${it.options.map(o => `<label class="assess-radio"><input type="radio" name="a_${it.key}" value="${o}">${o}</label>`).join('')}
    </fieldset>`;
  }).join('');
}

export function collectPlaceholderScale(def, mountEl) {
  const answers = {};
  def.items.forEach(it => {
    const sel = mountEl.querySelector(`input[name="a_${it.key}"]:checked`);
    if (sel) answers[it.key] = it.type === 'bothersome' ? sel.value : (it.type === 'yesno' ? (sel.value === 'true') : Number(sel.value));
  });
  return answers;
}

export { ASSESSMENT_DEFS, NEURODISK_CORE, QBPDS, STARTBACK };
