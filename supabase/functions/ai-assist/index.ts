// Supabase Edge Function: AI help for vendors adding products (Claude).
//  • { mode: "photo", files: [...] }      → one product draft from product photos
//  • { mode: "pricelist", files | text }  → many product drafts from a price list (PDF, photo, or pasted/CSV text)
// Drafts have names and descriptions in Kurdish (Sorani), Arabic and English, a category and a unit; the vendor
// reviews them before anything is published.
//
// Only signed-in vendors can call it, at most DAILY_LIMIT times a day each (table ai_usage in schema.sql).
// Deploy:  npx supabase functions deploy ai-assist
// Secret:  npx supabase secrets set ANTHROPIC_API_KEY=...   (never put the key in the app)
import Anthropic from 'npm:@anthropic-ai/sdk@1';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@1/helpers/zod';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4';

const DAILY_LIMIT = 60;
const MAX_BYTES = 12 * 1024 * 1024; // all files together, base64-decoded
const UNITS = ['sheet', 'm2', 'roll', 'piece', 'box', 'pack', 'kg', 'liter'] as const;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type InFile = { mediaType: string; data: string };
type Body = { mode: 'photo' | 'pricelist'; files?: InFile[]; text?: string; categories: { id: string; name: string }[]; hint?: string };

const SYSTEM = `You help shops in Iraq list products on PrintingIQ, a marketplace for printing, signs, machines, inks, stationery, promotional gifts, awards and clothing printing.
Write each product name the way a customer in Iraq would search for it, short and specific (type, size, material, brand if visible).
Give every name and description in three languages: "ckb" Central Kurdish (Sorani, Arabic script), "ar" Arabic (Iraqi usage, Modern Standard spelling), "en" English.
Descriptions: one or two plain sentences with the useful facts (size, material, colour, quantity per pack, use). Never invent facts you cannot see or read; leave the description empty rather than guess.
Prices: copy a price only when it is written; otherwise null. Currency is "USD" when the price has $ or "dollar/دولار/دۆلار", otherwise "IQD". Convert "15 الف" / "15 هەزار" / "15k" to 15000.
Choose categoryId only from the list given, and the unit that the price is for.`;

function draftSchema(categoryIds: [string, ...string[]]) {
  const localized = z.object({ ckb: z.string(), ar: z.string(), en: z.string() });
  return z.object({
    name: localized,
    description: localized,
    categoryId: z.enum(categoryIds),
    unit: z.enum(UNITS),
    price: z.number().nullable(),
    currency: z.enum(['IQD', 'USD']),
    brand: z.string().nullable(),
    sizes: z.array(z.string()),
    sku: z.string().nullable(),
  });
}

function fileBlocks(files: InFile[]): Anthropic.ContentBlockParam[] {
  return files.map((f) =>
    f.mediaType === 'application/pdf'
      ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: f.data } }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: f.mediaType as (typeof IMAGE_TYPES)[number], data: f.data } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // ── Who is asking: a signed-in vendor
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: 'sign_in' }, 401);
    const { data: vendor } = await admin.from('vendors').select('id').eq('id', user.id).maybeSingle();
    if (!vendor) return json({ error: 'vendors_only' }, 403);

    // ── Daily limit per vendor
    const day = new Date().toISOString().slice(0, 10);
    const { data: used } = await admin.from('ai_usage').select('count').eq('vendor_id', user.id).eq('day', day).maybeSingle();
    if ((used?.count ?? 0) >= DAILY_LIMIT) return json({ error: 'daily_limit' }, 429);

    // ── Validate the request
    const body = (await req.json()) as Body;
    const files = (body.files ?? []).filter((f) => f.mediaType === 'application/pdf' || (IMAGE_TYPES as readonly string[]).includes(f.mediaType));
    const bytes = files.reduce((n, f) => n + Math.floor((f.data.length * 3) / 4), 0);
    if (bytes > MAX_BYTES) return json({ error: 'too_large' }, 413);
    const text = (body.text ?? '').slice(0, 60_000);
    if (!files.length && !text.trim()) return json({ error: 'nothing_to_read' }, 400);
    const categories = (body.categories ?? []).filter((c) => /^[a-z0-9-]{2,40}$/.test(c.id)).slice(0, 200);
    if (!categories.length) return json({ error: 'categories' }, 400);
    const ids = categories.map((c) => c.id) as [string, ...string[]];
    const categoryList = categories.map((c) => `${c.id}: ${String(c.name).slice(0, 80)}`).join('\n');

    await admin.from('ai_usage').upsert({ vendor_id: user.id, day, count: (used?.count ?? 0) + 1 });

    // ── Ask Claude
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the function's secrets
    const draft = draftSchema(ids);
    const single = body.mode === 'photo';
    const task = single
      ? 'These photos show ONE product a shop sells. Describe that product.'
      : 'This is a shop\'s price list or catalogue. List EVERY product or service in it, one entry each, in the order they appear. Skip headers, totals and contact details.';
    const content: Anthropic.ContentBlockParam[] = [
      ...fileBlocks(files),
      ...(text.trim() ? [{ type: 'text' as const, text: `Price list text:\n${text}` }] : []),
      { type: 'text', text: `${task}${body.hint ? `\nThe shop says: ${String(body.hint).slice(0, 300)}` : ''}\n\nCategories (id: name):\n${categoryList}` },
    ];
    const response = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: single ? 4000 : 32000,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
      output_config: {
        effort: 'low', // reading and copying, not reasoning: fast and cheap
        format: zodOutputFormat(single ? draft : z.object({ items: z.array(draft) })),
      },
    });

    if (response.stop_reason === 'refusal') return json({ error: 'declined' }, 422);
    if (response.stop_reason === 'max_tokens') return json({ error: 'too_long' }, 422);
    const out = response.parsed_output as z.infer<typeof draft> | { items: z.infer<typeof draft>[] } | null;
    if (!out) return json({ error: 'unreadable' }, 422);
    return json(single ? { items: [out] } : out);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 503);
    if (e instanceof Anthropic.APIError) return json({ error: 'ai_error', status: e.status }, 502);
    return json({ error: String(e) }, 500);
  }
});
