// ============================================================
// NEURODISK — Edge Function : create-professional
// ============================================================
// Crée un compte professionnel (email + mot de passe + nom)
// sans envoyer de courriel de confirmation et sans déconnecter
// l'administrateur courant.
//
// Sécurité :
//   - Vérifie que l'appelant est connecté (JWT valide)
//   - Vérifie que l'appelant est administrateur (is_admin = true)
//   - Utilise la clé service_role pour créer l'utilisateur
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
    const { email, password, fullName } = await req.json()

    if (!email)    return json({ error: 'Courriel manquant.' }, 400)
    if (!password) return json({ error: 'Mot de passe manquant.' }, 400)
    if (password.length < 6) return json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, 400)

    // ── 4. Créer l'utilisateur (service role) ────────────
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || '' },
    })
    if (createError) throw createError

    // ── 5. Marquer comme professionnel dans profiles ─────
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ full_name: fullName || null, is_professional: true })
      .eq('id', newUser.user.id)

    if (profileError) throw profileError

    return json({ success: true, userId: newUser.user.id })

  } catch (err) {
    console.error('create-professional error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
