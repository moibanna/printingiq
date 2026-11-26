import { CATEGORIES, Currency, emptyProduct, Product, Unit, UNITS } from './catalog';
import { LANGS, Localized } from './i18n';
import { foldText } from './query';

/** A product read from a price list or photo, waiting for the vendor's review before it is published. */
export type ProductDraft = {
  name: Localized;
  description: Localized;
  categoryId: string;
  unit: Unit;
  price: number | null;
  currency: Currency;
  brand?: string | null;
  sizes?: string[];
  sku?: string | null;
  images?: string[];
};

export type Cell = string | number | boolean | Date | null | undefined;
const blank: Localized = { en: '', ar: '', ckb: '' };

/** Category list sent to the AI helper, so it picks one of ours. */
export const AI_CATEGORIES = CATEGORIES.map((c) => ({ id: c.id, name: `${c.name.en} / ${c.name.ar}` }));

/** Excel / CSV template vendors can fill in (UTF-8 with BOM so Excel shows Kurdish and Arabic correctly). */
export const TEMPLATE_HEADERS = ['name_ckb', 'name_ar', 'name_en', 'price', 'currency', 'unit', 'category', 'code', 'description'];
export function templateCsv(): string {
  const rows = [
    TEMPLATE_HEADERS,
    ['ئەکریلیکی ٣ ملم ١٢٢×٢٤٤', 'لوح أكريليك 3 ملم 122×244', 'Acrylic sheet 3 mm 122×244', '45000', 'IQD', 'sheet', 'acrylic', 'AC-3', ''],
    ['کارتی بازرگانی دوو ڕوو (١٠٠٠)', 'كروت شخصية وجهين (1000)', 'Business cards, two sides (1,000)', '25', 'USD', 'box', 'business-cards', '', 'Matte, 350 gsm'],
  ];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

/** Small RFC-4180 CSV reader (quotes, commas or semicolons, Arabic comma). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';'
    : (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

// Column headings vendors use, in the three languages (folded, see foldText)
const COLS: Record<string, string[]> = {
  name_ckb: ['name_ckb', 'ناو', 'ناوی بەرهەم', 'kurdish'],
  name_ar: ['name_ar', 'الاسم', 'اسم', 'اسم المنتج', 'المنتج', 'المادة', 'arabic'],
  name_en: ['name_en', 'name', 'product', 'item', 'title', 'english', 'description en'],
  price: ['price', 'السعر', 'سعر', 'نرخ', 'cost', 'unit price', 'سعر المفرد'],
  currency: ['currency', 'العملة', 'عملة', 'دراو', 'جۆری دراو'],
  unit: ['unit', 'الوحدة', 'وحدة', 'یەکە'],
  category: ['category', 'القسم', 'قسم', 'بەش', 'type', 'النوع'],
  sku: ['code', 'sku', 'الكود', 'كود', 'رمز', 'کۆد', 'model', 'موديل'],
  description: ['description', 'details', 'الوصف', 'وصف', 'تفاصيل', 'وەسف', 'notes', 'ملاحظات'],
  brand: ['brand', 'الماركة', 'ماركة', 'براند', 'مارکە'],
};

const str = (c: Cell) => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)).trim();

/** "45,000", "٤٥٠٠٠", "$25", "25 دولار", "15 الف" → number (and the currency when the text says so). */
export function readPrice(c: Cell): { price: number | null; currency?: Currency } {
  if (typeof c === 'number') return { price: c > 0 ? c : null };
  let t = str(c).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const usd = /\$|usd|دولار|دۆلار/i.test(t);
  const thousands = /الف|ألف|هەزار|\bk\b/i.test(t);
  t = t.replace(/٫/g, '.').replace(/[,،٬\s]/g, '');
  const m = t.match(/\d+(\.\d+)?/);
  if (!m) return { price: null };
  const n = Number(m[0]) * (thousands ? 1000 : 1);
  return { price: n > 0 ? n : null, currency: usd ? 'USD' : undefined };
}

const UNIT_WORDS: [Unit, RegExp][] = [
  ['m2', /m2|m²|متر مربع|مەتر دووجا|sqm/i], ['sheet', /sheet|لوح|ورقة|پەڕە|شیت/i], ['roll', /roll|رول|ڕۆڵ/i],
  ['box', /box|كرتون|علبة|بۆکس|کارتۆن/i], ['pack', /pack|باكيت|پاکەت|دەستە/i], ['kg', /kg|كيلو|کیلۆ/i],
  ['liter', /lit|لتر|لیتر/i], ['piece', /pc|piece|قطعة|دانە|عدد/i],
];
const readUnit = (c: Cell): Unit | undefined => {
  const t = str(c);
  if ((UNITS as string[]).includes(t)) return t as Unit;
  return UNIT_WORDS.find(([, re]) => re.test(t))?.[0];
};

/** Best category for a product name: the category whose name (in any language) appears in it. */
export function guessCategory(text: string, fallback = ''): string {
  const f = foldText(text);
  let best = fallback, bestLen = 0;
  for (const c of CATEGORIES) {
    for (const l of LANGS) {
      for (const raw of foldText(c.name[l]).split(/[\s،,&/()]+/).filter((w) => w.length >= 4)) {
        const word = l === 'en' ? raw.replace(/e?s$/, '') : raw; // "roll-ups" also matches "roll-up"
        if (f.includes(word) && word.length > bestLen) { best = c.id; bestLen = word.length; }
      }
    }
  }
  return best;
}

const isArabicScript = (s: string) => /[؀-ۿ]/.test(s);
const isKurdish = (s: string) => /[ەۆێڕڵچگپژڤ]/.test(s);

/** Turns spreadsheet rows (first sheet, or CSV) into drafts. Finds the header row by its column names. */
export function rowsToDrafts(rows: Cell[][], defaultCategory: string): ProductDraft[] {
  const headerAt = rows.slice(0, 10).findIndex((r) => r.filter((c) => matchCol(str(c))).length >= 2);
  const header = headerAt >= 0 ? rows[headerAt].map((c) => matchCol(str(c))) : null;
  const body = rows.slice(headerAt >= 0 ? headerAt + 1 : 0);
  const drafts: ProductDraft[] = [];
  for (const r of body) {
    const get = (k: string) => (header ? r[header.indexOf(k)] : undefined);
    let name: Localized = { ...blank };
    let priceCell: Cell, desc = '';
    if (header) {
      name = { ckb: str(get('name_ckb')), ar: str(get('name_ar')), en: str(get('name_en')) };
      priceCell = get('price');
      desc = str(get('description'));
    } else {
      // No headings: first text cell is the name, first price-looking cell is the price
      const text = r.map(str).find((x) => x && !/^[\d.,\s$]+$/.test(x)) ?? '';
      name = { ckb: '', ar: '', en: '' };
      name[isArabicScript(text) ? (isKurdish(text) ? 'ckb' : 'ar') : 'en'] = text;
      priceCell = r.find((c) => readPrice(c).price != null && str(c) !== text);
    }
    name = rehome(name);
    if (!LANGS.some((l) => name[l])) continue;
    const { price, currency: priceCur } = readPrice(priceCell);
    const curText = str(get('currency'));
    const currency: Currency = /usd|\$|دولار|دۆلار/i.test(curText) ? 'USD' : /iqd|دينار|دینار|د\.ع/i.test(curText) ? 'IQD' : priceCur ?? 'IQD';
    const catCell = str(get('category'));
    const allNames = `${name.ckb} ${name.ar} ${name.en}`;
    const categoryId = CATEGORIES.some((c) => c.id === catCell) ? catCell : guessCategory(`${catCell} ${allNames}`, defaultCategory);
    drafts.push({
      name, description: { ...blank, [isArabicScript(desc) ? (isKurdish(desc) ? 'ckb' : 'ar') : 'en']: desc },
      categoryId, unit: readUnit(get('unit')) ?? readUnit(allNames) ?? 'piece', price, currency,
      sku: str(get('sku')) || null, brand: str(get('brand')) || null, sizes: [],
    });
  }
  return drafts;
}

/** Puts text written in another language's column where it belongs (English in a Kurdish column, Arabic in English…). */
function rehome(name: Localized): Localized {
  const out: Localized = { ...blank };
  for (const l of LANGS) {
    const v = name[l];
    if (!v) continue;
    const real = !isArabicScript(v) ? 'en' : isKurdish(v) ? 'ckb' : l === 'en' ? 'ar' : l;
    if (!out[real]) out[real] = v;
    else if (!out[l]) out[l] = v;
  }
  return out;
}

function matchCol(h: string): string | null {
  const f = foldText(h).replace(/[_\-:]/g, ' ').trim();
  if (!f) return null;
  for (const [k, words] of Object.entries(COLS)) if (words.some((w) => foldText(w.replace(/_/g, ' ')) === f)) return k;
  for (const [k, words] of Object.entries(COLS)) if (words.some((w) => w.length > 3 && f.includes(foldText(w.replace(/_/g, ' '))))) return k;
  return null;
}

export function draftToProduct(d: ProductDraft, vendorId: string): Product {
  return {
    ...emptyProduct(vendorId), name: d.name, description: d.description, categoryId: d.categoryId, unit: d.unit,
    price: d.price, currency: d.currency, brand: d.brand || undefined, sizes: d.sizes ?? [], sku: d.sku || undefined,
    images: d.images ?? [], availability: 'in_stock',
  };
}

/** Reads a picked file (web blob: URL or phone file:// URI) as base64 for the AI helper. */
export async function fileToBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** First sheet of an .xlsx file as rows. Loaded only when needed, to keep the app small. */
export async function readExcel(uri: string): Promise<Cell[][]> {
  const { readSheet } = await import('read-excel-file/universal');
  const buf = await (await fetch(uri)).arrayBuffer();
  return (await readSheet(buf)) as Cell[][];
}
