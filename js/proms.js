// ============================================================
// PROMs — questionnaires de résultats validés (rachis)
//   ODI (lombaire), NDI (cervical), NPRS (douleur), PSFS.
//   Moteur partagé : définitions + cotation + formulaire + graphique.
//   ⚠️ ODI/NDI : standards cliniques — vérifier les droits d'usage
//   pour un usage commercial. NPRS/PSFS : libres.
// ============================================================

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SECT6 = (label, opts) => ({ label, options: opts });

// ---- ODI (Oswestry Disability Index) -----------------------
const ODI = {
  code: 'odi', name: 'Indice d’incapacité d’Oswestry (ODI)', short: 'ODI — lombaire',
  unit: '%', max: 100, mcid: 10, betterHigh: false, optional: [7], // section 8 (vie sexuelle) optionnelle
  sections: [
    SECT6('Intensité de la douleur', ['Aucune douleur en ce moment', 'Très légère en ce moment', 'Modérée en ce moment', 'Assez forte en ce moment', 'Très forte en ce moment', 'La pire imaginable en ce moment']),
    SECT6('Soins personnels (se laver, s’habiller)', ['Normaux, sans douleur supplémentaire', 'Normaux mais cela augmente la douleur', 'Douloureux : je suis lent et prudent', 'J’ai besoin d’aide mais je fais l’essentiel', 'J’ai besoin d’aide chaque jour', 'Je reste au lit, je me lave avec difficulté']),
    SECT6('Soulever des charges', ['Charges lourdes sans douleur supplémentaire', 'Charges lourdes mais cela augmente la douleur', 'Pas du sol, mais si bien placées (table)', 'Seulement charges légères à moyennes si bien placées', 'Seulement de très légères charges', 'Je ne peux rien soulever ni porter']),
    SECT6('Marche', ['Aucune limite de distance', 'Pas plus de 1,5 km', 'Pas plus de 750 m', 'Pas plus de 100 m', 'Seulement avec canne ou béquilles', 'Au lit la plupart du temps']),
    SECT6('Position assise', ['Aussi longtemps que je veux', 'Seulement sur ma chaise préférée', 'Pas plus d’une heure', 'Pas plus de 30 minutes', 'Pas plus de 10 minutes', 'Pas du tout']),
    SECT6('Position debout', ['Aussi longtemps que je veux, sans douleur ajoutée', 'Aussi longtemps que je veux mais douleur ajoutée', 'Pas plus d’une heure', 'Pas plus de 30 minutes', 'Pas plus de 10 minutes', 'Pas du tout']),
    SECT6('Sommeil', ['Jamais perturbé par la douleur', 'Occasionnellement perturbé', 'Je dors moins de 6 heures', 'Moins de 4 heures', 'Moins de 2 heures', 'Sommeil impossible à cause de la douleur']),
    SECT6('Vie sexuelle (si applicable)', ['Normale, sans douleur ajoutée', 'Normale mais un peu de douleur', 'Presque normale, très douloureuse', 'Fortement limitée par la douleur', 'Presque absente', 'Impossible à cause de la douleur']),
    SECT6('Vie sociale', ['Normale, sans douleur ajoutée', 'Normale mais augmente la douleur', 'Limite seulement les activités physiques', 'Je sors moins qu’avant', 'Limitée à la maison', 'Absente à cause de la douleur']),
    SECT6('Déplacements / voyages', ['Partout sans douleur', 'Partout mais douleur ajoutée', 'Trajets de plus de 2 h supportés', 'Moins d’une heure', 'Courts trajets nécessaires (< 30 min)', 'Seulement pour des soins']),
  ],
};

