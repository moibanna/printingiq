// Supabase Edge Function: phone push notifications for vendors.
//  • { lead_id }    → the vendor a customer contacted
//  • { request_id } → every vendor, when a customer asks for offers on a job
// Deploy:  npx supabase functions deploy notify-vendor --no-verify-jwt
// The app calls it right after saving: supabase.functions.invoke('notify-vendor', { body: { lead_id } })
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const TEXT = {
  lead: 'PrintingIQ — مشتەری نوێ · زبون جديد · New customer',
  request: 'PrintingIQ — داواکاری نرخ · طلب عرض سعر · Quote request',
};
const FRESH_MS = 5 * 60 * 1000; // only fresh items, so the endpoint can't be used to re-send old ones

type Push = { to: string; sound: 'default'; title: string; body: string; data: Record<string, string> };

async function send(messages: Push[]) {
  // Expo accepts up to 100 messages per call
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { lead_id, request_id } = await req.json();
    // Service role: can read leads, requests and push tokens (customers can't).
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (lead_id) {
      const { data: lead } = await sb.from('leads').select('*').eq('id', lead_id).maybeSingle();
      if (!lead) return json({ error: 'not found' }, 404);
      if (Date.now() - new Date(lead.created_at).getTime() > FRESH_MS) return json({ sent: 0, reason: 'stale' });
      const { data: tokens } = await sb.from('push_tokens').select('token').eq('vendor_id', lead.vendor_id);
      const items = (lead.items ?? []).map((i: { name: string }) => i.name).join(', ');
      const messages: Push[] = (tokens ?? []).map((t: { token: string }) => ({
        to: t.token, sound: 'default', title: TEXT.lead, body: `${lead.customer_name}: ${items}`, data: { leadId: lead.id, url: '/account' },
      }));
      await send(messages);
      return json({ sent: messages.length });
    }

    if (request_id) {
      const { data: r } = await sb.from('quote_requests').select('*').eq('id', request_id).maybeSingle();
      if (!r) return json({ error: 'not found' }, 404);
      if (Date.now() - new Date(r.created_at).getTime() > FRESH_MS) return json({ sent: 0, reason: 'stale' });
      const { data: tokens } = await sb.from('push_tokens').select('token').limit(2000);
      const body = `${r.city} · ${r.quantity ? r.quantity + ' · ' : ''}${String(r.description).slice(0, 120)}`;
      const messages: Push[] = (tokens ?? []).map((t: { token: string }) => ({
        to: t.token, sound: 'default', title: TEXT.request, body, data: { requestId: r.id, url: '/account?tab=requests' },
      }));
      await send(messages);
      return json({ sent: messages.length });
    }

    return json({ error: 'lead_id or request_id required' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
