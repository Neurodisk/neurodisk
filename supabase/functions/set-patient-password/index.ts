// ============================================================
// NEURODISK — Edge Function : set-patient-password
// ============================================================
// Deux modes selon les paramètres reçus :
//
// Mode 1 — Changer le mot de passe d'un utilisateur existant
//   { patientId, password }
//
// Mode 2 — Créer un nouveau compte avec mot de passe
//   { email, password, fullName, role }
//   role: 'patient' (défaut) | 'professional'
//
// Sécurité :
//   - Vérifie que l'appelant est connecté (JWT valide)
//   - Vérifie que l'appelant est administrateur
//   - Utilise la clé service_role pour modifier / créer l'auth
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

    const body = await req.json()
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    // ── Mode 1 : changer le mot de passe d'un user existant
    if (body.patientId) {
      const { patientId, password } = body
      if (!password)        return json({ error: 'Mot de passe manquant.' }, 400)
      if (password.length < 6) return json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, 400)

      const { error: updateError } = await adminClient.auth.admin.updateUserById(patientId, { password })
      if (updateError) throw updateError

      return json({ success: true })
    }

    // ── Mode 2 : créer un nouveau compte avec mot de passe
    const { email, password, fullName, role = 'patient' } = body
    if (!email)    return json({ error: 'Courriel manquant.' }, 400)
    if (!password) return json({ error: 'Mot de passe manquant.' }, 400)
    if (password.length < 6) return json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, 400)

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || '' },
    })
    if (createError) throw createError

    const profileUpdate: Record<string, unknown> = { full_name: fullName || null }
    if (role === 'professional') {
      profileUpdate.is_professional = true
      profileUpdate.is_admin        = true
    }

    await adminClient.from('profiles').update(profileUpdate).eq('id', newUser.user.id)

    return json({ success: true, userId: newUser.user.id })

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
