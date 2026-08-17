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

- **Site URL** : `https://cliniqueneurodisk.com`
- **Redirect URLs** — ajouter ces deux entrées **exactes** :
  - `https://cliniqueneurodisk.com/reset-password.html`
  - `https://cliniqueneurodisk.com/library.html`

> Le caractère générique `https://cliniqueneurodisk.com/**` fonctionne aussi, mais la documentation Supabase recommande des **chemins exacts en production** (le générique est prévu pour le développement et les URL de prévisualisation).

## Étape 3 — Relever la limite d'envoi *(recommandé)*

Supabase → **Authentication → Rate Limits** ([lien direct](https://supabase.com/dashboard/project/jqxykxkikvrgwnajhhbi/auth/rate-limits)) → augmenter **« Emails per hour »** (la valeur par défaut vise le serveur de test ; avec un SMTP personnalisé on peut monter, p. ex. 100/h).

## Étape 4 — Gabarit Resend brandé *(optionnel)*

Uniquement pour que les courriels utilisent le gabarit Resend `d2df0c0d-…` au lieu du gabarit Supabase. Nécessite le CLI.

```bash
supabase secrets set MAIL_FROM="Clinique Neurodisk <no-reply@neurodisk.com>"
```

```bash
supabase secrets set MAIL_REPLY_TO="info@cliniqueneurodisk.com"
```

```bash
supabase functions deploy magic-link-resend --no-verify-jwt
```

> `MAIL_FROM` et `MAIL_REPLY_TO` sont lus depuis les secrets : changer d'adresse plus tard ne demande **aucun redéploiement**.
>
> ⚠️ Vérifier que la boîte `info@cliniqueneurodisk.com` existe bien (le domaine a un MX chez Pacifique Hosting) — sinon utiliser une adresse réellement relevée.

---

## Tester

1. Écran de connexion → **« Mot de passe oublié ? »** → entrer une adresse de **compte existant** → le courriel doit arriver en moins d'une minute.
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
