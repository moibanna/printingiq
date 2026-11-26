// Supabase Edge Function: PrintingIQ's WhatsApp number for vendors (WhatsApp Business Cloud API webhook).
//
//   A vendor sends a product photo, with the price in the caption ("25000", "25$", "15 الف"), to the PrintingIQ
//   WhatsApp number → the product appears in their shop: AI writes the name, description and category in Kurdish,
//   Arabic and English, and the bot replies with the product link. One photo = one product.
//   "delete" / "حذف" / "بسڕەوە" removes the last product added this way (within 24 hours). Anything else: help.
//
// Vendors are recognised by the phone or WhatsApp number on their PrintingIQ shop. Others get a sign-up link.
//
// Setup (once): see supabase/README-whatsapp.md. Secrets:
//   WHATSAPP_TOKEN            permanent access token of the Meta system user
//   WHATSAPP_PHONE_NUMBER_ID  the PrintingIQ number's id in WhatsApp Manager
//   WHATSAPP_APP_SECRET       Meta app secret (to check that webhook calls really come from Meta)
//   WHATSAPP_VERIFY_TOKEN     any long random text, also typed into the Meta webhook settings
//   ANTHROPIC_API_KEY         for the AI
//   SITE_URL                  e.g. https://printingiq.netlify.app (for product links)
// Deploy:  npx supabase functions deploy whatsapp-bot --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AI_DAILY_LIMIT, draftProducts } from '../_shared/ai.ts';
import { captionPrice, normalizePhone } from '../_shared/whatsapp.ts';
import categories from '../_shared/categories.json' with { type: 'json' };

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const GRAPH = 'https://graph.facebook.com/v23.0';
const env = (k: string) => Deno.env.get(k) ?? '';
const sb = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

const TEXT = {
  notVendor: (site: string) =>
    `سڵاو 👋 ئەم ژمارەیە بۆ فرۆشیارانی PrintingIQ ـە. دوکانێک بکەرەوە: ${site}/account\n` +
    `مرحباً، هذا الرقم لبائعي PrintingIQ. افتح متجرك: ${site}/account\n` +
    `Hi, this number is for PrintingIQ vendors. Open your shop: ${site}/account`,
  help:
    '📷 وێنەی بەرهەمێک بنێرە و نرخەکەی لە ژێر وێنەکە بنووسە (نموونە: 25000 یان 25$). AI ناو و وەسف بە سێ زمان دەنووسێت.\n' +
    '📷 أرسل صورة المنتج واكتب السعر تحتها (مثلاً 25000 أو 25$). يكتب الذكاء الاصطناعي الاسم والوصف بثلاث لغات.\n' +
    '📷 Send a product photo with the price as caption (e.g. 25000 or 25$). AI writes the name and description in 3 languages.\n' +
    '🗑 "بسڕەوە" / "حذف" / "delete" = remove the last one.',
  added: (name: string, price: string, link: string) => `✅ ${name}\n${price}\n${link}\n\n🗑 بسڕەوە / حذف / delete`,
  deleted: '🗑 سڕایەوە · تم الحذف · Deleted',
  nothingToDelete: 'هیچ نییە بۆ سڕینەوە · لا يوجد ما يُحذف · Nothing to delete',
  limit: 'ئەمڕۆ بەسە، سبەی هەوڵ بدەرەوە · وصلت للحد اليومي، حاول غداً · Daily limit reached, try tomorrow',
  failed: '⚠️ نەمتوانی بیخوێنمەوە، وێنەیەکی ڕوونتر بنێرە · لم أستطع القراءة، أرسل صورة أوضح · Could not read it, send a clearer photo',
  askPrice: 'نرخ بپرسە · اسأل عن السعر · Ask for price',
};

