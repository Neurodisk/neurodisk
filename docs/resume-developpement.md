# Neurodisk — résumé de développement

Résumé des travaux réalisés. Mis à jour au fil des sessions.

---

## 🔁 État actuel (à lire en premier après un clear du chat)

**Migrations SQL à exécuter dans le SQL Editor Supabase** (dans l'ordre, non confirmées exécutées) :
**025, 026, 027, 028, 029, 030, 031, 032, 033.**
(011→024 : confirmées exécutées en juillet 2026, sauf mention contraire ci-dessous.)

**Actions en attente côté utilisateur :**
1. **Lien magique / Resend** : domaine `notify.cliniqueneurodisk.com` créé côté Resend mais **DNS pas encore configuré** (enregistrements DKIM/MX/SPF fournis, DNS géré chez Pacifique Hosting — ni GoDaddy ni Cloudflare). Une fois vérifié, changer `MAIL_FROM` dans `supabase/functions/magic-link-resend/index.ts` de `onboarding@resend.dev` → `info@notify.cliniqueneurodisk.com`, puis `supabase functions deploy magic-link-resend --no-verify-jwt`. En attendant, l'envoi ne fonctionne QUE vers l'adresse du compte Resend (`gabrielgirard.kin@gmail.com`), pas vers de vrais patients.
2. **2FA obligatoire pour le staff** : reporté volontairement (« plus tard »). Actuellement optionnel.
3. **Créer le bucket Storage `patient-files`** (PRIVÉ) s'il ne l'est pas déjà — nécessaire pour les pièces jointes du chat sécurisées (voir migration 033).
4. Valider juridiquement les 4 documents Loi 25 (`docs/loi25/`) + accepter/classer le DPA Supabase.

**Comptes de test utiles :** patient fictif « Ozzy Osbourne » (`gabrielgirard1@hotmail.fr`), admin (`gabrielgirard.kin@gmail.com`).

---

## Session — juillet 2026

### 🎥 Coach IA par caméra (analyse de pose)
- POC `tools/coach-demo.html` : MediaPipe (navigateur, aucun serveur), squelette + fantôme de démo en surimpression, comparaison de pose en direct. Branding logo Neurodisk (en-tête, écran d'accueil, filigrane caméra).
- **Table `exercise_pose_refs`** (migration **027**) : une démo de pose par exercice, RLS lecture authentifiée / écriture clinicien.
- Admin : bouton **« 🎬 Démo coach »** + badge par exercice pour enregistrer la démo caméra.
- Patient : bouton **« 🎥 Filme-toi pour être corrigé »** dans le modal d'exercice, visible seulement si une démo existe.
- Consignes vocales espacées à **1 / 15 secondes** (`SPEAK_GAP`).
- ⚠️ Piège résolu : sur Cloudflare Workers, les règles `_headers` **par-page** ne s'appliquent pas (seule la règle globale `/*` compte) → CSP élargie globalement (wasm, CDN MediaPipe, caméra) au lieu de règles par-chemin mortes.

### 📋 Bilan Neurodisk / questionnaires unifiés
- **Modèle unifié `assessments`** (migration **028**) : `instruments`, `assessments` (jamais écrasé), `assessment_responses`, `assessment_scores`, `red_flag_alerts`. Remplace/absorbe l'ancien module PROMs (migration **029** : copie non destructive de l'historique ODI/NDI/NPRS/PSFS, `prom_responses` conservée en lecture).
- **Module Neurodisk (tronc commun)** — contenu 100% original codé tel quel : douleur EVA, localisation/irradiation, déclencheurs/provocations (A-D), patron directionnel (discal vs sténose, dérivé, clinicien seulement), marche, sommeil, activités personnelles, PGIC (réévaluation), **dépistage drapeaux rouges** (bloquant, court-circuite vers écran d'orientation + alerte clinicien).
- **QBPDS** : texte officiel français intégré (WorkSafeNB). **STarT Back** : traduction officielle intégrée (Demoulin, ULiège 2009) — remplace une première traduction IA de dépannage. Les deux branchés automatiquement au bilan si le patient a une condition lombaire.
- **Courbes d'évolution** (douleur/QBPDS/StarT Back) côté patient (douleur seule) et admin (les trois) — `renderAssessmentChart`.
- **Badge drapeaux rouges temps réel** sur la sidebar admin (Supabase Realtime, migration **031**) + bannière avec acquittement.
- Testé de bout en bout en conditions réelles (patient fictif) : bilan initial + réévaluation + drapeau rouge + acquittement + courbes — tout confirmé fonctionnel, données de test nettoyées.

### 🏋️ Templates R12/R24 (générateur de programmes probants)
- `js/program-templates.js` : **5 profils mécaniques** (extension/McKenzie, flexion/décompression, stabilisation neutre, cervical, universel) × R12 (fondamental) / R24 (progression) = 10 templates de 3 exercices, dosage + justification probante.
- **Génération multi-conditions** : sélection de plusieurs conditions → programme sur-mesure priorisé par couverture (exercices bons pour PLUSIEURS conditions en premier) ; sécurité anti-biais opposés (exclut l'extension si une condition la contre-indique, avec avertissement) ; combine cervical+lombaire en un programme équilibré ; exclut les exercices avancés (mise en charge/pliométrie/retour au sport) de la génération auto.
- **7 nouvelles conditions cliniques** (migration **030**) : discopathie dégénérative L/C, protrusion discale L/C, syndrome facettaire, dysfonction sacro-iliaque, céphalée cervicogénique — + comblé le tag d'exercices manquant sur 2 conditions cervicales existantes.

### 📊 Tableau de bord patient unifié + 🖨️ handout PDF
- Nouvelle section admin **« Tableau de bord »** : vue 360 par patient (adhérence, patron directionnel, dernier PGIC, conditions, drapeaux rouges, courbes bilan + PROMs regroupées).
- **Handout imprimable par programme** : page brandée (logo, photo, dosage, description, QR code vers la vidéo de démo si elle existe — généré côté client, `qrcode-generator`).

### 🖼️ Photos d'exercices
- Modal **Modifier un exercice** : ajout/suppression de photos (upload, aperçu, vignette = 1ʳᵉ photo), synchronisé à l'enregistrement.
- **Fix affichage** : les photos étaient rognées (`object-fit:cover` dans des cadres 16:9/4:3 fixes) → passage à `contain` partout (grille admin, modal patient, carte patient) ; cadre modal patient plus haut (`max-height:70vh` sans ratio imposé) pour les photos portrait.

### 📄 Page patient « Programme d'entraînement adapté Neurodisk »
- Refonte complète de la vue « Mes exercices » patient : **retiré** Bilan Neurodisk, Ma progression/calendrier, indicateurs Aucun/Partiel/Complet (données intactes en base + admin, juste plus affichées côté patient).
- Nouvelle structure : en-tête (titre, professionnel, date), intro rassurante, carte « Comment utiliser votre programme », cartes d'exercice repensées (n° d'ordre, dosage en encadré, Consignes, **« À surveiller »** = précautions, bouton Voir l'exercice + case discrète adhérence). Lisibilité 50+ (texte ≥17px, boutons 48px).
- **Version imprimable/PDF refaite** : vraie page de couverture clinique (bandeau bleu marine, logo, patient/pro/date/programme, objectifs réels du patient si disponibles, sinon génériques), cartes 2 colonnes (image | infos) non coupées entre pages, palette clinique (dosage bleu doux, à surveiller rouge très doux, note pro jaune pâle), QR par exercice si vidéo. `@page A4 16mm`. ⚠️ Limite connue : l'en-tête/pied de page du **navigateur** (URL, date, n° page) reste hors de portée du CSS — décocher « En-têtes et pieds de page » dans la boîte d'impression pour un rendu 100% propre.

### 🔒 Audit de sécurité + correctifs Loi 25
- Revue de code statique complète. **Solide** : RLS cloisonnée, `is_admin()`/`has_section()` SECURITY DEFINER + search_path verrouillé, anti-escalade de privilège, edge functions vérifient is_admin avant service_role, échappement XSS systématique (`esc()`), pas de fuite de secret, pas de PHI dans les logs.
- **Faille critique corrigée** : pièces jointes du chat dans un bucket **public** (`PDFS formation`, `getPublicUrl`) → accessibles sans authentification. Corrigé : nouveau bucket **privé** `patient-files`, chemin keyé par conversation, URL signées (1h) générées à la demande. Migration **033** (politiques storage.objects : lecture/écriture = participants de la conversation, suppression = owner ou admin).
- **Effacement complété** : `erasePatient` supprime maintenant aussi les fichiers Storage du patient (droit à l'effacement, avant incomplet).
- **Consentement électronique Loi 25** in-app (modal bloquant 1ʳᵉ connexion patient, table `consents`, versionné) + audit étendu aux 12 tables de santé créées depuis juin (migration **032**).
- Testé de bout en bout en conditions réelles (upload, URL publique bloquée/400, URL signée fonctionnelle/200, non-participant bloqué, clic réel UI, suppression confirmée) — tout validé, données de test nettoyées.

### ✉️ Lien magique via Resend (edge function)
- Nouvelle **Supabase Edge Function** `magic-link-resend` (PAS Netlify — le site déploie sur Cloudflare Workers, `netlify.toml` est un résidu inactif). Génère le lien via `auth.admin.generateLink()` (n'envoie pas l'email par défaut de Supabase), envoie via Resend avec le template `d2df0c0d-a49b-40e2-a57e-52b1c4801c29` (variable `CONFIRMATION_URL`). Réponse toujours générique (anti-énumération de comptes).
- Nouvel écran « Recevoir un lien de connexion par courriel » sur `index.html`.
- **Déployé et testé avec succès** (envoi réel confirmé) — mais avec l'expéditeur **temporaire** `onboarding@resend.dev` (domaine de test Resend, n'autorise l'envoi qu'à l'adresse du compte Resend, pas encore aux vrais patients).
- ⚠️ **Domaine réel en attente** : `cliniqueneurodisk.com` a son DNS chez **Pacifique Hosting** (`ns3/ns4.pacifiquehosting.com`), ni GoDaddy (juste registraire) ni Cloudflare. Décision prise : ajouter un sous-domaine dédié **`notify.cliniqueneurodisk.com`** dans Resend (évite tout risque sur le MX/SPF existant du domaine racine) — domaine créé côté Resend (DKIM/SPF/MX fournis), **DNS pas encore configuré chez l'hébergeur**. Option discutée : déléguer le DNS complet à Cloudflare pour tout gérer au même endroit (non fait). Une fois le domaine vérifié, changer `MAIL_FROM` dans `magic-link-resend/index.ts` de `onboarding@resend.dev` vers `info@notify.cliniqueneurodisk.com` et redéployer.

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
- **Assistant de rédaction IA** : edge function `supabase/functions/ai-redaction` utilisant **Google Gemini (niveau GRATUIT, `gemini-2.5-flash`)** — déployée le 2026-06-23 via CLI (`--no-verify-jwt`), secret `GEMINI_API_KEY` configuré. NB : `gemini-2.0-flash` avait `limit:0` sur ce projet → bascule sur `gemini-2.5-flash` qui a du quota gratuit. — choisi pour éviter toute facturation (pas l'API Claude payante). Clé `GEMINI_API_KEY` côté serveur. Carte dans la section Lettre de référence (type lettre/résumé, patient optionnel → contexte conditions + NPRS, brouillon éditable + copier). Garde-fous anti-invention. ⚠️ Nécessite : clé gratuite sur aistudio.google.com/apikey + `supabase secrets set GEMINI_API_KEY=...` + `supabase functions deploy ai-redaction`.
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