// ---- NDI (Neck Disability Index) ---------------------------
const NDI = {
  code: 'ndi', name: 'Indice d’incapacité cervicale (NDI)', short: 'NDI — cervical',
  unit: '%', max: 100, mcid: 7.5, betterHigh: false, optional: [],
  sections: [
    SECT6('Intensité de la douleur', ['Aucune douleur en ce moment', 'Très légère en ce moment', 'Modérée en ce moment', 'Assez forte en ce moment', 'Très forte en ce moment', 'La pire imaginable en ce moment']),
    SECT6('Soins personnels', ['Normaux, sans douleur ajoutée', 'Normaux mais cela cause de la douleur', 'Douloureux : lent et prudent', 'Un peu d’aide, je fais l’essentiel', 'Aide chaque jour', 'Je reste au lit, me lave difficilement']),
    SECT6('Soulever des charges', ['Charges lourdes sans douleur ajoutée', 'Charges lourdes mais douleur', 'Pas du sol, mais si bien placées', 'Seulement légères à moyennes si bien placées', 'Seulement très légères', 'Je ne peux rien soulever']),
    SECT6('Lecture', ['Autant que je veux, sans douleur au cou', 'Avec une légère douleur au cou', 'Avec une douleur modérée', 'Limitée par une douleur modérée', 'Limitée par une forte douleur', 'Impossible']),
    SECT6('Maux de tête', ['Aucun', 'Légers, peu fréquents', 'Modérés, peu fréquents', 'Modérés, fréquents', 'Forts, fréquents', 'Presque tout le temps']),
    SECT6('Concentration', ['Pleine, sans difficulté', 'Légère difficulté', 'Difficulté modérée', 'Beaucoup de difficulté', 'Énormément de difficulté', 'Impossible']),
    SECT6('Travail', ['Autant que je veux', 'Mon travail habituel seulement', 'La plupart de mon travail habituel', 'Pas mon travail habituel', 'J’arrive à peine à travailler', 'Pas du tout']),
    SECT6('Conduite', ['Sans douleur au cou', 'Avec une légère douleur', 'Avec une douleur modérée', 'Limitée par une douleur modérée', 'Limitée par une forte douleur', 'Impossible']),
    SECT6('Sommeil', ['Aucun trouble', 'Légèrement perturbé (< 1 h éveillé)', 'Légèrement (1-2 h)', 'Modérément (2-3 h)', 'Fortement (3-5 h)', 'Complètement (5-7 h éveillé)']),
    SECT6('Loisirs', ['Toutes mes activités, sans douleur', 'Toutes, avec une certaine douleur', 'La plupart, pas toutes', 'Peu d’activités', 'À peine', 'Aucune']),
  ],
};

// ---- NPRS (douleur 0-10) -----------------------------------
const NPRS = { code: 'nprs', name: 'Échelle numérique de la douleur (0-10)', short: 'Douleur (0-10)', unit: '/10', max: 10, mcid: 2, betterHigh: false };

// ---- PSFS (échelle fonctionnelle spécifique) ---------------
const PSFS = { code: 'psfs', name: 'Échelle fonctionnelle spécifique au patient (PSFS)', short: 'PSFS — fonction', unit: '/10', max: 10, mcid: 2, betterHigh: true };

export const PROM_DEFS = { odi: ODI, ndi: NDI, nprs: NPRS, psfs: PSFS };
export const PROM_LIST = [ODI, NDI, NPRS, PSFS].map(d => ({ code: d.code, name: d.name, short: d.short }));

// ---- Cotation ----------------------------------------------
export function scoreProm(code, answers) {
  const d = PROM_DEFS[code];
  if (code === 'odi' || code === 'ndi') {
    let sum = 0, n = 0;
    d.sections.forEach((_, i) => {
      const v = answers[i];
      if (v !== undefined && v !== null && v !== '') { sum += Number(v); n++; }
    });
    if (!n) return { score: null, max: 100 };
    return { score: Math.round((sum / (5 * n)) * 100), max: 100 };
  }
  if (code === 'nprs') {
    const v = answers.pain;
    return { score: (v === undefined || v === '') ? null : Number(v), max: 10 };
  }
  if (code === 'psfs') {
    const acts = (answers.activities || []).filter(a => a && a.name && a.score !== '' && a.score != null);
    if (!acts.length) return { score: null, max: 10 };
    const mean = acts.reduce((s, a) => s + Number(a.score), 0) / acts.length;
    return { score: Math.round(mean * 10) / 10, max: 10 };
  }
  return { score: null, max: d.max };
}