async function verifySignature(raw: string, header: string | null): Promise<boolean> {
  if (!header?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('WHATSAPP_APP_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function reply(to: string, body: string) {
  await fetch(`${GRAPH}/${env('WHATSAPP_PHONE_NUMBER_ID')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: body.slice(0, 4000) } }),
  });
}

async function downloadMedia(id: string): Promise<{ bytes: Uint8Array; type: string }> {
  const auth = { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}` };
  const meta = await (await fetch(`${GRAPH}/${id}`, { headers: auth })).json() as { url: string; mime_type: string };
  const res = await fetch(meta.url, { headers: auth });
  if (!res.ok) throw new Error(`media ${res.status}`);
  return { bytes: new Uint8Array(await res.arrayBuffer()), type: meta.mime_type || 'image/jpeg' };
}

const base64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

type WaMessage = { id: string; from: string; type: string; text?: { body: string }; image?: { id: string; caption?: string; mime_type?: string } };

async function handle(m: WaMessage) {
  const db = sb();
  // Meta can deliver the same message more than once: handle each id once
  const { error: dup } = await db.from('wa_messages').insert({ id: m.id });
  if (dup) return;

  const site = env('SITE_URL').replace(/\/$/, '');
  const from = normalizePhone(m.from);
  const last9 = from.slice(-9);
  const { data: candidates } = await db.from('vendors').select('id,name,phone,whatsapp')
    .or(`phone.ilike.%${last9},whatsapp.ilike.%${last9}`).limit(10);
  const vendor = (candidates ?? []).find((v) => normalizePhone(v.whatsapp ?? '') === from || normalizePhone(v.phone ?? '') === from);
  if (!vendor) return reply(m.from, TEXT.notVendor(site));

  if (m.type === 'text') {
    const t = (m.text?.body ?? '').trim().toLowerCase();
    if (/^(delete|حذف|بسڕەوە|بسرەوە|سڕینەوە)$/.test(t)) {
      const since = new Date(Date.now() - 864e5).toISOString();
      const { data: last } = await db.from('products').select('id').eq('vendor_id', vendor.id).eq('added_via', 'whatsapp')
        .gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!last) return reply(m.from, TEXT.nothingToDelete);
      await db.from('products').delete().eq('id', last.id);
      return reply(m.from, TEXT.deleted);
    }
    return reply(m.from, TEXT.help);
  }

  if (m.type !== 'image' || !m.image) return reply(m.from, TEXT.help);

  const day = new Date().toISOString().slice(0, 10);
  const { data: used } = await db.from('ai_usage').select('count').eq('vendor_id', vendor.id).eq('day', day).maybeSingle();
  if ((used?.count ?? 0) >= AI_DAILY_LIMIT) return reply(m.from, TEXT.limit);
  await db.from('ai_usage').upsert({ vendor_id: vendor.id, day, count: (used?.count ?? 0) + 1 });

  try {
    const media = await downloadMedia(m.image.id);
    const ext = media.type.includes('png') ? 'png' : media.type.includes('webp') ? 'webp' : 'jpg';
    const path = `${vendor.id}/wa-${m.id.replace(/\W/g, '').slice(-24)}.${ext}`;
    const up = await db.storage.from('product-images').upload(path, media.bytes, { contentType: media.type, upsert: true });
    if (up.error) throw up.error;
    const imageUrl = db.storage.from('product-images').getPublicUrl(path).data.publicUrl;

    const caption = m.image.caption ?? '';
    const [d] = await draftProducts({
      mode: 'photo', files: [{ mediaType: media.type.split(';')[0], data: base64(media.bytes) }], categories, hint: caption,
    });
    const given = captionPrice(caption);
    const price = given?.price ?? d.price;
    const currency = given?.currency ?? d.currency;
    const { data: saved, error } = await db.from('products').insert({
      vendor_id: vendor.id, category_id: d.categoryId, name: d.name, description: d.description, price, currency, unit: d.unit,
      sizes: d.sizes ?? [], brand: d.brand, sku: d.sku, images: [imageUrl], availability: 'in_stock', added_via: 'whatsapp',
    }).select('id').single();
    if (error) throw error;
    const priceText = price == null ? TEXT.askPrice : currency === 'USD' ? `$${price}` : `${price.toLocaleString('en-US')} IQD`;
    await reply(m.from, TEXT.added(d.name.ckb || d.name.ar || d.name.en, priceText, `${site}/product/${saved.id}`));
  } catch (e) {
    console.error('whatsapp-bot', e);
    await reply(m.from, TEXT.failed);
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // Meta's one-time webhook check
  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === env('WHATSAPP_VERIFY_TOKEN') && env('WHATSAPP_VERIFY_TOKEN');
    return ok ? new Response(url.searchParams.get('hub.challenge') ?? '') : new Response('forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('method', { status: 405 });

  const raw = await req.text();
  if (!(await verifySignature(raw, req.headers.get('x-hub-signature-256')))) return new Response('bad signature', { status: 401 });

  type Payload = { entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[] };
  const messages = ((JSON.parse(raw) as Payload).entry ?? []).flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.messages ?? []);
  // Answer Meta right away (it retries slow webhooks); the AI work continues in the background.
  EdgeRuntime.waitUntil(Promise.all(messages.map((m) => handle(m).catch((e) => console.error('whatsapp-bot', e)))));
  return new Response('ok');
});
