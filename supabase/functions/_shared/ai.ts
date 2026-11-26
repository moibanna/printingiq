// Product drafts from photos or price lists, written by Claude in Kurdish (Sorani), Arabic and English.
// Shared by ai-assist (app) and whatsapp-bot. Needs the ANTHROPIC_API_KEY secret.
import Anthropic from 'npm:@anthropic-ai/sdk@1';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@1/helpers/zod';
import { z } from 'npm:zod@4';

/** AI calls per vendor per day (app and WhatsApp together), counted in table ai_usage */
export const AI_DAILY_LIMIT = 60;

export const UNITS = ['sheet', 'm2', 'roll', 'piece', 'box', 'pack', 'kg', 'liter'] as const;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export type InFile = { mediaType: string; data: string };
export type Category = { id: string; name: string };
export type Draft = {
  name: { ckb: string; ar: string; en: string };
  description: { ckb: string; ar: string; en: string };
  categoryId: string;
  unit: (typeof UNITS)[number];
  price: number | null;
  currency: 'IQD' | 'USD';
  brand: string | null;
  sizes: string[];
  sku: string | null;
};
export class AiFailure extends Error {
  constructor(public code: 'declined' | 'too_long' | 'unreadable') { super(code); }
}

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

/** mode "photo": one product from its photos. mode "pricelist": every product in a price list (files and/or text). */
export async function draftProducts(opts: {
  mode: 'photo' | 'pricelist'; files: InFile[]; text?: string; categories: Category[]; hint?: string;
}): Promise<Draft[]> {
  const ids = opts.categories.map((c) => c.id) as [string, ...string[]];
  const categoryList = opts.categories.map((c) => `${c.id}: ${String(c.name).slice(0, 80)}`).join('\n');
  const single = opts.mode === 'photo';
  const draft = draftSchema(ids);
  const task = single
    ? 'These photos show ONE product a shop sells. Describe that product.'
    : 'This is a shop\'s price list or catalogue. List EVERY product or service in it, one entry each, in the order they appear. Skip headers, totals and contact details.';
  const text = (opts.text ?? '').trim();
  const content: Anthropic.ContentBlockParam[] = [
    ...fileBlocks(opts.files),
    ...(text ? [{ type: 'text' as const, text: `Price list text:\n${text}` }] : []),
    { type: 'text', text: `${task}${opts.hint ? `\nThe shop says: ${opts.hint.slice(0, 300)}` : ''}\n\nCategories (id: name):\n${categoryList}` },
  ];
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the function's secrets
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
  if (response.stop_reason === 'refusal') throw new AiFailure('declined');
  if (response.stop_reason === 'max_tokens') throw new AiFailure('too_long');
  const out = response.parsed_output as Draft | { items: Draft[] } | null;
  if (!out) throw new AiFailure('unreadable');
  return single ? [out as Draft] : (out as { items: Draft[] }).items;
}

export { Anthropic };
