# Neurodisk — idées & backlog

Document vivant des idées d'amélioration. À reprendre/prioriser au besoin.

---

## 🔜 Idée en attente de décision

### Lier les réévaluations R12 / R24 à la courbe (PROMs)
Les réévaluations officielles du protocole (R12, R24, + la 3ᵉ incluse) sont des **moments de mesure précis**. Idée : étiqueter chaque passation de questionnaire avec son **jalon** (Départ → R12 → R24 → Suivi) et **afficher ces étiquettes sur la courbe d'évolution** (au lieu de seulement la date).

**Ce que ça apporte** : progression jalonnée et lisible (« douleur 7 au Départ → 4 à R12 → 2 à R24 »), avec l'écart entre jalons et le seuil cliniquement significatif déjà en place. Rend la « courbe de douleur » du rapport réelle et personnalisée.

**Petite extension de l'existant** (PROMs déjà codés) :
- Ajouter un champ `timepoint` / jalon à `prom_responses` (Départ, R12, R24, Suivi…).
- L'afficher sous chaque point dans `renderPromChart` (js/proms.js).
- Enregistrer le bon jalon à chaque réévaluation.

**Décisions ouvertes (à trancher avant de coder) :**
1. Que mesure-t-on à R12/R24 ? (set complet ODI-NDI-NPRS-PSFS · douleur seule · douleur + incapacité)
2. Qui saisit ? (le clinicien en visite · le patient · les deux)

---

## 💡 Backlog d'idées (brainstorm)

### Engagement & adhérence
- **Rappels automatiques** (courriel) pour exercices / rendez-vous — meilleur ratio impact/effort pour l'adhérence. Déclencheur pg_cron ou Cloudflare Cron → Edge Function → courriel (Resend). Tables `reminder_settings` + `reminder_log`. *Prérequis : fournisseur courriel + domaine d'envoi vérifié.*
- ~~**Tableau de bord d'adhérence** (clinicien)~~ ✅ livré (section Adhérence, migration 020).
- **Gamification** des objectifs (séries/badges/jalons).

### Clinique & résultats
- ~~**Capsules d'éducation à la douleur (PNE)**~~ ✅ livré (parcours « Comprendre ma douleur », 8 capsules, migration 022).
- **Lier R12/R24 à la courbe** (voir ci-dessus).
- **Journal quotidien douleur/fonction** côté patient → alimente une vraie courbe de douleur en continu.

### Productivité du clinicien
- ~~**Génération auto du programme depuis le diagnostic**~~ ✅ livré (bloc « Génération automatique » dans le builder de programme : condition → exercices pré-ajoutés, clinicien ajuste).
- ~~**Rapport patient auto-rempli**~~ ✅ livré (bouton Rapport par patient, migration 021, js/rapport.js — nom/niveaux/plan + suivi NPRS).

### Expérience & technique
- **App installable (PWA) + accès hors-ligne** aux exercices.
- **Recherche dans les ressources** + notification « nouvelle ressource assignée ».
- **Messagerie patient ↔ clinicien** (le chat entre pros existe déjà).

### Confidentialité vidéo (si besoin un jour)
- Passer de YouTube non répertorié à **Supabase bucket privé + URL signée** si la confidentialité devient importante (coût de bande passante à prévoir).

---

## ✅ Déjà livré (référence)
- Banque d'exercices probante (76, migrations 016/017) + base probante documentée.
- Objectifs patient (court/moyen/long terme) + barre de progression.
- Sondages professionnels.
- Ressources type Word.
- Icônes au trait (catégories).
- Hébergement vidéo YouTube (non répertorié).
- **PROMs** (ODI/NDI/NPRS/PSFS) + courbe d'évolution (migration 019, js/proms.js).
- Rapport patient Word branded (gabarit, base probante).

---

## 🧠 Brainstorm exhaustif (vision plateforme)

### Engagement & adhérence
- ⭐ « Ma séance d'aujourd'hui » : flux guidé (minuteur de repos, coche par exercice, ressenti douleur/effort).
- Gamification (séries, badges, niveaux, défis, carte de parcours).
- Rappels intelligents (courriel/SMS/push), intensifiés si décrochage.
- Coaching audio des exercices (synthèse vocale, 50+).
- Accès proche aidant (lecture seule).
- Programme imprimable + QR vers vidéos ; comparaison « filme-toi ».

### Intelligence clinique
- ⭐ Tableau « Patients à revoir » (adhérence + PROM aggravé + sondage + drapeaux).
- ⭐ Progression auto du programme (base → intermédiaire → avancé selon adhérence/PROMs).
- Alertes d'évolution PROMs (MCID) ; dépistage drapeaux rouges + STarT Back.
- Bilan de fin de traitement auto (patient + médecin référent).
- Trajectoire attendue vs typique de la condition.

### IA sur-mesure
- ⭐ Triage d'admission par IA (symptômes → condition probable + drapeaux rouges).
- Résumé d'évolution en langage clair avant visite ; assistant santé patient (encadré).
- ~~Rédaction IA (lettre référence, résumé de rapport)~~ ✅ livré (edge function `ai-redaction`, Claude `claude-opus-4-8`, carte dans la section Lettre de référence). Éducation personnalisée ; traduction FR/EN : à faire.

### Productivité clinicien
- Modèles de programme réutilisables par condition.
- Calendrier + prise de RDV en ligne + rappels ; planificateur R12/R24 (déclenche PROMs).
- Analyse des trous de contenu ; tableau de bord KPIs.

### Opérations / affaires / croissance
- ⭐ Suivi des paiements / plans de traitement (payé/restant).
- Gestion des références (suivi médecins référents + bilans → plus de références).
- ⭐ Multi-clinique / SaaS marque blanche (revendre la plateforme).
- Demande d'avis Google automatisée ; stats de résultats anonymisées (marketing) ; liste d'attente + préadmission.

### Conformité (Loi 25)
- Consentement électronique + admission (e-signature) ; export du dossier patient ; finaliser items Loi 25.

### Accessibilité & expérience
- Taille de police / fort contraste / mode senior + lecture audio des fiches/capsules.
- PWA installable + hors-ligne ; mode sombre ; multilingue (anglais).

### Innovation « wow » spécifique clinique
- ⭐ Contenu par phase du protocole (R12/R24) : débloquer auto les exercices/capsules selon l'avancement des 24 traitements.
- Intégration podomètre/montre (pas → adhérence marche ; check-ins douleur).
- Analyse posturale par caméra (IA pose) ; QR en salle d'attente ; télésuivi vidéo.

### Top 5 (innovation × valeur × synergie)
1. « Ma séance d'aujourd'hui »  2. Tableau « Patients à revoir »  3. Contenu par phase du protocole (R12/R24)  4. Triage d'admission par IA  5. Suivi des paiements / SaaS marque blanche.
