# Neurodisk — résumé de développement

Résumé des travaux réalisés. Mis à jour au fil des sessions.

---

## Session — juin 2026

### 🔐 Corrections de fond (sécurité / RLS)
- **Ajout de ressource par un pro** ne fonctionnait pas → cause : les politiques RLS ne regardaient que `is_admin()`. Migrations **011** et **012** : helpers `has_section()`, `can_manage_resources()`, `can_manage_categories()` ; les permissions `allowed_sections` sont désormais appliquées côté base sur TOUTES les tables de gestion (ressources, assignations, programmes, catégories, formulaires, rappels, lettres, lecture/maj patients). Garde-fou anti-élévation de privilège sur `profiles`.
- **Doublons d'affichage** dans la bibliothèque patient → déduplication défensive dans `library.js` + garde-fou anti-doublon à l'ajout de ressource.

### ✨ Nouvelles fonctionnalités
- **Type de ressource « Word »** (.doc/.docx) en plus de vidéo/PDF — migration **013**.
- **Sondages professionnels** (onglet Sondage) : builder (texte, échelle 1-5, choix multiple), envoi à des pros sélectionnés, réponses nominatives. Migration **014**. Un sondage rempli disparaît de la liste du pro.
- **Objectifs patient** (court/moyen/long terme) : case « Objectifs » sur une catégorie → onglet motivant côté patient avec barre de progression et cases « atteint ». Section admin dédiée. Migration **015**.
- **Banque d'exercices probante** : 55 exercices de base (**016**) + 21 avancés / retour au sport (**017**) = **76**, taggés par condition avec les bons biais cliniques. Base probante documentée (`docs/exercices-base-probante.md`).
- **PROMs (questionnaires validés)** : ODI, NDI, NPRS (douleur), PSFS + **courbe d'évolution** (seuil MCID), visibles clinicien + patient. Moteur `js/proms.js`, migration **019**.
- **Tableau de bord d'adhérence** (clinicien) : statut actif / à risque / décroché par patient (dernière activité), compteur de séances 7 j, sparkline 14 j, décrochés en premier. Migration **020**.
- **Rapport patient auto-rempli** : bouton Rapport par patient → génère le Word branded rempli depuis la BD (nom, date RX, constats cervical/lombaire, plan, suivi NPRS). Champs cliniques migration **021**, génération navigateur `js/rapport.js` (docx via ESM).
- **Assistant de rédaction IA** : edge function `supabase/functions/ai-redaction` utilisant **Google Gemini (niveau GRATUIT, `gemini-2.0-flash`)** — choisi pour éviter toute facturation (pas l'API Claude payante). Clé `GEMINI_API_KEY` côté serveur. Carte dans la section Lettre de référence (type lettre/résumé, patient optionnel → contexte conditions + NPRS, brouillon éditable + copier). Garde-fous anti-invention. ⚠️ Nécessite : clé gratuite sur aistudio.google.com/apikey + `supabase secrets set GEMINI_API_KEY=...` + `supabase functions deploy ai-redaction`.
- **Conditions structurées par patient + auto-assignation** : table `patient_conditions` (migration **024**). Dans le panneau d'assignation, on coche les diagnostics du patient → bouton « Enregistrer + auto-assigner » qui assigne automatiquement les ressources/fiches taggées pour ces conditions (additif). Le générateur de programme pré-coche aussi les conditions du patient sélectionné.
- **Génération auto du programme depuis le diagnostic** : dans le builder de programme, cocher une OU plusieurs conditions (cases à cocher) propose **3-4 exercices de base** (exclut les avancés : pliométrie, mise en charge, retour au sport ; priorité mobilité/stabilisation/contrôle, variété de catégories) ; le clinicien ajuste et valide. Admin seul, aucune migration.
- **Page Objectifs patient plus motivante** : anneau de progression circulaire, message d'encouragement adaptatif selon le %, couleurs + compteurs par horizon, état « atteint » mis en valeur (`library.js`, aucune migration).
- **Fiches patient par condition** : 11 PDF vulgarisés (servis sous `/fiches/`) + ressources PDF taggées par condition (catégorie « Mes recommandations »), assignables. Migration **023**.
- **Capsules d'éducation à la douleur (PNE)** : parcours « Comprendre ma douleur » (8 capsules pré-remplies, base probante) avec barre de progression et suivi « Vu » par capsule. Flag `shows_education` sur catégorie, section admin de gestion. Migration **022**, contenu dans `docs/capsules-pne.md`.

### 🎨 Interface / branding
- **« 2FA » renommé « Sécurité »** partout dans l'interface + procédure PDF régénérée.
- **Emojis des onglets remplacés par des icônes au trait** (monochromes) + sélecteur d'icônes dans l'admin (taille ajustée à 40 px).

### 🎥 Hébergement vidéo
- Abandon de **Bunny** → d'abord Supabase Storage, puis choix final **YouTube « non répertorié »** (gratuit, illimité). Lecture via iframe `youtube-nocookie`, lien collé dans l'admin. Migration **018** (colonne `video_url`). ⚠️ « Non répertorié » = quiconque a le lien peut voir/repartager (OK pour exercices génériques).

### 📄 Documents générés (Word/PDF)
- **PDF de la procédure Sécurité** (`docs/procedure-2fa.pdf`).
- **Rapport patient Neurodisk** (Word branded, modèle hybride décompression + actif, consignes alignées sur les preuves, tarifs conservés) — `tools/gen_rapport_neurodisk.mjs` → `Rapport_Neurodisk.docx`.
- **Feuille de tournage** des 76 exercices, classée par priorité (P1 trousse de départ, P2 base, P3 avancé), avec consignes « À filmer » et suivi à cocher — `tools/gen_feuille_tournage.mjs`.
- **Recommandations cliniques par condition** (PDF professionnel, favoriser/limiter/éducation par condition + drapeaux rouges) — `docs/recommandations-conditions.html/.pdf`.
- **11 fiches patient vulgarisées** par condition — `tools/gen_fiches_patient.mjs` → `fiches/<slug>.html/.pdf`.
- **Backlog d'idées** — `docs/idees-ameliorations.md`.

### ⚠️ Migrations SQL à exécuter dans le SQL Editor (accumulées)
Dans l'ordre, non confirmées exécutées : **011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024**. Obligatoire avant d'utiliser les nouvelles fonctionnalités correspondantes.

### 💡 Idées en attente / backlog
- Prioritaire : lier les **réévaluations R12/R24** à la courbe (jalons Départ → R12 → R24). Décisions ouvertes : quoi mesurer + qui saisit.
- Autres : tableau « Patients à revoir » (combine adhérence + PROMs + sondages), progression auto du programme (base→avancé), bilan de fin de traitement, rappels courriel, « Ma séance d'aujourd'hui », PWA hors-ligne, suivi des paiements. Détail dans `docs/idees-ameliorations.md`.

### 🔁 Pour reprendre après un clear du chat
1. Lire ce fichier + `docs/idees-ameliorations.md`.
2. **Exécuter les migrations 011→024** dans le SQL Editor Supabase (voir liste ci-dessus) — rien n'est confirmé exécuté.
3. Pour la vidéo : héberger sur YouTube « non répertorié » et coller le lien dans l'admin.
4. Toujours `git add/commit/push` après chaque tâche (déclenche Cloudflare) et incrémenter `?v=` sur `library.js`/`library.css`.
