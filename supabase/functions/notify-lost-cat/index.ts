import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cat_id, cat_name } = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: sightings, error: sightingsError } = await supabase
      .from('sightings')
      .select('user_id')
      .eq('cat_id', cat_id)

    if (sightingsError) throw sightingsError

    const userIds = [...new Set(sightings.map((s: any) => s.user_id))]

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) throw usersError

    const emails = users.users
      .filter((u: any) => userIds.includes(u.id))
      .map((u: any) => u.email)
      .filter(Boolean)

    const notifications = userIds.map((user_id) => ({
      user_id,
      cat_id,
      type: 'lost',
      message: `?? ${cat_name} has been reported as lost! Keep an eye out.`,
      read: false,
    }))

    await supabase.from('notifications').insert(notifications)

    const emailPromises = emails.map((email: string) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'CatMap <onboarding@resend.dev>',
          to: email,
          subject: `?? ${cat_name} has been reported lost!`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #F44336;">?? Lost Cat Alert</h2>
              <p>A cat you have previously sighted - <strong>${cat_name}</strong> - has been reported as lost by a community member.</p>
              <p>If you see them, please open CatMap and log a sighting so the community knows where they were last spotted.</p>
              <p style="color: #888; font-size: 13px;">You are receiving this because you logged a sighting of ${cat_name} on CatMap.</p>
            </div>
          `,
        }),
      })
    )

    await Promise.all(emailPromises)

    return new Response(
      JSON.stringify({ message: `Notified ${emails.length} users` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
