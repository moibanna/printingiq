import type { Currency, Product } from './catalog';
import type { Lang, StringKey } from './i18n';

const CUR: Record<Currency, Record<Lang, string>> = {
  IQD: { en: 'IQD', ar: 'د.ع', ckb: 'د.ع' },
  USD: { en: '$', ar: '$', ckb: '$' },
};

/** Western digits are used everywhere for prices: they are the norm on invoices in Iraq. */
export function formatPrice(p: Pick<Product, 'price' | 'currency'>, lang: Lang): string | null {
  if (p.price == null) return null;
  const frac = Number.isInteger(p.price) ? 0 : 2;
  const n = p.price.toLocaleString('en-US', { minimumFractionDigits: frac, maximumFractionDigits: 2 });
  return p.currency === 'USD' ? `$${n}` : `${n} ${CUR.IQD[lang]}`;
}

export const unitKey = (u: Product['unit']) => `unit_${u}` as StringKey;

/** 07501234567 → 9647501234567 for wa.me / tel links. */
export function intlPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('964')) return d;
  if (d.startsWith('0')) return '964' + d.slice(1);
  return d;
}

/** "2026-11-25": a date that reads the same in Kurdish, Arabic and English. */
export function shortDate(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

/** "toolmart.me" from "https://www.toolmart.me/products/…" */
export function hostOf(url: string): string {
  const m = /^[a-z]+:\/\/(?:www\.)?([^/?#]+)/i.exec(url);
  return m ? m[1] : url;
}
