// Writes supabase/functions/_shared/categories.json from src/lib/catalog.ts, so server functions (WhatsApp bot)
// offer the AI the same categories as the app.   Run: node scripts/gen-categories.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/lib/catalog.ts', import.meta.url), 'utf8');
const re = /c\('([\w-]+)', '([\w-]+)', '([^']*)', '([^']*)', '([^']*)'\)/g;
const out = [...src.matchAll(re)].map(([, , id, en, ar]) => ({ id, name: `${en} / ${ar}` }));
if (out.length < 30) throw new Error(`only ${out.length} categories found; did catalog.ts change shape?`);
writeFileSync(new URL('../supabase/functions/_shared/categories.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`${out.length} categories written`);
