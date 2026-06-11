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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé.' }, 401)

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) return json({ error: 'Session invalide ou expirée.' }, 401)

    const { data: profile } = await anonClient
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return json({ error: 'Accès réservé aux administrateurs.' }, 403)

    const { userId, email } = await req.json()
    if (!userId) return json({ error: 'userId manquant.' }, 400)
    if (!email)  return json({ error: 'Courriel manquant.' }, 400)

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { email })
    if (updateError) throw updateError

    await adminClient.from('profiles').update({ email }).eq('id', userId)

    return json({ success: true })

  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
