# Courriels d'authentification Neurodisk — procédure de configuration

Concerne les deux écrans de `index.html` :
- **« Mot de passe oublié ? »**
- **« Recevoir un lien de connexion par courriel »** (lien magique)

---

## Pourquoi ça ne fonctionnait pas

| Flux | Cause |
|---|---|
| Lien magique | L'edge function envoyait depuis `onboarding@resend.dev`, le **domaine de test** de Resend. Resend n'autorise alors l'envoi **qu'à l'adresse du compte Resend** → échec pour tous les vrais patients. |
| Mot de passe oublié | N'utilisait **pas** Resend du tout, mais le serveur courriel **intégré de Supabase** : limité à ~2 courriels/heure, marqué « pour tests seulement », livraison peu fiable. |

Le domaine **`neurodisk.com` est maintenant vérifié dans Resend** (DKIM, SPF et MX de retour confirmés, DNS géré par Cloudflare). L'expéditeur retenu est **`no-reply@neurodisk.com`** — car `neurodisk.com` n'a **aucun MX de réception**, donc une réponse de patient y serait perdue ; un **Reply-To** vers une vraie boîte est ajouté.

---

## Architecture après correctif

Les deux écrans suivent la même logique, avec **repli automatique** :

```
1. Appel de l'edge function magic-link-resend  (gabarit Resend brandé)
        │
        ├── succès ──────────────► courriel envoyé via Resend
        │
        └── échec / non déployée ─► repli : envoi natif Supabase
                                     (fonctionne dès que le SMTP
                                      personnalisé est configuré)
```

Conséquence pratique : **l'étape 1 ci-dessous suffit à tout réparer.** L'étape 2 est optionnelle et sert uniquement à obtenir le gabarit Resend brandé.

---

> ### ⚠️ Où sont ces réglages ?
> Ils ne sont **pas** dans « Project Settings ». Ils se trouvent dans la section **Authentication** du menu principal de gauche (icône utilisateurs), qui possède son propre sous-menu : *Users, Policies, Sign In / Providers, Sessions, **Rate Limits**, **Emails**, **URL Configuration**, **SMTP**…*
>
> Liens directs pour le projet Neurodisk (`jqxykxkikvrgwnajhhbi`) :
> - SMTP → https://supabase.com/dashboard/project/jqxykxkikvrgwnajhhbi/auth/smtp
> - URL Configuration → https://supabase.com/dashboard/project/jqxykxkikvrgwnajhhbi/auth/url-configuration
> - Rate Limits → https://supabase.com/dashboard/project/jqxykxkikvrgwnajhhbi/auth/rate-limits

## Étape 1 — SMTP personnalisé dans Supabase *(obligatoire)*

Répare les deux flux, sans aucun déploiement.

