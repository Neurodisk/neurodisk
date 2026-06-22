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
- **Lier R12/R24 à la courbe** (voir ci-dessus).
- **Journal quotidien douleur/fonction** côté patient → alimente une vraie courbe de douleur en continu.

### Productivité du clinicien
- **Génération auto du programme depuis le diagnostic** : choisir la condition → l'app propose les exercices pertinents de la banque (taggés par condition) ; le clinicien valide.
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
