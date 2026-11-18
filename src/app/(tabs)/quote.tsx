import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ContactSheet, ContactItem } from '../../components/contact';
import { Icon } from '../../components/icons';
import { Text } from '../../components/text';
import { Button, Muted, ProductThumb, s, Screen, SectionTitle, VendorLine } from '../../components/ui';
import { Product, Vendor } from '../../lib/catalog';
import { formatPrice, unitKey } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

/** Orders in this market are agreed on WhatsApp, so the quote list sends one itemized request per vendor. */
export default function QuoteScreen() {
  const { t, tl, lang } = useI18n();
  const { quote, products, vendors, setQuoteQty, clearQuote } = useStore();
  const [sending, setSending] = useState<{ vendor: Vendor; items: ContactItem[] } | null>(null);

  const items = quote
    .map((q) => ({ ...q, product: products.find((p) => p.id === q.productId) }))
    .filter((x): x is { productId: string; qty: number; product: Product } => !!x.product);
  const byVendor = new Map<string, typeof items>();
  items.forEach((it) => byVendor.set(it.product.vendorId, [...(byVendor.get(it.product.vendorId) ?? []), it]));

  return (
    <Screen>
      <SectionTitle icon="cart" title={t('quoteList')} />
      {!items.length && <Muted>{t('emptyQuote')}</Muted>}

      {[...byVendor.entries()].map(([vendorId, list]) => {
        const v = vendors[vendorId];
        const priced = list.filter((x) => x.product.price != null);
        const currencies = new Set(priced.map((x) => x.product.currency));
        const total = currencies.size === 1
          ? formatPrice({ price: priced.reduce((sum, x) => sum + x.product.price! * x.qty, 0), currency: [...currencies][0] }, lang)
          : null;
        return (
          <View key={vendorId} style={s.panel}>
            <VendorLine vendor={v} />
            {list.map(({ product: p, qty }) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: C.border }}>
                <Link href={`/product/${p.id}`} asChild>
                  <Pressable style={{ width: 56, borderRadius: 8, overflow: 'hidden' }}><ProductThumb product={p} height={56} /></Pressable>
                </Link>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text numberOfLines={2} style={{ fontWeight: '600', color: C.text, fontSize: 13 }}>{tl(p.name)}</Text>
                  {p.sku ? <Text style={{ fontSize: 10, color: C.muted }}>{t('code')}: {p.sku}</Text> : null}
                  <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>{formatPrice(p, lang) ?? t('askPrice')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Pressable style={stepper} onPress={() => setQuoteQty(p.id, qty - 1)}><Icon name="minus" size={15} color={C.primary} /></Pressable>
                  <Text style={{ minWidth: 28, textAlign: 'center', fontWeight: '700' }}>{qty}</Text>
                  <Pressable style={stepper} onPress={() => setQuoteQty(p.id, qty + 1)}><Icon name="plus" size={15} color={C.primary} /></Pressable>
                </View>
              </View>
            ))}
            {total && <Text style={{ fontWeight: '700', color: C.text, fontSize: 13 }}>{t('estTotal')}: <Text style={{ color: C.primary, fontWeight: '700' }}>{total}</Text></Text>}
            <View style={s.row}>
              <Button
                variant="whatsapp" icon="whatsapp" title={t('sendWhatsApp')} disabled={!v} style={{ flexGrow: 1 }}
                onPress={() => v && setSending({
                  vendor: v,
                  items: list.map((x) => ({ productId: x.product.id, name: tl(x.product.name), sku: x.product.sku, qty: x.qty, unitLabel: t(unitKey(x.product.unit)) })),
                })}
              />
              <Button variant="danger" icon="trash" title={t('delete')} onPress={() => clearQuote(list.map((x) => x.productId))} />
            </View>
          </View>
        );
      })}

      {sending && (
        <ContactSheet quote vendor={sending.vendor} items={sending.items} visible onClose={() => setSending(null)} />
      )}
    </Screen>
  );
}

const stepper = { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' } as const;