1. Créer une clé API dans Resend : **resend.com → API Keys → Create API Key** (permission *Sending access* suffit). Copier la clé `re_...`.
2. Supabase → **Authentication → SMTP** ([lien direct](https://supabase.com/dashboard/project/jqxykxkikvrgwnajhhbi/auth/smtp)) → activer **Enable Custom SMTP**.
3. Remplir :

   | Champ | Valeur |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | *la clé `re_...`* (à coller par toi) |
   | Sender email | `no-reply@neurodisk.com` |
   | Sender name | `Clinique Neurodisk` |

4. **Save**.

> Si le port 465 est bloqué, essayer `587`. Ne jamais partager la clé API par courriel ou message.

## Étape 2 — Autoriser les URL de redirection *(obligatoire)*

Sans ça, le courriel part mais **le lien échoue au clic**.

Supabase → **Authentication → URL Configuration** ([lien direct](https://supabase.com/dashboard/project/jqxykxkikvrgwnajhhbi/auth/url-configuration)) :

- **Site URL** : `https://plateforme.neurodisk.com`
- **Redirect URLs** — ajouter ces deux entrées **exactes** :
  - `https://plateforme.neurodisk.com/reset-password.html`
  - `https://plateforme.neurodisk.com/library.html`

> ⚠️ **La plateforme est sur `plateforme.neurodisk.com`**, pas sur `cliniqueneurodisk.com` (ce dernier est le site vitrine de la clinique). Se tromper de domaine ici casse le lien au clic.
>
> Avantage : le domaine d'envoi (`neurodisk.com`) et celui de l'application (`plateforme.neurodisk.com`) partagent la même racine — c'est meilleur pour la confiance et la délivrabilité.

> Le caractère générique `https://plateforme.neurodisk.com/**` fonctionne aussi, mais la documentation Supabase recommande des **chemins exacts en production** (le générique est prévu pour le développement et les URL de prévisualisation).

## Étape 3 — Relever la limite d'envoi *(recommandé)*

Supabase → **Authentication → Rate Limits** ([lien direct](https://supabase.com/dashboard/project/jqxykxkikvrgwnajhhbi/auth/rate-limits)) → augmenter **« Emails per hour »** (la valeur par défaut vise le serveur de test ; avec un SMTP personnalisé on peut monter, p. ex. 100/h).

## Étape 4 — Gabarit Resend brandé *(recommandé)*

Fait passer les courriels par le gabarit Resend `d2df0c0d-…` au lieu du gabarit Supabase.

> ### ⚠️ Pourquoi ce n'est pas vraiment « optionnel »
> La version **actuellement déployée** de l'edge function est l'ancienne : elle ignore le paramètre `type` et envoie toujours un **lien magique**, même pour une demande de mot de passe oublié.
>
> En pratique, pour un vrai patient, l'ancienne fonction échoue chez Resend (expéditeur `onboarding@resend.dev`) → le repli natif prend le relais → comportement correct. **Mais** pour l'adresse du compte Resend (`gabrielgirard.kin@gmail.com`), l'ancienne fonction réussit et renvoie un **lien de connexion au lieu d'un lien de réinitialisation** — exactement l'adresse avec laquelle tu vas tester.
>
> Donc : soit tu fais l'étape 4, soit tu testes le mot de passe oublié avec une **autre** adresse que celle du compte Resend.

### 4a — Jeton d'accès (règle le problème de `supabase login` sous Windows)

Le CLI est installé et le projet est déjà lié (`jqxykxkikvrgwnajhhbi`) ; il manque seulement l'authentification. Pas besoin du login interactif :

1. Créer un jeton personnel : **https://supabase.com/dashboard/account/tokens** → *Generate new token* → copier `sbp_…`
2. Dans PowerShell, à la racine du projet :

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_colle_ton_jeton_ici"
```

> Ce jeton donne un accès complet au projet : ne le partage avec personne et ne le colle jamais dans un fichier versionné. Il reste valable le temps de la fenêtre PowerShell.

> ### ⚠️ Piège Windows n°1 — `npx` bloqué par la stratégie d'exécution
> `npx supabase …` échoue avec :
> `Impossible de charger le fichier …\npx.ps1, car l'exécution de scripts est désactivée sur ce système` (`PSSecurityException` / `UnauthorizedAccess`).
>
> PowerShell refuse d'exécuter les scripts `.ps1`. Taper simplement `supabase` échoue pareil (un `supabase.ps1` existe aussi).
>
> **Solution retenue : utiliser `supabase.cmd`** — un fichier de commandes, non soumis à cette restriction. Le CLI est déjà installé globalement (`%AppData%\npm\supabase.cmd`, v2.105.0), donc `npx` est inutile.
>
> Solution de rechange, valable **uniquement pour la fenêtre en cours** :
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
> ❌ Éviter les variantes `-Scope LocalMachine` / `Unrestricted` vues sur les forums : elles abaissent la sécurité de tout le poste de façon permanente.

Vérifier que l'authentification fonctionne :

```powershell
supabase.cmd projects list
```

### 4b — Définir les secrets

> ### ⚠️ Piège Windows n°2 — les chevrons
> `<` et `>` sont des opérateurs de redirection en PowerShell. L'argument **doit** être entre guillemets simples, sinon la commande échoue.

```powershell
supabase.cmd secrets set 'MAIL_FROM=Clinique Neurodisk <no-reply@neurodisk.com>' --project-ref jqxykxkikvrgwnajhhbi
```

```powershell
supabase.cmd secrets set 'MAIL_REPLY_TO=info@cliniqueneurodisk.com' --project-ref jqxykxkikvrgwnajhhbi
```

Vérifier que `RESEND_API_KEY` est bien présent (il devrait déjà y être) :

```powershell
supabase.cmd secrets list --project-ref jqxykxkikvrgwnajhhbi
```

> Alternative sans CLI : ces secrets se règlent aussi dans le tableau de bord, section **Edge Functions → Secrets**. Un changement de secret est pris en compte **immédiatement, sans redéploiement**.

### 4c — Déployer la fonction corrigée

```powershell
supabase.cmd functions deploy magic-link-resend --no-verify-jwt --project-ref jqxykxkikvrgwnajhhbi
```

> `--no-verify-jwt` est indispensable : l'utilisateur n'a pas encore de session quand il demande un lien.

> ⚠️ Vérifier que la boîte `info@cliniqueneurodisk.com` existe réellement (le domaine a un MX chez Pacifique Hosting) — sinon mettre une adresse réellement relevée, sans quoi les réponses des patients se perdront.

---

## Tester

1. Aller sur **https://plateforme.neurodisk.com** → **« Mot de passe oublié ? »** → entrer une adresse de **compte existant** → le courriel doit arriver en moins d'une minute.
2. Même chose avec **« Recevoir un lien de connexion par courriel »**.
3. Cliquer le lien reçu : il doit ouvrir `reset-password.html` (ou `library.html`) **connecté**, sans message d'erreur.

Tester avec le patient fictif **Ozzy Osbourne** (`gabrielgirard1@hotmail.fr`) avant d'ouvrir aux vrais patients.

## Diagnostiquer

Le message affiché au patient est **toujours générique** (voir « Sécurité » ci-dessous), donc l'écran ne dira jamais ce qui a échoué. Les vraies erreurs sont dans les logs :

```bash
supabase functions logs magic-link-resend
```

Ou : Supabase → **Edge Functions → magic-link-resend → Logs**. Pour le repli natif : Supabase → **Authentication → Logs**.

Erreurs Resend fréquentes :

| Message | Cause |
|---|---|
| `You can only send testing emails to your own email address` | `MAIL_FROM` pointe encore sur `onboarding@resend.dev` |
| `The domain is not verified` | Le domaine du `MAIL_FROM` n'est pas vérifié dans Resend |
| `Invalid API key` | Clé `RESEND_API_KEY` absente ou révoquée |

---

## Sécurité — anti-énumération de comptes

Les deux écrans affichent **le même message quoi qu'il arrive** (« Si un compte existe pour ce courriel… »), et l'edge function renvoie **la même réponse** que le compte existe ou non, **y compris si l'envoi échoue**.

C'est délibéré : sans cela, un attaquant pourrait tester des adresses pour découvrir lesquelles correspondent à des patients de la clinique — une fuite de renseignements de santé au sens de la Loi 25.

C'était d'ailleurs un **défaut réel du code précédent** : un échec d'envoi renvoyait `502` alors qu'un compte inexistant renvoyait `200`, ce qui permettait de distinguer les deux. Corrigé.

Le lien magique de repli utilise `shouldCreateUser: false` : **personne ne peut se créer un compte** depuis cet écran.
