// Supabase Edge Function: AI help for vendors adding products (Claude).
//  • { mode: "photo", files: [...] }      → one product draft from product photos
//  • { mode: "pricelist", files | text }  → many product drafts from a price list (PDF, photo, or pasted/CSV text)
// Drafts have names and descriptions in Kurdish (Sorani), Arabic and English, a category and a unit; the vendor
// reviews them before anything is published.
//
// Only signed-in vendors can call it, at most AI_DAILY_LIMIT times a day each (table ai_usage in schema.sql).
// Deploy:  npx supabase functions deploy ai-assist
// Secret:  npx supabase secrets set ANTHROPIC_API_KEY=...   (never put the key in the app)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AI_DAILY_LIMIT, AiFailure, Anthropic, draftProducts, IMAGE_TYPES, InFile } from '../_shared/ai.ts';

const MAX_BYTES = 12 * 1024 * 1024; // all files together, base64-decoded

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Body = { mode: 'photo' | 'pricelist'; files?: InFile[]; text?: string; categories: { id: string; name: string }[]; hint?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // ── Who is asking: a signed-in vendor
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: 'sign_in' }, 401);
    const { data: vendor } = await admin.from('vendors').select('id').eq('id', user.id).maybeSingle();
    if (!vendor) return json({ error: 'vendors_only' }, 403);

    // ── Daily limit per vendor
    const day = new Date().toISOString().slice(0, 10);
    const { data: used } = await admin.from('ai_usage').select('count').eq('vendor_id', user.id).eq('day', day).maybeSingle();
    if ((used?.count ?? 0) >= AI_DAILY_LIMIT) return json({ error: 'daily_limit' }, 429);

    // ── Validate the request
    const body = (await req.json()) as Body;
    const files = (body.files ?? []).filter((f) => f.mediaType === 'application/pdf' || (IMAGE_TYPES as readonly string[]).includes(f.mediaType));
    const bytes = files.reduce((n, f) => n + Math.floor((f.data.length * 3) / 4), 0);
    if (bytes > MAX_BYTES) return json({ error: 'too_large' }, 413);
    const text = (body.text ?? '').slice(0, 60_000);
    if (!files.length && !text.trim()) return json({ error: 'nothing_to_read' }, 400);
    const categories = (body.categories ?? []).filter((c) => /^[a-z0-9-]{2,40}$/.test(c.id)).slice(0, 200);
    if (!categories.length) return json({ error: 'categories' }, 400);

    await admin.from('ai_usage').upsert({ vendor_id: user.id, day, count: (used?.count ?? 0) + 1 });
    const items = await draftProducts({ mode: body.mode === 'photo' ? 'photo' : 'pricelist', files, text, categories, hint: body.hint });
    return json({ items });
  } catch (e) {
    if (e instanceof AiFailure) return json({ error: e.code }, 422);
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 503);
    if (e instanceof Anthropic.APIError) return json({ error: 'ai_error', status: e.status }, 502);
    return json({ error: String(e) }, 500);
  }
});
