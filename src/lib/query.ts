import { categoriesOf, categoryById, groupById, Product } from './catalog';
import { LANGS } from './i18n';

export type Sort = 'newest' | 'priceLow' | 'priceHigh' | 'stock';
export const SORTS: Sort[] = ['newest', 'priceLow', 'priceHigh', 'stock'];
export const SORT_LABEL = { newest: 'sortNewest', priceLow: 'sortPriceLow', priceHigh: 'sortPriceHigh', stock: 'sortStock' } as const;

/** Rough market rate, only used to sort IQD and USD prices together. */
const IQD_PER_USD = 1400;
const priceIQD = (p: Product) => (p.price == null ? null : p.currency === 'USD' ? p.price * IQD_PER_USD : p.price);

export function sortProducts(list: Product[], sort: Sort): Product[] {
  const xs = [...list];
  const byPrice = (dir: 1 | -1) => (a: Product, b: Product) => {
    const pa = priceIQD(a), pb = priceIQD(b);
    if (pa == null) return 1; // "ask for price" always last
    if (pb == null) return -1;
    return (pa - pb) * dir;
  };
  if (sort === 'priceLow') return xs.sort(byPrice(1));
  if (sort === 'priceHigh') return xs.sort(byPrice(-1));
  if (sort === 'stock') return xs.sort((a, b) => (b.stockQty ?? -1) - (a.stockQty ?? -1));
  return xs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Folds spelling variants so Arabic/Kurdish searches match either form (أ/ا, ى/ي, ة/ه, ک/ك, ی/ي, ٣/3…). */
export function foldText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/[ىی]/g, 'ي').replace(/ة/g, 'ه').replace(/ک/g, 'ك').replace(/[ەھ]/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Query words; Arabic "ال"/"وال" prefixes are dropped so "طابعة ملصقات" also finds "طابعة الملصقات". */
function queryWords(q: string): string[] {
  return foldText(q).split(/\s+/).filter(Boolean).map((w) => (w.length > 4 ? w.replace(/^(وال|ال)/, '') : w));
}

/** Matches all three languages at once, plus code, brand, category and color names. Every word must match. */
export function searchProducts(list: Product[], q: string): Product[] {
  const words = queryWords(q);
  if (!words.length) return list;
  return list.filter((p) => {
    const cat = categoryById(p.categoryId);
    const grp = cat && groupById(cat.group);
    const hay = foldText([
      ...LANGS.map((l) => p.name[l]), ...LANGS.map((l) => p.description[l]),
      ...(cat ? LANGS.map((l) => cat.name[l]) : []), ...(grp ? LANGS.map((l) => grp.name[l]) : []),
      p.brand ?? '', p.sku ?? '', ...p.colors.flatMap((c) => LANGS.map((l) => c.name[l])),
    ].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

/** Products in a subcategory, or in every subcategory of a group. */
export function inCategory(list: Product[], id: string): Product[] {
  if (groupById(id)) {
    const ids = new Set(categoriesOf(id).map((c) => c.id));
    return list.filter((p) => ids.has(p.categoryId));
  }
  return list.filter((p) => p.categoryId === id);
}
