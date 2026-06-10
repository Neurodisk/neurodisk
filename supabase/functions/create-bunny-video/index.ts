// ============================================================
// NEURODISK — Edge Function : create-bunny-video
// ============================================================
// Crée une entrée vidéo sur Bunny.net Stream et retourne
// les credentials nécessaires à l'upload direct depuis le browser.
//
// Sécurité :
//   - Vérifie que l'appelant est connecté (JWT Supabase valide)
//   - Vérifie que l'utilisateur est administrateur (is_admin = true)
//   - La clé API Bunny n'est jamais exposée dans le code client
// ============================================================

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Variables d'environnement (définies via `supabase secrets set`)
const BUNNY_API_KEY    = Deno.env.get('BUNNY_API_KEY')    ?? ''
const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID') ?? '676634'
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')     ?? ''
const SUPABASE_ANON    = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // ── 1. Vérifier l'authentification ──────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Non autorisé — token manquant.' }, 401)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return json({ error: 'Session invalide ou expirée.' }, 401)
    }

    // ── 2. Vérifier que l'utilisateur est admin ──────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return json({ error: 'Accès réservé aux administrateurs.' }, 403)
    }

    // ── 3. Lire le titre demandé ─────────────────────────
    const { title = 'Nouvelle vidéo' } = await req.json()

    // ── 4. Créer l'entrée vidéo sur Bunny.net ───────────
    const bunnyRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method:  'POST',
        headers: {
          'AccessKey':    BUNNY_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    )

    if (!bunnyRes.ok) {
      const detail = await bunnyRes.text()
      console.error('Bunny API error:', bunnyRes.status, detail)
      return json({ error: `Bunny.net a refusé la requête (${bunnyRes.status}). Vérifiez la clé API.` }, 502)
    }

    const video = await bunnyRes.json()

    // ── 5. Retourner les infos d'upload ──────────────────
    // La clé est renvoyée uniquement à l'admin authentifié,
    // pour permettre le PUT direct depuis le navigateur.
    return json({
      videoId:   video.guid,
      libraryId: BUNNY_LIBRARY_ID,
      uploadUrl: `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${video.guid}`,
      apiKey:    BUNNY_API_KEY,
    })

  } catch (err) {
    console.error('Edge Function error:', err)
    return json({ error: 'Erreur interne : ' + (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
