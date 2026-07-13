// ============================================================
// NEURODISK — Edge Function : magic-link-resend
// ============================================================
// Remplace l'email de lien magique par défaut de Supabase par un
// envoi via Resend, avec le gabarit de la clinique.
//
// Flux :
//   1. Reçoit { email } (appel PUBLIC, non authentifié — c'est
//      justement l'écran qui sert à se connecter).
//   2. Génère le lien via supabaseAdmin.auth.admin.generateLink()
//      (type 'magiclink') — cette méthode ADMIN génère l'URL sans
//      déclencher l'envoi du courriel par défaut de Supabase (au
//      contraire de auth.signInWithOtp() côté client, qui envoie
//      toujours son propre email). C'est l'« interception » demandée.
//   3. Envoie le courriel via l'API Resend avec le template existant,
//      en passant l'URL dans la variable CONFIRMATION_URL.
//
// Paramètres JSON :
//   email : string (obligatoire)
//
// Sécurité :
//   - Endpoint volontairement PUBLIC (pas de JWT requis : l'utilisateur
//     n'est pas encore connecté à ce stade).
//   - Ne révèle JAMAIS si un courriel existe ou non dans la base : la
//     réponse est identique dans les deux cas (protection contre
//     l'énumération de comptes — important pour des données de santé).
//   - RESEND_API_KEY reste un secret serveur (Supabase secrets), jamais
//     exposée au frontend.
//
// Prérequis déploiement :
//   1. supabase secrets set RESEND_API_KEY=re_...
//   2. supabase functions deploy magic-link-resend --no-verify-jwt
//      (--no-verify-jwt est nécessaire car l'appelant n'a pas de session)
// ============================================================

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')              ?? ''
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY')            ?? ''

const RESEND_TEMPLATE_ID = 'd2df0c0d-a49b-40e2-a57e-52b1c4801c29'
// ⚠️ TEMPORAIRE : domaine de test Resend (aucun domaine vérifié encore).
// Resend restreint l'envoi à l'adresse du COMPTE Resend uniquement tant
// qu'aucun domaine n'est vérifié — pas encore utilisable pour de vrais
// patients. Une fois notify.cliniqueneurodisk.com vérifié, remplacer par :
// 'Clinique Neurodisk <info@notify.cliniqueneurodisk.com>'
const MAIL_FROM          = 'Clinique Neurodisk <onboarding@resend.dev>'
const MAIL_SUBJECT       = 'Votre accès à la plateforme Neurodisk'

// Où l'utilisateur atterrit une fois le lien vérifié (session en place).
const REDIRECT_PATH = '/library.html'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Réponse générique — ne jamais laisser deviner si le courriel existe.
const GENERIC_OK = {
  success: true,
  message: "Si un compte existe pour ce courriel, un lien de connexion vient d'être envoyé.",
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!RESEND_API_KEY) return json({ error: 'Envoi de courriel non configuré sur le serveur.' }, 500)

    const { email } = await req.json()
    const cleanEmail = String(email || '').trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return json({ error: 'Adresse courriel invalide.' }, 400)
    }

    const origin = req.headers.get('origin') || new URL(req.url).origin
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    // ── 1. Générer le lien (sans envoyer l'email par défaut de Supabase) ──
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: { redirectTo: `${origin}${REDIRECT_PATH}` },
    })

    if (linkError || !linkData?.properties?.action_link) {
      // Compte inexistant ou erreur interne : on ne le révèle jamais à l'appelant.
      console.error('magic-link-resend generateLink error:', linkError?.message)
      return json(GENERIC_OK)
    }

    const confirmationUrl = linkData.properties.action_link

    // ── 2. Envoyer via Resend, gabarit existant ──────────────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [cleanEmail],
        subject: MAIL_SUBJECT,
        template: {
          id: RESEND_TEMPLATE_ID,
          variables: { CONFIRMATION_URL: confirmationUrl },
        },
      }),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.text()
      console.error('magic-link-resend Resend error:', resendRes.status, errBody)
      return json({ error: "Échec de l'envoi du courriel. Réessayez dans un instant." }, 502)
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
