// Small helpers for the WhatsApp bot, kept apart so they can be tested without a server.

/** "07501234567", "+964 750 123 4567", "009647501234567" → "9647501234567" */
export function normalizePhone(p: string): string {
  let d = (p ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '964' + d.slice(1);
  if (d.length === 10 && d.startsWith('7')) d = '964' + d;
  return d;
}

/** Price from a caption: "25000", "25,000", "25$", "25 دولار", "15 الف", "١٥ هەزار" */
export function captionPrice(caption: string): { price: number; currency: 'IQD' | 'USD' } | null {
  let t = (caption ?? '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const usd = /\$|usd|دولار|دۆلار/i.test(t);
  const thousands = /الف|ألف|هەزار|\d\s*k\b/i.test(t);
  t = t.replace(/(\d)[,،٬](\d{3})/g, '$1$2').replace(/٫/g, '.');
  const m = t.match(/\d+(\.\d+)?/);
  if (!m) return null;
  const price = Number(m[0]) * (thousands ? 1000 : 1);
  return price > 0 ? { price, currency: usd ? 'USD' : 'IQD' } : null;
}
