import { AiError } from './backend';
import type { StringKey } from './i18n';

/** Message for a failed AI request, in the vendor's language. */
export function aiMessage(e: unknown, t: (k: StringKey) => string) {
  const code = e instanceof AiError ? e.code : '';
  if (code === 'unavailable' || code === 'daily_limit' || code === 'too_large') return t(`aiErr_${code}` as StringKey);
  return t('aiErr_other');
}
