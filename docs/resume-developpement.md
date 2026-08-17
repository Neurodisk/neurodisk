# Neurodisk — résumé de développement

Résumé des travaux réalisés. Mis à jour au fil des sessions.

---

## 🔁 État actuel (à lire en premier après un clear du chat)

**Migrations SQL à exécuter dans le SQL Editor Supabase** (dans l'ordre, non confirmées exécutées) :
**025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036.**
(011→024 : confirmées exécutées en juillet 2026, sauf mention contraire ci-dessous.)
- **034** = politique de rétention Loi 25 (dossiers 5 ans après dernier service, comptes inactifs désactivés à 24 mois, registre des incidents 5 ans, `request_account_deletion`, tout via pg_cron).
- **035** = `get_programme_professional()` (RPC SECURITY DEFINER) pour afficher le vrai nom du clinicien dans le PDF patient malgré la RLS.

**Actions en attente côté utilisateur :**
1. **Courriels d'authentification (lien magique + mot de passe oublié)** : le domaine **`neurodisk.com` est vérifié dans Resend** (DKIM/SPF/MX de retour confirmés, DNS sur Cloudflare) — l'ancien plan `notify.cliniqueneurodisk.com` est abandonné. Code corrigé (expéditeur `no-reply@neurodisk.com` via secrets, support `recovery`, repli natif). **⚠️ Reste à faire dans le tableau de bord Supabase** : (a) activer le **SMTP personnalisé** (`smtp.resend.com`, port 465, user `resend`, mot de passe = clé API Resend), (b) **allowlister les Redirect URLs** pour `https://cliniqueneurodisk.com/**`, (c) relever la limite « Emails per hour ». Procédure complète : **`docs/procedure-courriels-auth.md`**.
2. **2FA obligatoire pour le staff** : reporté volontairement (« plus tard »). Actuellement optionnel.
3. **Créer le bucket Storage `patient-files`** (PRIVÉ) s'il ne l'est pas déjà — nécessaire pour les pièces jointes du chat sécurisées (voir migration 033).
4. Valider juridiquement les 4 documents Loi 25 (`docs/loi25/`) + accepter/classer le DPA Supabase.

**Comptes de test utiles :** patient fictif « Ozzy Osbourne » (`gabrielgirard1@hotmail.fr`), admin (`gabrielgirard.kin@gmail.com`).

---

## Session — juillet 2026

### ✉️ Fix : lien magique + mot de passe oublié non fonctionnels (août 2026)
- **Deux causes distinctes.** Lien magique : l'edge function envoyait depuis `onboarding@resend.dev` (domaine de test Resend) → Resend n'autorise l'envoi qu'à l'adresse du compte, donc échec pour tout vrai patient. Mot de passe oublié : ne passait **pas** par Resend, mais par le serveur courriel intégré de Supabase (~2 courriels/h, « pour tests seulement », livraison peu fiable).
- **Domaine** : `neurodisk.com` désormais vérifié dans Resend (DKIM + SPF + MX de retour confirmés par requête DNS ; DNS sur Cloudflare). Expéditeur retenu **`no-reply@neurodisk.com`** + Reply-To — car `neurodisk.com` n'a aucun MX de réception (une réponse de patient y serait perdue). NB : l'app tourne sur `cliniqueneurodisk.com`, le domaine d'envoi est distinct, c'est normal.
- **Edge function** `magic-link-resend` : `MAIL_FROM`/`MAIL_REPLY_TO` lus depuis les **secrets** (changer d'adresse ne demande plus de redéploiement), support du type **`recovery`** (le mot de passe oublié réutilise le même gabarit Resend), sujets distincts par type.
- **Front** (`index.html`) : les deux écrans appellent l'edge function puis **replient automatiquement sur l'envoi natif Supabase** si elle est absente/injoignable → tout fonctionne dès que le SMTP personnalisé est configuré, même sans déploiement CLI. Repli du lien magique en `shouldCreateUser: false` (aucun inconnu ne peut se créer un compte).
- 🔒 **Faille corrigée — énumération de comptes** : un échec d'envoi renvoyait `502` alors qu'un compte inexistant renvoyait `200`, permettant de distinguer les adresses réellement patientes de la clinique (fuite de renseignements de santé, Loi 25). Réponse et message d'écran désormais **identiques dans tous les cas** ; les vraies erreurs vont dans les logs serveur.
- Vérifié en conditions réelles (navigateur, `fetch` intercepté, aucun courriel envoyé) : chemin principal → appel avec `type:'recovery'` ✓ ; repli → edge function 404 puis `/auth/v1/recover` natif ✓ ; message générique et champ vidé dans les deux cas ✓.
- 📋 Procédure de configuration : **`docs/procedure-courriels-auth.md`**.

### 🐛 Fix : ajout de vidéo YouTube dans les ressources bloqué (août 2026)
- **Cause** : la migration 018 (passage Bunny → YouTube) a ajouté `resources.video_url` mais n'a jamais mis à jour l'ancienne contrainte CHECK `video_requires_bunny_id` (héritée du schéma initial Bunny), qui exigeait encore `bunny_video_id IS NOT NULL` pour toute ressource `type='video'`. Le formulaire admin envoie correctement `video_url` (lien YouTube) + `bunny_video_id: null` → violation de contrainte à l'insertion.
- **Correctif** : migration **036** — contrainte réécrite pour accepter `bunny_video_id` OU `video_url`.
- ⚠️ **À exécuter** dans le SQL Editor Supabase (s'ajoute à la liste 025-036).

### 🔧 PDF du programme — corrections ciblées (août 2026)
- **Majuscules automatiques** (`capitalizeSentences`) : première lettre de chaque phrase (consignes, à surveiller, note) mise en majuscule à l'affichage — la donnée en base n'est jamais modifiée, aucune reformulation, aucun titre d'exercice touché.
- **Dédoublonnage note/à surveiller** (`isRedundantNote`) : si la note du professionnel répète essentiellement le même message que l'encadré « À surveiller » (≥60% de mots significatifs communs), elle est masquée automatiquement à l'affichage. Une note distincte reste toujours affichée. Règle du modèle, réutilisable pour tout patient/programme.
- **Page 3 rééquilibrée** : zone « Notes personnelles » réduite à ~82% de l'espace restant (au lieu de 100%), le reste devient une marge de sécurité avant le pied de page ; module de l'exercice seul + ses photos agrandis en contrepartie (ajusté de 94mm à 84mm de colonne image après avoir détecté un risque de collision entre le lien vidéo et le QR — corrigé, marge de ~11mm restaurée).
- **Courbe décorative de la couverture retirée** (page 1) : espace blanc sobre conservé, titre/logo inchangés.
- Validé : 11 scénarios incluant un cas reproduisant exactement le brief (titre « Fléchisseurs profonds du cou (chin tuck couché) » préservé tel quel, minuscules corrigées, note redondante masquée, note distincte conservée), plus génération réelle navigateur (Inter incorporée confirmée, helpers testés en conditions réelles).
- ⚠️ **Limite technique signalée** : agrandir/recadrer les vraies photos de l'exercice « chin tuck couché » nécessite un accès aux fichiers image réels du patient (recadrage pixel), hors de portée d'un changement de code seul — non fait, à traiter séparément si besoin (voir échange avec l'utilisateur).
- Cache-bust library.js v55, program-pdf.js v6.

### ✨ PDF du programme — passe de finition DA (août 2026)
- Suite de la refonte visuelle : neuf points d'une passe de finition, contenu clinique inchangé.
- **Page 3 équilibrée** : la zone « Notes personnelles » occupe désormais tout l'espace restant jusqu'au pied de page (plus de grand vide résiduel), plus de lignes, plus visibles à l'impression.
- **En-têtes p2/p3 identiques et lisibles** : icône simplifiée (`logo-neurodisk-mark.png`) + « Neurodisk » composé en Inter (fin du mot-symbole raster minuscule illisible).
- **Motif de couverture retravaillé** : les points verticaux génériques remplacés par une courbe unique discrète (bézier), qui ne concurrence jamais le titre.
- **Contraste renforcé** pour la clientèle 55-70 ans : libellés (Patient/Professionnel/Date/Programme), label « Consignes », lignes de la zone notes — tous assombris.
- **Pictogramme d'avertissement refait** : bouclier → triangle + point d'exclamation universel (`icoWarning`, `doc.triangle`), identique dans « Précautions générales » et chaque encadré « À surveiller ». (Bug de positionnement corrigé au passage : l'ancien triangle débordait sur le texte suivant.)
- **Textes variables** : bloc patient à hauteur de ligne dynamique — noms/titres/programmes longs passent proprement sur 2 lignes, jamais de débordement (validé avec nom composé, titre professionnel long, nom de programme long).
- **Marge de sécurité bas de page 1** : espacements resserrés (jamais la taille du texte) pour garantir un espace confortable entre la dernière précaution et le pied de page.
- Colonnes d'image légèrement agrandies (limite technique : aucun recadrage/retouche des photos, conformément à la contrainte).
- Validé : 10 scénarios + cas textes longs, régénérés et inspectés visuellement, plus génération réelle navigateur (Inter incorporée confirmée). Cache-bust library.js v54, program-pdf.js v5.

### 🎨 PDF du programme — refonte visuelle « direction artistique » (août 2026)
- Refonte complète du rendu du générateur `js/program-pdf.js` (production, données dynamiques) : allure clinique haut de gamme pour clientèle 55-70 ans. **Contenu clinique jamais modifié** (exercices, ordre, dosages, consignes, précautions, notes) — seule la mise en page change.
- **Police Inter incorporée** : `tools/build_inter_font.mjs` télécharge InterVariable, l'instancie Regular/Bold, la sous-ensemble au français (harfbuzz-wasm via `subset-font`, pas de Python) → `js/inter-font.js` (base64, ~230 Ko). Registrée dans jsPDF (`addFileToVFS`/`addFont`), accents FR complets.
- **Palette** marine profond + turquoise (logo) + blanc cassé + bleu pâle (dosage) + corail (précautions) + turquoise pâle (notes du pro).
- **Format Lettre 8,5×11 par défaut** (clinique nord-américaine ; A4 encore possible via option).
- **Page 1** épurée : logo couleur intégré sur fond clair (plus de rectangle blanc), motif « colonne » discret, filet bicolore, bloc patient, sections Objectifs/Comment utiliser/Précautions avec pictogrammes vectoriels sobres.
- **Exercices** : plus de gros bandeau « EXERCICE » → pastille numérotée navy ; nom en vedette ; catégorie en petite étiquette turquoise ; **2 modules par page** (pagination par mesure, aucun bloc coupé) ; dernier exercice seul agrandi + zone « Notes personnelles » vierge pour équilibrer.
- **Encadrés hiérarchisés** uniformes : dosage (bleu pâle), consignes (fond clair aéré), à surveiller (corail + picto), note du pro (turquoise). Labels en casse normale (fin des MAJUSCULES partout).
- **Pied de page uniforme** : « Clinique Neurodisk » · titre · pagination.
- Robustesse : pattern « mesure == dessin » (fin des chevauchements), interligne du doc fixé (1,3) pour cohérence. Validé par 10 scénarios (1/2/3/6 ex, note longue, sans note/vidéo/image, pro manquant, dosage varié, Lettre + A4) inspectés visuellement + génération réelle navigateur (Inter incorporée confirmée). Bouton « Voir mon programme en PDF » (aperçu, pas de téléchargement forcé). Cache-bust library.js v53, program-pdf.js v4.

### 📄 PDF du programme d'exercices — refonte (génération dans l'app)
- **Abandon de `window.print()`** (qui laissait les en-têtes/pieds du navigateur : date, titre d'onglet, URL, n° page — non supprimables par CSS) au profit d'une **génération PDF vectorielle côté client** : nouveau module `js/program-pdf.js` (jsPDF + qrcode-generator chargés depuis jsDelivr, déjà autorisé par la CSP ; aucun service externe, tout local/Canada).
- **Page d'accueil unique compacte** (fusion des 2 anciennes pages redondantes) : logo, titres, patient, professionnel réel, date, programme, région (si fournie), objectifs réels du patient, « Comment utiliser », précautions générales.
- **2 exercices par page** quand l'espace le permet, `break-inside` géré par mesure+pagination (aucun bloc coupé ; exercice trop grand → page complète ; nombre impair → dernier en demi-page haute sans étirement).
- Chaque bloc : n°, nom FR, catégorie, images, **dosage normalisé** (`3 séries de 12 répétitions / Repos : … / Fréquence : … fois par jour` — uniformise sec→secondes, 2x/jour→2 fois par jour, SANS altérer la prescription), consignes, « À surveiller », note du pro (si présente), **lien vidéo cliquable + QR** (QR seulement si URL valide).
- **Vrai nom du professionnel** via RPC `get_programme_professional` (migration **035**) : la RLS `profiles_select_own` empêchait le patient de lire le profil du clinicien → le PDF affichait toujours « Votre professionnel Neurodisk ». Repli neutre si le nom manque. (Titre/permis/coordonnées : champs inexistants sur `profiles` — omis proprement, à ajouter plus tard si besoin.)
- Bouton patient renommé **« Télécharger mon programme (PDF) »**.
- **Banc d'essai Node** `tools/gen_sample_program_pdf.mjs` (réutilise le MÊME layout que le navigateur) : 10 scénarios (1/2/3/6 exercices, note longue, sans note/vidéo, sans image, pro manquant, dosage varié, A4 + Lettre) → PDF inspectés visuellement. `js/package.json` (`type:module`) ajouté pour permettre à Node d'importer le module partagé.
- ⚠️ Le CSS d'impression `@media print` reste en place comme repli (Ctrl+P) mais n'est plus le chemin officiel.

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
