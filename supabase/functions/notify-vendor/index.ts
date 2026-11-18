// Supabase Edge Function: sends a phone push notification to a vendor when a customer inquiry arrives.
// Deploy:  npx supabase functions deploy notify-vendor --no-verify-jwt
// The app calls it right after saving the inquiry: supabase.functions.invoke('notify-vendor', { body: { lead_id } })
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEXT = {
  title: 'PrintingIQ — مشتەری نوێ · زبون جديد · New customer',
  wants: (name: string, items: string) => `${name}: ${items}`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { lead_id } = await req.json();
    if (!lead_id) return new Response('lead_id required', { status: 400, headers: cors });

    // Service role: can read the lead and the vendor's push tokens (customers can't).
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: lead } = await sb.from('leads').select('*').eq('id', lead_id).maybeSingle();
    if (!lead) return new Response('not found', { status: 404, headers: cors });

    // Only notify for fresh inquiries, so the endpoint can't be used to spam a vendor with old ones.
    if (Date.now() - new Date(lead.created_at).getTime() > 5 * 60 * 1000) {
      return new Response(JSON.stringify({ sent: 0, reason: 'stale' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { data: tokens } = await sb.from('push_tokens').select('token').eq('vendor_id', lead.vendor_id);
    const items = (lead.items ?? []).map((i: { name: string }) => i.name).join(', ');
    const messages = (tokens ?? []).map((t: { token: string }) => ({
      to: t.token,
      sound: 'default',
      title: TEXT.title,
      body: TEXT.wants(lead.customer_name, items),
      data: { leadId: lead.id, url: '/account' },
    }));

    if (messages.length) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
    }
    return new Response(JSON.stringify({ sent: messages.length }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: cors });
  }
});