// ---- Formulaire (rendu dans un conteneur) ------------------
export function renderPromForm(code, mountEl, prefill = {}) {
  const d = PROM_DEFS[code];
  if (code === 'odi' || code === 'ndi') {
    mountEl.innerHTML = d.sections.map((s, i) => `
      <fieldset style="border:1px solid #dbe4f0;border-radius:10px;padding:.7rem .9rem;margin-bottom:.7rem">
        <legend style="font-weight:600;font-size:.9rem;color:#1B2B6B;padding:0 .3rem">${i + 1}. ${esc(s.label)}${(d.optional || []).includes(i) ? ' <span style="font-weight:400;color:#888">(optionnel)</span>' : ''}</legend>
        ${s.options.map((o, v) => `
          <label style="display:flex;gap:.5rem;align-items:flex-start;margin:.2rem 0;font-size:.86rem;cursor:pointer">
            <input type="radio" name="prom_${code}_${i}" value="${v}" style="margin-top:.15rem">${esc(o)}
          </label>`).join('')}
      </fieldset>`).join('');
  } else if (code === 'nprs') {
    mountEl.innerHTML = `
      <p style="font-size:.9rem;margin:.2rem 0 .6rem">Sur une échelle de 0 (aucune douleur) à 10 (pire douleur imaginable), quelle est votre douleur en ce moment ?</p>
      <div style="display:flex;flex-wrap:wrap;gap:.35rem">
        ${[0,1,2,3,4,5,6,7,8,9,10].map(v => `
          <label style="flex:1;min-width:42px;text-align:center;border:1px solid #ccc;border-radius:8px;padding:.5rem .2rem;cursor:pointer">
            <input type="radio" name="prom_nprs" value="${v}" style="display:block;margin:0 auto .2rem">${v}
          </label>`).join('')}
      </div>`;
  } else if (code === 'psfs') {
    const acts = (prefill.activities && prefill.activities.length) ? prefill.activities : [{ name: '', score: '' }, { name: '', score: '' }, { name: '', score: '' }];
    mountEl.innerHTML = `
      <p style="font-size:.9rem;margin:.2rem 0 .6rem">Nommez jusqu’à 3 activités importantes que votre problème vous empêche de faire ou rend difficiles. Notez chacune de 0 (incapable) à 10 (comme avant le problème).</p>
      ${acts.map((a, i) => `
        <div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem;flex-wrap:wrap">
          <input type="text" class="psfs-name" data-i="${i}" placeholder="Activité ${i + 1} (ex. monter l’escalier)" value="${esc(a.name || '')}" style="flex:1;min-width:200px">
          <select class="psfs-score" data-i="${i}" style="width:80px">
            <option value="">—</option>
            ${[0,1,2,3,4,5,6,7,8,9,10].map(v => `<option value="${v}" ${String(a.score) === String(v) ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>`).join('')}`;
  }
}

// ---- Collecte des réponses + score -------------------------
export function collectProm(code, mountEl) {
  const d = PROM_DEFS[code];
  let answers = {};
  if (code === 'odi' || code === 'ndi') {
    d.sections.forEach((_, i) => {
      const sel = mountEl.querySelector(`input[name="prom_${code}_${i}"]:checked`);
      if (sel) answers[i] = Number(sel.value);
    });
    const answered = Object.keys(answers).length;
    const required = d.sections.length - (d.optional || []).length;
    if (answered < required) return { error: `Veuillez répondre à toutes les sections (${answered}/${required}).` };
  } else if (code === 'nprs') {
    const sel = mountEl.querySelector('input[name="prom_nprs"]:checked');
    if (!sel) return { error: 'Veuillez indiquer votre niveau de douleur.' };
    answers.pain = Number(sel.value);
  } else if (code === 'psfs') {
    const acts = [];
    mountEl.querySelectorAll('.psfs-name').forEach(inp => {
      const i = inp.dataset.i;
      const name = inp.value.trim();
      const score = mountEl.querySelector(`.psfs-score[data-i="${i}"]`).value;
      if (name && score !== '') acts.push({ name, score: Number(score) });
    });
    if (!acts.length) return { error: 'Indiquez au moins une activité avec sa note.' };
    answers.activities = acts;
  }
  const { score, max } = scoreProm(code, answers);
  return { answers, score, max };
}

// ---- Graphique d’évolution (SVG, sans dépendance) ----------
export function renderPromChart(code, responses) {
  const d = PROM_DEFS[code];
  const rows = (responses || []).slice().sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
    .filter(r => r.score !== null && r.score !== undefined);
  if (rows.length === 0) return `<p style="color:#888;font-size:.85rem">Aucune donnée pour l’instant.</p>`;

  const W = 520, H = 180, padL = 38, padR = 16, padT = 16, padB = 30;
  const max = d.max;
  const xs = (i) => rows.length === 1 ? (padL + (W - padL - padR) / 2) : padL + i * (W - padL - padR) / (rows.length - 1);
  const ys = (v) => padT + (1 - v / max) * (H - padT - padB);

  const pts = rows.map((r, i) => [xs(i), ys(r.score)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  const first = rows[0].score, last = rows[rows.length - 1].score;
  const improved = d.betterHigh ? (last - first) >= d.mcid : (first - last) >= d.mcid;
  const lineColor = improved ? '#1e8a4c' : '#2563EB';

  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = padT + f * (H - padT - padB);
    const val = Math.round((1 - f) * max);
    return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#eef2f8"/>
            <text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#94a3b8">${val}</text>`;
  }).join('');

  const dots = rows.map((r, i) => {
    const [x, y] = pts[i];
    const dt = new Date(r.completed_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="${lineColor}"/>
            <text x="${x}" y="${y - 8}" text-anchor="middle" font-size="9" fill="#475569">${r.score}</text>
            <text x="${x}" y="${H - padB + 14}" text-anchor="middle" font-size="9" fill="#94a3b8">${esc(dt)}</text>`;
  }).join('');

  const dir = d.betterHigh ? '↑ plus haut = mieux' : '↓ plus bas = mieux';
  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;font-family:Arial,sans-serif">
      ${grid}
      <path d="${line}" fill="none" stroke="${lineColor}" stroke-width="2.5"/>
      ${dots}
    </svg>
    <div style="display:flex;justify-content:space-between;font-size:.78rem;color:#64748b;margin-top:.2rem">
      <span>${d.short} (${d.unit}) · ${dir}</span>
      <span>${improved ? '<span style="color:#1e8a4c;font-weight:600">Amélioration cliniquement significative</span>' : `Seuil cliniquement important : ${d.mcid} ${d.unit}`}</span>
    </div>`;
}
