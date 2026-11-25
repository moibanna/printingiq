import type { Currency, Exchange, Product } from './catalog';
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

/** Price in the other currency at today's rate. Dinars are rounded the way shops quote them (to 250, or 50 under 5,000). */
export function convertPrice(p: Pick<Product, 'price' | 'currency'>, ex: Exchange): { price: number; currency: Currency } | null {
  if (p.price == null || !ex.iqdPerUsd) return null;
  if (p.currency === 'USD') {
    const iqd = p.price * ex.iqdPerUsd;
    const step = iqd >= 5000 ? 250 : 50;
    return { price: Math.max(step, Math.round(iqd / step) * step), currency: 'IQD' };
  }
  const usd = p.price / ex.iqdPerUsd;
  return { price: usd >= 100 ? Math.round(usd) : Math.round(usd * 100) / 100, currency: 'USD' };
}

/** "≈ $237" / "≈ 359,000 IQD": the same price in the other currency. */
export function formatConverted(p: Pick<Product, 'price' | 'currency'>, ex: Exchange, lang: Lang): string | null {
  const c = convertPrice(p, ex);
  return c ? `≈ ${formatPrice(c, lang)}` : null;
}

/** "1 $ = 1,515 IQD" */
export function formatRate(ex: Exchange, lang: Lang): string {
  return `$1 = ${ex.iqdPerUsd.toLocaleString('en-US')} ${CUR.IQD[lang]}`;
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
