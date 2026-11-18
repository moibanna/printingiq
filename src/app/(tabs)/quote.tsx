import { Link } from 'expo-router';
import { Linking, Pressable, Text, View } from 'react-native';
import { Button, Muted, ProductThumb, s, Screen, SectionTitle } from '../../components/ui';
import { CITIES, Product } from '../../lib/catalog';
import { formatPrice, intlPhone, unitKey } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

/** Orders in this market are agreed on WhatsApp, so the quote list sends one itemized message per vendor. */
export default function QuoteScreen() {
  const { t, tl, lang } = useI18n();
  const { quote, products, vendors, setQuoteQty, clearQuote } = useStore();

  const items = quote
    .map((q) => ({ ...q, product: products.find((p) => p.id === q.productId) }))
    .filter((x): x is { productId: string; qty: number; product: Product } => !!x.product);
  const byVendor = new Map<string, typeof items>();
  items.forEach((it) => byVendor.set(it.product.vendorId, [...(byVendor.get(it.product.vendorId) ?? []), it]));

  return (
    <Screen>
      <SectionTitle title={`🛒 ${t('quoteList')}`} />
      {!items.length && <Muted>{t('emptyQuote')}</Muted>}

      {[...byVendor.entries()].map(([vendorId, list]) => {
        const v = vendors[vendorId];
        const city = v && CITIES.find((c) => c.en === v.city);
        // Only total when every priced item shares one currency
        const priced = list.filter((x) => x.product.price != null);
        const currencies = new Set(priced.map((x) => x.product.currency));
        const total = currencies.size === 1
          ? formatPrice({ price: priced.reduce((sum, x) => sum + x.product.price! * x.qty, 0), currency: [...currencies][0] }, lang)
          : null;
        const send = () => {
          const lines = list.map((x) =>
            `• ${tl(x.product.name)}${x.product.sku ? ` (${x.product.sku})` : ''} × ${x.qty} ${t(unitKey(x.product.unit))}`);
          const msg = `${t('quoteHello')}\n${lines.join('\n')}`;
          if (v) Linking.openURL(`https://wa.me/${intlPhone(v.phone)}?text=${encodeURIComponent(msg)}`);
        };
        return (
          <View key={vendorId} style={s.panel}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>
              🏪 {v?.name ?? '—'} {v?.verified ? <Text style={{ color: C.success, fontSize: 13 }}>✓ {t('verified')}</Text> : null}
            </Text>
            {city && <Muted>📍 {tl(city)}</Muted>}
            {list.map(({ product: p, qty }) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: C.border }}>
                <Link href={`/product/${p.id}`} asChild>
                  <Pressable style={{ width: 56, borderRadius: 8, overflow: 'hidden' }}><ProductThumb product={p} height={56} /></Pressable>
                </Link>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={2} style={{ fontWeight: '600', color: C.text }}>{tl(p.name)}</Text>
                  {p.sku ? <Text style={{ fontSize: 11, color: C.muted }}>{t('code')}: {p.sku}</Text> : null}
                  <Text style={{ color: C.primary, fontWeight: '700' }}>{formatPrice(p, lang) ?? t('askPrice')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Pressable style={stepper} onPress={() => setQuoteQty(p.id, qty - 1)}><Text style={stepTxt}>−</Text></Pressable>
                  <Text style={{ minWidth: 28, textAlign: 'center', fontWeight: '700' }}>{qty}</Text>
                  <Pressable style={stepper} onPress={() => setQuoteQty(p.id, qty + 1)}><Text style={stepTxt}>+</Text></Pressable>
                </View>
              </View>
            ))}
            {total && <Text style={{ fontWeight: '700', color: C.text }}>{t('estTotal')}: <Text style={{ color: C.primary }}>{total}</Text></Text>}
            <View style={s.row}>
              <Button variant="whatsapp" title={`💬 ${t('sendWhatsApp')}`} onPress={send} disabled={!v} style={{ flexGrow: 1 }} />
              <Button variant="danger" title={t('delete')} onPress={() => clearQuote(list.map((x) => x.productId))} />
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const stepper = { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' } as const;
const stepTxt = { fontSize: 18, fontWeight: '700', color: C.primary } as const;
