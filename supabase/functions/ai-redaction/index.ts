// ============================================================
// NEURODISK — Edge Function : ai-redaction
// ============================================================
// Rédige un brouillon (lettre de référence ou résumé de rapport)
// à partir de quelques notes, via l'API Claude.
//
// Paramètres JSON :
//   type    : 'lettre' | 'resume'   (obligatoire)
//   notes   : string                (obligatoire — notes du clinicien)
//   context : string                (optionnel — nom patient, conditions,
//                                     scores PROMs, etc.)
//
// Sécurité :
//   - Vérifie que l'appelant est connecté (JWT valide)
//   - Vérifie qu'il est admin OU professionnel
//   - La clé ANTHROPIC_API_KEY reste côté serveur (secret Supabase)
//
// Prérequis déploiement :
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy ai-redaction
// ============================================================

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic        from 'https://esm.sh/@anthropic-ai/sdk@0.65.0'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')        ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')   ?? ''
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')   ?? ''

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_LETTRE = `Tu es un assistant de rédaction clinique pour la Clinique Neurodisk (réadaptation du rachis, décompression neuro-vertébrale et exercices actifs), au Québec.
Rédige une LETTRE DE RÉFÉRENCE professionnelle en français québécois, à partir des notes fournies.
Structure : destinataire (Dr/Dre [À COMPLÉTER] si inconnu), objet, corps (motif de référence, constats pertinents, recommandations/demande), formule de politesse, et bloc de signature à compléter par le professionnel.
Ton : clinique, courtois, concis. N'INVENTE AUCUNE donnée clinique : si une information manque, laisse un champ « [À COMPLÉTER] ». Reste factuel et prudent. Ne pose pas de diagnostic non fourni.`

const SYSTEM_RESUME = `Tu es un assistant de rédaction clinique pour la Clinique Neurodisk, au Québec.
Rédige un RÉSUMÉ clair et structuré du dossier / rapport à partir des notes et données fournies.
Structure suggérée : contexte/condition, évolution (incluant les scores si fournis), adhésion, recommandations / suite. Français professionnel, concis.
N'INVENTE RIEN : utilise seulement les éléments fournis ; laisse « [À COMPLÉTER] » si une information manque.`

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!ANTHROPIC_API_KEY) return json({ error: 'Clé IA non configurée sur le serveur.' }, 500)

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

    // 4. Appel Claude
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4000,
      system: type === 'lettre' ? SYSTEM_LETTRE : SYSTEM_RESUME,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n')
      .trim()

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
