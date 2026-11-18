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

/** Matches all three languages at once, plus code, brand, category and color names. */
export function searchProducts(list: Product[], q: string): Product[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((p) => {
    const cat = categoryById(p.categoryId);
    const grp = cat && groupById(cat.group);
    const hay = [
      ...LANGS.map((l) => p.name[l]), ...LANGS.map((l) => p.description[l]),
      ...(cat ? LANGS.map((l) => cat.name[l]) : []), ...(grp ? LANGS.map((l) => grp.name[l]) : []),
      p.brand ?? '', p.sku ?? '', ...p.colors.flatMap((c) => LANGS.map((l) => c.name[l])),
    ].join(' ').toLowerCase();
    return hay.includes(needle);
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
