// ============================================================
// NEURODISK — Edge Function : ai-redaction (Google Gemini, gratuit)
// ============================================================
// Rédige un brouillon (lettre de référence ou résumé de rapport)
// à partir de quelques notes, via l'API Gemini (niveau gratuit).
//
// Paramètres JSON :
//   type    : 'lettre' | 'resume'   (obligatoire)
//   notes   : string                (obligatoire)
//   context : string                (optionnel)
//
// Sécurité :
//   - Vérifie que l'appelant est connecté (JWT valide)
//   - Vérifie qu'il est admin OU professionnel
//   - La clé GEMINI_API_KEY reste côté serveur (secret Supabase)
//
// Prérequis déploiement (gratuit, sans carte de crédit) :
//   1. Créer une clé sur https://aistudio.google.com/apikey
//   2. supabase secrets set GEMINI_API_KEY=AIza...
//   3. supabase functions deploy ai-redaction
// ============================================================

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')      ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const GEMINI_API_KEY    = Deno.env.get('GEMINI_API_KEY')    ?? ''
const GEMINI_MODEL      = 'gemini-2.5-flash'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_LETTRE = `Tu es un assistant de rédaction clinique pour la Clinique Neurodisk (réadaptation du rachis, décompression neuro-vertébrale et exercices actifs), au Québec.
Rédige une LETTRE DE RÉFÉRENCE professionnelle en français québécois, à partir des notes fournies.
Structure : en-tête destinataire, objet, corps (motif de référence, constats pertinents, recommandations/demande), formule de politesse, et bloc de signature.
Ton : clinique, courtois, concis. N'INVENTE AUCUNE donnée clinique : si une information manque, laisse un champ « [À COMPLÉTER] ». Reste factuel et prudent. Ne pose pas de diagnostic non fourni.
MARQUEURS (ne jamais inventer ces éléments) :
- Le destinataire t'est inconnu : écris EXACTEMENT « [DESTINATAIRE] » en en-tête (et « Docteur, » ou « Madame, Monsieur, » dans la formule d'appel).
- Le signataire t'est inconnu : termine par le bloc de signature contenant EXACTEMENT « [SIGNATAIRE] ».
- Le nom du patient ne t'est jamais fourni : écris EXACTEMENT « [NOM DU PATIENT] ». Ne génère jamais de nom réel.
Réponds uniquement avec le texte de la lettre.`

const SYSTEM_RESUME = `Tu es un assistant de rédaction clinique pour la Clinique Neurodisk, au Québec.
Rédige un RÉSUMÉ clair et structuré du dossier / rapport à partir des notes et données fournies.
Structure suggérée : contexte/condition, évolution (incluant les scores si fournis), adhésion, recommandations / suite. Français professionnel, concis.
N'INVENTE RIEN : utilise seulement les éléments fournis ; laisse « [À COMPLÉTER] » si une information manque.
CONFIDENTIALITÉ : le nom du patient ne t'est jamais fourni. Si tu dois le nommer, écris EXACTEMENT « [NOM DU PATIENT] ». Ne génère jamais de nom réel.
Réponds uniquement avec le texte du résumé.`

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!GEMINI_API_KEY) return json({ error: 'Clé IA non configurée sur le serveur.' }, 500)

    // 1. Authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé.' }, 401)

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) return json({ error: 'Session invalide ou expirée.' }, 401)

    // 2. Admin ou professionnel
    const { data: profile } = await anonClient
      .from('profiles').select('is_admin, is_professional').eq('id', user.id).single()
    if (!profile?.is_admin && !profile?.is_professional) {
      return json({ error: 'Accès réservé au personnel.' }, 403)
    }

    // 3. Paramètres
    const { type, notes, context } = await req.json()
    if (type !== 'lettre' && type !== 'resume') return json({ error: 'Type invalide.' }, 400)
    if (!notes || !String(notes).trim()) return json({ error: 'Veuillez fournir des notes.' }, 400)

    const userPrompt =
      (context ? `Contexte du patient :\n${context}\n\n` : '') +
      `Notes du clinicien :\n${notes}\n\n` +
      (type === 'lettre'
        ? 'Rédige la lettre de référence à partir de ces éléments.'
        : 'Rédige le résumé à partir de ces éléments.')

    // 4. Appel Gemini (niveau gratuit) avec réessais (le free tier est
    //    parfois surchargé → 503/429/500, généralement transitoire)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
    const payload = JSON.stringify({
      system_instruction: { parts: [{ text: type === 'lettre' ? SYSTEM_LETTRE : SYSTEM_RESUME }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    })

    let data: any = null
    let lastStatus = 0
    const delays = [0, 1500, 3000, 5000] // 1 essai + 3 réessais
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) await new Promise(r => setTimeout(r, delays[i]))
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })
      lastStatus = r.status
      data = await r.json()
      if (r.ok) break
      // Réessayer seulement sur surcharge/limite transitoire
      if (![429, 500, 503].includes(r.status)) break
      data = data // garde la dernière erreur
    }

    if (lastStatus !== 200) {
      if ([429, 500, 503].includes(lastStatus)) {
        return json({ error: 'Le service IA gratuit est temporairement saturé. Réessayez dans une minute.' }, 503)
      }
      return json({ error: data?.error?.message || 'Erreur Gemini' }, 502)
    }

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || '')
      .join('\n')
      .trim()

    if (!text) {
      const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'réponse vide'
      return json({ error: `Aucun texte généré (${reason}). Reformulez vos notes.` }, 502)
    }

    return json({ text })

  } catch (err) {
    console.error('ai-redaction error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
