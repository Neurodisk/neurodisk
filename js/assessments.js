// ============================================================
// Moteur des questionnaires d'évaluation unifiés (assessments).
//   Scoring, dépistage drapeaux rouges, patron directionnel,
//   rendu de formulaire et collecte des réponses.
//   Persistance : tables assessments / assessment_responses /
//   assessment_scores / red_flag_alerts (migration 028).
// ============================================================
import { ASSESSMENT_DEFS, NEURODISK_CORE, QBPDS, STARTBACK } from './assessments-defs.js?v=3';

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
    else if (it.type === 'bothersome') point = (['Beaucoup', 'Enormément'].includes(v)) ? 1 : 0;
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

// ── Rendu du formulaire — QBPDS / STarT Back ────────────────────
export function renderPlaceholderScale(def, mountEl) {
  const notice = def.translationNotice
    ? `<p style="font-size:.75rem;color:#94a3b8;margin:0 0 1rem;font-style:italic">${esc(def.translationNotice)}</p>` : '';
  const intro = def.intro ? `<p style="font-size:.9rem;color:#475569;margin:0 0 1rem">${esc(def.intro)}</p>` : '';
  mountEl.innerHTML = notice + intro + def.items.map((it, i) => {
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
    // QBPDS : échelle partagée à 6 niveaux (def.scale)
    return `<fieldset class="assess-item">
      <legend>${i + 1}. ${esc(it.label)}</legend>
      ${def.scale.map((label, v) => `<label class="assess-radio"><input type="radio" name="a_${it.key}" value="${v}">${esc(label)}</label>`).join('')}
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

// ── Courbes d'évolution (SVG, sans dépendance) ────────────────
export const ASSESS_CHART_DEFS = {
  pain:      { short: 'Douleur moyenne (7 jours)', unit: '/10',  max: 10,  mcid: 2,    betterHigh: false },
  qbpds:     { short: 'QBPDS — incapacité lombaire', unit: '/100', max: 100, mcid: 17.5, betterHigh: false },
  startback: { short: 'STarT Back — risque',        unit: '/9',  max: 9,   mcid: null, betterHigh: false },
};

export function renderAssessmentChart(def, responses) {
  const rows = (responses || []).slice()
    .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
    .filter(r => r.score !== null && r.score !== undefined && r.score !== '');
  if (rows.length === 0) return '';
  const W = 520, H = 170, padL = 38, padR = 16, padT = 16, padB = 30, max = def.max;
  const xs = i => rows.length === 1 ? (padL + (W - padL - padR) / 2) : padL + i * (W - padL - padR) / (rows.length - 1);
  const ys = v => padT + (1 - v / max) * (H - padT - padB);
  const pts = rows.map((r, i) => [xs(i), ys(Number(r.score))]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const first = Number(rows[0].score), last = Number(rows[rows.length - 1].score);
  const improved = def.mcid != null && (def.betterHigh ? (last - first) >= def.mcid : (first - last) >= def.mcid);
  const lineColor = improved ? '#1e8a4c' : '#2563EB';
  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = padT + f * (H - padT - padB); const val = Math.round((1 - f) * max);
    return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#eef2f8"/><text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#94a3b8">${val}</text>`;
  }).join('');
  const dots = rows.map((r, i) => {
    const [x, y] = pts[i]; const dt = new Date(r.completed_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="${lineColor}"/><text x="${x}" y="${y - 8}" text-anchor="middle" font-size="9" fill="#475569">${r.score}</text><text x="${x}" y="${H - padB + 14}" text-anchor="middle" font-size="9" fill="#94a3b8">${esc(dt)}</text>`;
  }).join('');
  const dir = def.betterHigh ? '↑ plus haut = mieux' : '↓ plus bas = mieux';
  return `<div style="margin:.5rem 0">
    <div style="font-size:.82rem;font-weight:600;color:#1B2B6B;margin-bottom:.15rem">${esc(def.short)} <span style="font-weight:400;color:#64748b">(${esc(def.unit)})</span></div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;font-family:Arial,sans-serif">${grid}<path d="${line}" fill="none" stroke="${lineColor}" stroke-width="2.5"/>${dots}</svg>
    <div style="font-size:.72rem;color:#64748b">${dir}${def.mcid != null ? ` · seuil important ${def.mcid} ${esc(def.unit)}` : ''}${improved ? ' · <span style="color:#1e8a4c;font-weight:600">amélioration cliniquement significative</span>' : ''}</div>
  </div>`;
}

// Construit une série {score, completed_at} pour un instrument, depuis des lignes d'assessments.
export function buildScoreSerie(assessRows, instrument) {
  return (assessRows || []).map(r => {
    const s = (r.assessment_scores || []).find(x => x.instrument === instrument);
    return (s && s.raw_score != null) ? { score: Number(s.raw_score), completed_at: r.completed_at } : null;
  }).filter(Boolean);
}
// Série de douleur moyenne (7j) depuis les réponses du tronc commun.
export function buildPainSerie(assessRows) {
  return (assessRows || []).map(r => {
    const p = (r.assessment_responses || []).find(x => x.item_key === 'pain_avg7');
    return (p && p.value != null && p.value !== '') ? { score: Number(p.value), completed_at: r.completed_at } : null;
  }).filter(Boolean);
}

export { ASSESSMENT_DEFS, NEURODISK_CORE, QBPDS, STARTBACK };
