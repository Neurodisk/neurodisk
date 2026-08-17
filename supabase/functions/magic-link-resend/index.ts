// ============================================================
// NEURODISK — Edge Function : magic-link-resend
// ============================================================
// Envoie les courriels d'authentification via Resend (gabarit de la
// clinique) au lieu du serveur courriel intégré de Supabase, qui est
// limité à ~2 courriels/heure et n'est pas destiné à la production.
//
// Gère DEUX types de courriels, avec le même gabarit Resend :
//   - 'magiclink' : lien de connexion sans mot de passe
//   - 'recovery'  : réinitialisation du mot de passe
//
// Flux :
//   1. Reçoit { email, type } (appel PUBLIC, non authentifié — c'est
//      justement l'écran qui sert à se connecter).
//   2. Génère le lien via supabaseAdmin.auth.admin.generateLink()
//      — cette méthode ADMIN génère l'URL sans déclencher l'envoi du
//      courriel par défaut de Supabase.
//   3. Envoie via l'API Resend avec le gabarit de la clinique, en
//      passant l'URL dans la variable CONFIRMATION_URL.
//
// Paramètres JSON :
//   email : string (obligatoire)
//   type  : 'magiclink' | 'recovery' (défaut : 'magiclink')
//
// Sécurité :
//   - Endpoint volontairement PUBLIC (pas de JWT : l'utilisateur n'est
//     pas encore connecté).
//   - Ne révèle JAMAIS si un courriel existe dans la base. La réponse
//     est identique dans TOUS les cas, y compris en cas d'échec d'envoi
//     (protection contre l'énumération de comptes — critique pour des
//     données de santé). Les erreurs réelles vont dans les logs serveur :
//        supabase functions logs magic-link-resend
//   - RESEND_API_KEY reste un secret serveur, jamais exposé au frontend.
//
// Configuration (secrets Supabase — aucun redéploiement nécessaire
// pour changer l'expéditeur) :
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set MAIL_FROM="Neurodisk Chicoutimi <no-reply@neurodisk.com>"
//   supabase secrets set MAIL_REPLY_TO="info.neurodisk@gmail.com"
//
// Déploiement :
//   supabase functions deploy magic-link-resend --no-verify-jwt
//   (--no-verify-jwt : l'appelant n'a pas encore de session)
// ============================================================

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')              ?? ''
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY')            ?? ''

const RESEND_TEMPLATE_ID = 'd2df0c0d-a49b-40e2-a57e-52b1c4801c29'

// Expéditeur : domaine neurodisk.com, vérifié dans Resend (DKIM + SPF +
// MX de retour confirmés). Surchargeable par secret, donc changer
// d'adresse ne demande PAS de redéploiement.
// NB : neurodisk.com n'a pas de MX de réception — d'où « no-reply »
// et un Reply-To vers une vraie boîte.
const MAIL_FROM     = Deno.env.get('MAIL_FROM')     ?? 'Neurodisk Chicoutimi <no-reply@neurodisk.com>'
const MAIL_REPLY_TO = Deno.env.get('MAIL_REPLY_TO') ?? ''

const SUBJECTS: Record<string, string> = {
  magiclink: 'Votre accès à la plateforme Neurodisk',
  recovery:  'Réinitialisation de votre mot de passe Neurodisk',
}

// Où l'utilisateur atterrit une fois le lien vérifié.
const REDIRECT_PATH: Record<string, string> = {
  magiclink: '/library.html',
  recovery:  '/reset-password.html',
}

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Réponse générique — ne jamais laisser deviner si le courriel existe.
const GENERIC_OK = {
  success: true,
  message: "Si un compte existe pour ce courriel, un message vient d'être envoyé.",
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!RESEND_API_KEY) {
      // Erreur de configuration serveur — sans rapport avec un compte,
      // donc sûre à signaler (et indispensable pour diagnostiquer).
      console.error('magic-link-resend: RESEND_API_KEY manquant')
      return json({ error: 'Envoi de courriel non configuré sur le serveur.' }, 500)
    }

    const body = await req.json().catch(() => ({}))
    const cleanEmail = String(body?.email || '').trim().toLowerCase()
    const type = body?.type === 'recovery' ? 'recovery' : 'magiclink'

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return json({ error: 'Adresse courriel invalide.' }, 400)
    }

    const origin = req.headers.get('origin') || new URL(req.url).origin
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    // ── 1. Générer le lien (sans envoyer l'email par défaut de Supabase) ──
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type,
      email: cleanEmail,
      options: { redirectTo: `${origin}${REDIRECT_PATH[type]}` },
    })

    if (linkError || !linkData?.properties?.action_link) {
      // Compte inexistant ou erreur interne : jamais révélé à l'appelant.
      console.error(`magic-link-resend generateLink (${type}):`, linkError?.message)
      return json(GENERIC_OK)
    }

    // ── 2. Envoyer via Resend, gabarit de la clinique ────────────────────
    const payload: Record<string, unknown> = {
      from: MAIL_FROM,
      to: [cleanEmail],
      subject: SUBJECTS[type],
      template: {
        id: RESEND_TEMPLATE_ID,
        variables: { CONFIRMATION_URL: linkData.properties.action_link },
      },
    }
    if (MAIL_REPLY_TO) payload.reply_to = MAIL_REPLY_TO

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!resendRes.ok) {
      // On journalise le détail réel côté serveur, mais on renvoie la
      // réponse générique : un 502 ici ne surviendrait QUE pour un compte
      // existant, ce qui permettrait de distinguer les comptes valides.
      const errBody = await resendRes.text()
      console.error('magic-link-resend Resend error:', resendRes.status, errBody)
      return json(GENERIC_OK)
    }

    return json(GENERIC_OK)

  } catch (err) {
    console.error('magic-link-resend error:', err)
    // Même en cas d'erreur inattendue, pas de fuite d'information.
    return json(GENERIC_OK)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
