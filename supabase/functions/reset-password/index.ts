// ============================================================================
// Edge Function: reset-password
// Recebe { participantName, token, newPassword }, verifica o token gerado
// pelo admin e atualiza a senha via Supabase Auth admin API.
//
// Deploy: supabase functions deploy reset-password
// Segredos necessários: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
//   (já disponíveis automaticamente em Edge Functions hospedadas)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Result = { ok: true } | { ok: false; error: string }

function respond(body: Result): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { participantName, token, newPassword } = await req.json()

    if (!participantName || !token || !newPassword) {
      return respond({ ok: false, error: 'missing-fields' })
    }
    if ((newPassword as string).length < 4) {
      return respond({ ok: false, error: 'password-too-short' })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: participant, error: pErr } = await admin
      .from('participants')
      .select('id, auth_user_id, reset_token, reset_expires_at')
      .eq('name', (participantName as string).trim())
      .single()

    if (pErr || !participant) return respond({ ok: false, error: 'not-found' })

    const incoming = (token as string).trim().toUpperCase()
    if (!participant.reset_token || participant.reset_token !== incoming) {
      return respond({ ok: false, error: 'invalid-token' })
    }
    if (!participant.reset_expires_at || new Date(participant.reset_expires_at) < new Date()) {
      return respond({ ok: false, error: 'expired-token' })
    }
    if (!participant.auth_user_id) {
      return respond({ ok: false, error: 'no-auth-account' })
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(
      participant.auth_user_id,
      { password: newPassword },
    )
    if (updateErr) return respond({ ok: false, error: updateErr.message })

    await admin
      .from('participants')
      .update({ reset_token: null, reset_expires_at: null })
      .eq('id', participant.id)

    return respond({ ok: true })
  } catch (e) {
    return respond({ ok: false, error: e instanceof Error ? e.message : 'unknown' })
  }
})
