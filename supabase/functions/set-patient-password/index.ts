// ============================================================
// NEURODISK — Edge Function : set-patient-password
// ============================================================
// Permet à un administrateur de définir directement le
// mot de passe d'un patient, sans que celui-ci reçoive
// un courriel ou ait besoin d'action de sa part.
//
// Sécurité :
//   - Vérifie que l'appelant est connecté (JWT valide)
//   - Vérifie que l'appelant est administrateur
//   - Utilise la clé service_role pour modifier l'auth
// ============================================================

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')              ?? ''
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')         ?? ''
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // ── 1. Vérifier l'authentification ──────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé.' }, 401)

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) return json({ error: 'Session invalide ou expirée.' }, 401)

    // ── 2. Vérifier que l'appelant est admin ─────────────
    const { data: profile } = await anonClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) return json({ error: 'Accès réservé aux administrateurs.' }, 403)

    // ── 3. Lire les paramètres ───────────────────────────
    const { patientId, password } = await req.json()

    if (!patientId) return json({ error: 'patientId manquant.' }, 400)
    if (!password)  return json({ error: 'Mot de passe manquant.' }, 400)
    if (password.length < 6) return json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, 400)

    // ── 4. Modifier le mot de passe (service role) ───────
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      patientId,
      { password }
    )
    if (updateError) throw updateError

    return json({ success: true })

  } catch (err) {
    console.error('set-patient-password error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
