import fs from 'fs';

// Contenu patient (vulgarisé) par condition. slug = id de la condition.
const FICHES = [
  { slug: 'trousse_depart', cond: 'Bien démarrer',
    intro: "Votre dos vous fait mal en ce moment. Bonne nouvelle : dans la grande majorité des cas, ça s'améliore. Voici comment bien démarrer.",
    aide: ["Bougez un peu chaque jour : de courtes marches font du bien", "Changez souvent de position", "Faites les exercices doux montrés par votre équipe", "Dormez bien et prenez soin de gérer votre stress"],
    doux: ["Évitez de rester couché ou immobile longtemps", "Ne vous laissez pas gagner par la peur de bouger"],
    savoir: "Avoir mal ne veut pas dire que vous vous blessez. Le mouvement est sécuritaire et aide à guérir." },

  { slug: 'hernie_discale', cond: 'Hernie discale',
    intro: "Une hernie discale est fréquente et, la plupart du temps, elle s'améliore d'elle-même avec le temps et les bons mouvements.",
    aide: ["Privilégiez les mouvements qui ramènent la douleur vers le bas du dos (souvent se pencher légèrement vers l'arrière)", "Marchez régulièrement et gardez une bonne posture", "Faites vos exercices de stabilité"],
    doux: ["En phase douloureuse, limitez de rester assis longtemps", "Évitez de vous pencher et soulever de façon répétée si ça envoie la douleur dans la jambe"],
    savoir: "La plupart des hernies guérissent sans chirurgie : le corps résorbe souvent la hernie. Si la douleur remonte vers le dos plutôt que de descendre dans la jambe, c'est bon signe." },

  { slug: 'sciatique', cond: 'Sciatique',
    intro: "La sciatique est une douleur qui descend dans la jambe à cause d'un nerf irrité. C'est inconfortable, mais ça s'améliore généralement.",
    aide: ["Marchez et changez souvent de position", "Faites les exercices de « glissement » du nerf montrés par votre équipe (un va-et-vient doux)"],
    doux: ["Évitez de rester assis trop longtemps", "N'étirez pas le nerf à fond : pas d'étirement forcé qui augmente la douleur"],
    savoir: "Une douleur dans la jambe fait peur, mais elle n'est pas dangereuse en soi et diminue habituellement avec le temps et le mouvement." },

  { slug: 'radiculopathie', cond: 'Racine nerveuse irritée (radiculopathie)',
    intro: "Une racine nerveuse est irritée, ce qui peut donner de la douleur, des picotements ou une faiblesse dans un bras ou une jambe.",
    aide: ["Trouvez les positions et mouvements qui soulagent (votre équipe vous aide à les repérer)", "Faites vos exercices régulièrement", "Gardez une bonne posture"],
    doux: ["Évitez les positions qui font descendre la douleur plus loin dans le membre"],
    savoir: "Le pronostic est généralement bon. Signalez à votre équipe toute faiblesse qui augmente." },

  { slug: 'stenose_foraminale', cond: 'Sténose foraminale',
    intro: "Le petit passage par lequel sort le nerf s'est rétréci. Certaines positions ouvrent ce passage et vous soulagent.",
    aide: ["Penchez-vous légèrement vers l'avant : ça ouvre l'espace", "Marchez avec des pauses; le vélo est souvent confortable"],
    doux: ["Évitez de vous cambrer (pencher vers l'arrière)", "Évitez de tourner longtemps du côté douloureux"],
    savoir: "Vos symptômes dépendent souvent de la position : s'asseoir ou se pencher en avant soulage." },

  { slug: 'stenose_spinale', cond: 'Sténose spinale (canal étroit)',
    intro: "Le canal de la colonne s'est un peu rétréci. Marcher peut devenir inconfortable, mais de bonnes stratégies aident beaucoup.",
    aide: ["Penchez-vous légèrement vers l'avant pour soulager (s'appuyer sur un chariot d'épicerie aide à marcher plus loin)", "Faites du vélo et marchez par petites tranches", "Renforcez vos jambes et votre tronc"],
    doux: ["Évitez de rester cambré", "Évitez de rester debout immobile longtemps"],
    savoir: "S'asseoir et se pencher en avant soulagent. On augmente la distance de marche progressivement." },

  { slug: 'arthrose_cervicale', cond: 'Arthrose cervicale',
    intro: "De l'arthrose au cou est très fréquente avec l'âge et ne veut pas dire que votre cou est « usé » ou fragile.",
    aide: ["Bougez le cou doucement dans toutes les directions", "Renforcez les muscles profonds du cou et du haut du dos", "Soignez votre posture et restez actif"],
    doux: ["Évitez de rester figé longtemps devant un écran", "Ne portez pas le collier en permanence"],
    savoir: "L'arthrose est courante et n'égale pas la douleur : le mouvement nourrit l'articulation." },

  { slug: 'arthrose_lombaire', cond: 'Arthrose lombaire',
    intro: "De l'arthrose au bas du dos est normale avec l'âge. Rester actif est la meilleure façon de garder un dos en santé.",
    aide: ["Renforcez progressivement vos muscles (fessiers, tronc, jambes)", "Marchez, faites de l'aérobie ou de l'aquaforme", "Bougez régulièrement"],
    doux: ["Évitez le repos prolongé", "Évitez d'éviter les activités par peur"],
    savoir: "« Usure » ne veut pas dire fatalité : l'exercice protège et réduit la douleur." },

  { slug: 'spondylolyse', cond: 'Spondylolyse',
    intro: "Il s'agit d'une petite fragilité d'une partie de la vertèbre, fréquente chez les personnes actives. Ça se gère bien.",
    aide: ["Renforcez votre tronc en gardant le dos neutre (gainage, exercices de stabilité)", "Étirez l'arrière des cuisses et l'avant des hanches"],
    doux: ["Évitez de vous cambrer fortement et de façon répétée", "Évitez les impacts (sauts) trop tôt"],
    savoir: "Avec une bonne gestion, le retour aux activités et au sport est très fréquent." },

  { slug: 'spondylolisthesis', cond: 'Spondylolisthésis',
    intro: "Une vertèbre a légèrement glissé vers l'avant. Avec les bons exercices de stabilité, on contrôle bien la situation.",
    aide: ["Renforcez les muscles profonds du ventre et les fessiers", "Privilégiez les positions neutres ou légèrement penchées en avant", "Apprenez à bouger en gardant le dos droit"],
    doux: ["Évitez de vous cambrer (pencher vers l'arrière)", "Évitez les impacts"],
    savoir: "Les exercices de stabilité ont des effets durables sur la douleur et la fonction." },

  { slug: 'autre', cond: 'Autre',
    intro: "Votre situation est particulière : votre équipe adapte les conseils à votre cas.",
    aide: ["Restez actif et faites vos exercices", "Appliquez les conseils d'autogestion : sommeil, gestion du stress, reprise progressive"],
    doux: ["Évitez le repos prolongé et l'immobilité"],
    savoir: "Posez vos questions à votre équipe : les recommandations seront ajustées à votre évaluation." },
];

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const tpl = (f) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${esc(f.cond)} — Neurodisk</title>
<style>
  @page { margin: 1.6cm; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif; color:#1f2937; line-height:1.55; max-width:720px; margin:0 auto; padding:2rem; font-size:14.5px; }
  header { display:flex; align-items:center; gap:1rem; border-bottom:3px solid #1B2B6B; padding-bottom:.7rem; margin-bottom:1rem; }
  header img { width:150px; height:auto; }
  h1 { color:#1B2B6B; font-size:1.5rem; margin:0; }
  .sub { color:#6b7280; font-size:.85rem; }
  .intro { font-size:1rem; background:#f3f5fb; border-radius:8px; padding:.8rem 1rem; margin:1rem 0; }
  h2 { font-size:1.05rem; margin:1.1rem 0 .4rem; }
  .aide h2 { color:#1e8a4c; } .doux h2 { color:#c0392b; }
  ul { margin:.2rem 0 .4rem 1.2rem; padding:0; } li { margin-bottom:.3rem; }
  .savoir { background:#eef4ff; border-left:4px solid #2563EB; border-radius:6px; padding:.8rem 1rem; margin-top:1rem; }
  .savoir strong { color:#1B2B6B; }
  footer { margin-top:2rem; border-top:1px solid #e5e7eb; padding-top:.7rem; font-size:.8rem; color:#6b7280; }
  .warn { color:#a32d2d; }
</style></head><body>
  <header><img src="../assets/logo-neurodisk.png" alt="Neurodisk">
    <div><h1>${esc(f.cond)}</h1><div class="sub">Mes recommandations · Clinique Neurodisk</div></div>
  </header>
  <p class="intro">${esc(f.intro)}</p>
  <div class="aide"><h2>✅ Ce qui aide</h2><ul>${f.aide.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="doux"><h2>🟠 À y aller doucement</h2><ul>${f.doux.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="savoir"><strong>💡 Bon à savoir :</strong> ${esc(f.savoir)}</div>
  <footer>
    Ces conseils généraux ne remplacent pas l'avis de votre professionnel, qui adapte les recommandations à votre situation.
    <br><span class="warn">⚠ Communiquez rapidement avec la clinique en cas de perte de force importante, de difficulté à uriner ou d'engourdissement entre les jambes.</span>
    <br>Clinique Neurodisk · 418 543-1113
  </footer>
</body></html>`;

fs.mkdirSync('fiches', { recursive: true });
FICHES.forEach(f => fs.writeFileSync(`fiches/${f.slug}.html`, tpl(f)));
console.log('OK', FICHES.length, 'fiches HTML écrites dans fiches/');
