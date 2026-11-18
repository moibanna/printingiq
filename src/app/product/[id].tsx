import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { AvailabilityBadge, Button, Chip, FavButton, H, Muted, ProductThumb, s, Screen, Swatches } from '../../components/ui';
import { categoryById, CITIES, groupById } from '../../lib/catalog';
import { formatPrice, intlPhone, unitKey } from '../../lib/format';
import { StringKey, useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, tl, lang, arrow } = useI18n();
  const { products, vendors, addToQuote, quote } = useStore();
  const [qty, setQty] = useState(1);
  const { width } = useWindowDimensions();
  const p = products.find((x) => x.id === id);
  if (!p) return <Screen><Muted>{t('noProducts')}</Muted></Screen>;

  const v = vendors[p.vendorId];
  const cat = categoryById(p.categoryId);
  const group = cat && groupById(cat.group);
  const inQuote = quote.find((q) => q.productId === p.id);
  const minQ = p.minOrder ?? 1;
  const price = formatPrice(p, lang);
  const wide = width > 820;
  const city = v && CITIES.find((c) => c.en === v.city);
  const msg = encodeURIComponent(`PrintingIQ: ${tl(p.name)}`);

  const Row = ({ k, val }: { k: StringKey; val?: string | number }) =>
    val ? (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: C.border }}>
        <Muted>{t(k)}</Muted>
        <Text style={{ fontWeight: '600', color: C.text }}>{val}</Text>
      </View>
    ) : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: cat ? tl(cat.name) : '' }} />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
        <View style={{ flex: wide ? 1 : undefined, borderRadius: 14, overflow: 'hidden', alignSelf: 'flex-start', width: wide ? undefined : '100%' }}>
          {p.images.length > 1 ? (
            <ScrollView horizontal pagingEnabled>
              {p.images.map((u) => <Image key={u} source={{ uri: u }} style={{ width: wide ? 520 : width - 32, height: 300 }} />)}
            </ScrollView>
          ) : (
            <ProductThumb product={p} height={wide ? 380 : 240} />
          )}
          <AvailabilityBadge product={p} />
          <FavButton id={p.id} style={{ position: 'absolute', top: 10, end: 10, width: 38, height: 38, borderRadius: 19 }} />
        </View>

        <View style={{ flex: wide ? 1 : undefined, gap: 12 }}>
          {cat && group && (
            <Text style={{ color: C.muted }} onPress={() => router.push(`/category/${cat.id}`)}>{tl(group.name)} {arrow} {tl(cat.name)}</Text>
          )}
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>{tl(p.name)}</Text>
          {p.sku ? <Text style={{ color: C.muted, letterSpacing: 0.4 }}>{t('code')}: {p.sku}</Text> : null}
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.primary }}>
            {price ? `${price} ` : t('askPrice')}
            {price ? <Text style={{ fontSize: 14, color: C.muted }}>{t('per')} {t(unitKey(p.unit))}</Text> : null}
          </Text>

          <View style={[s.panel, { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable style={step} onPress={() => setQty(Math.max(1, qty - 1))}><Text style={stepTxt}>−</Text></Pressable>
              <TextInput value={String(qty)} onChangeText={(v) => setQty(Math.max(1, Number(v.replace(/\D/g, '')) || 1))} keyboardType="numeric"
                style={{ width: 56, textAlign: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingVertical: 6, fontWeight: '700' }} />
              <Pressable style={step} onPress={() => setQty(qty + 1)}><Text style={stepTxt}>+</Text></Pressable>
            </View>
            <Button
              title={inQuote ? `${t('added')} (${inQuote.qty})` : `🛒 ${t('addToQuote')}`}
              variant={inQuote ? 'outline' : 'primary'}
              disabled={p.availability === 'out_of_stock'}
              onPress={() => addToQuote(p.id, Math.max(qty, inQuote ? 1 : minQ))}
              style={{ flexGrow: 1 }}
            />
            {inQuote && <Button variant="accent" title={t('quoteList')} onPress={() => router.push('/quote')} />}
          </View>

          {p.colors.length > 0 && (
            <View style={s.panel}><H style={{ fontSize: 15 }}>{t('colors')}</H><Swatches colors={p.colors} size={30} /></View>
          )}
          {p.thickness.length > 0 && (
            <View style={s.panel}><H style={{ fontSize: 15 }}>{t('thickness')}</H><View style={s.row}>{p.thickness.map((x) => <Chip key={x} label={x} />)}</View></View>
          )}
          {p.sizes.length > 0 && (
            <View style={s.panel}><H style={{ fontSize: 15 }}>{t('sizes')}</H><View style={s.row}>{p.sizes.map((x) => <Chip key={x} label={x} />)}</View></View>
          )}

          <View style={s.panel}>
            <Row k="brand" val={p.brand} />
            <Row k="origin" val={p.origin} />
            <Row k="minOrder" val={p.minOrder ? `${p.minOrder} ${t(unitKey(p.unit))}` : undefined} />
            <Row k="stock" val={
              p.availability === 'in_stock' ? `${t('inStock')}${p.stockQty != null ? ` · ${p.stockQty} ${t(unitKey(p.unit))}` : ''}`
              : p.availability === 'custom_order' ? t('customOrder') : t('outOfStock')} />
          </View>

          {tl(p.description) ? (
            <View style={s.panel}><H style={{ fontSize: 15 }}>{t('description')}</H><Text style={{ color: C.text, lineHeight: 22 }}>{tl(p.description)}</Text></View>
          ) : null}

          {v && (
            <View style={s.panel}>
              <Muted>{t('vendor')}</Muted>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>
                {v.name} {v.verified ? <Text style={{ color: C.success, fontSize: 13 }}>✓ {t('verified')}</Text> : null}
              </Text>
              <Muted>📍 {city ? tl(city) : v.city}</Muted>
              <View style={[s.row, { marginTop: 6 }]}>
                <Button variant="whatsapp" title={`💬 ${t('whatsapp')}`} style={{ flex: 1 }}
                  onPress={() => Linking.openURL(`https://wa.me/${intlPhone(v.phone)}?text=${msg}`)} />
                <Button variant="outline" title={`📞 ${t('call')}`} style={{ flex: 1 }}
                  onPress={() => Linking.openURL(`tel:+${intlPhone(v.phone)}`)} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const step = { width: 34, height: 34, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' } as const;
const stepTxt = { fontSize: 18, fontWeight: '700', color: C.primary } as const;
