import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { ContactSheet } from '../../components/contact';
import { Icon } from '../../components/icons';
import { Text, TextInput } from '../../components/text';
import { AvailabilityBadge, Button, Chip, cityName, FavButton, H, Muted, ProductThumb, s, Screen, Swatches } from '../../components/ui';
import { categoryById, groupById } from '../../lib/catalog';
import { formatPrice, intlPhone, unitKey } from '../../lib/format';
import { StringKey, useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, tl, lang, arrow } = useI18n();
  const { products, vendors, addToQuote, quote, me } = useStore();
  const { width } = useWindowDimensions();
  const [qty, setQty] = useState(1);
  const [contact, setContact] = useState(false);
  const p = products.find((x) => x.id === id);
  if (!p) return <Screen><Muted>{t('noProducts')}</Muted></Screen>;

  const v = vendors[p.vendorId];
  const cat = categoryById(p.categoryId);
  const group = cat && groupById(cat.group);
  const price = formatPrice(p, lang);
  const wide = width > 820;
  const inQuote = quote.find((q) => q.productId === p.id);
  const minQ = p.minOrder ?? 1;
  const mine = me?.id === p.vendorId;

  const Row = ({ k, val }: { k: StringKey; val?: string | number }) =>
    val ? (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: C.border }}>
        <Muted>{t(k)}</Muted>
        <Text style={{ fontWeight: '600', color: C.text, fontSize: 13 }}>{val}</Text>
      </View>
    ) : null;

  const VendorCard = v ? (
    <View style={[s.panel, { borderColor: C.primary, borderWidth: 1.5 }]}>
      <Muted style={{ fontSize: 12 }}>{t('soldBy')}</Muted>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="store" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{v.name}</Text>
            {v.verified && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="verified" size={15} color={C.success} />
                <Text style={{ color: C.success, fontSize: 11, fontWeight: '600' }}>{t('verified')}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="pin" size={13} color={C.muted} />
            <Muted style={{ fontSize: 12 }}>{cityName(v.city, tl)}</Muted>
          </View>
        </View>
        <Button small variant="ghost" title={t('viewShop')} onPress={() => router.push(`/vendor/${v.id}`)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="whatsapp" size={15} color={C.success} />
          <Text style={{ direction: 'ltr', fontSize: 13, color: C.text } as object}>+{intlPhone(v.whatsapp || v.phone)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="phone" size={15} color={C.primary} />
          <Text style={{ direction: 'ltr', fontSize: 13, color: C.text } as object}>+{intlPhone(v.phone)}</Text>
        </View>
      </View>
      {!mine && (
        <View style={[s.row, { marginTop: 4 }]}>
          <Button variant="whatsapp" icon="whatsapp" title={t('whatsapp')} style={{ flex: 1 }} onPress={() => setContact(true)} />
          <Button variant="outline" icon="phone" title={t('call')} style={{ flex: 1 }} onPress={() => setContact(true)} />
        </View>
      )}
    </View>
  ) : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: cat ? tl(cat.name) : '' }} />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
        <View style={{ flex: wide ? 1 : undefined, gap: 12 }}>
          <View style={{ borderRadius: 14, overflow: 'hidden' }}>
            {p.images.length > 1 ? (
              <ScrollView horizontal pagingEnabled>
                {p.images.map((u) => <Image key={u} source={{ uri: u }} style={{ width: wide ? 520 : width - 32, height: 320 }} />)}
              </ScrollView>
            ) : (
              <ProductThumb product={p} height={wide ? 380 : 240} />
            )}
            <AvailabilityBadge product={p} />
            <FavButton id={p.id} style={{ position: 'absolute', top: 10, end: 10, width: 38, height: 38, borderRadius: 19 }} />
          </View>
          {wide && VendorCard}
        </View>

        <View style={{ flex: wide ? 1 : undefined, gap: 12 }}>
          {cat && group && (
            <Text style={{ color: C.muted, fontSize: 12 }} onPress={() => router.push(`/category/${cat.id}`)}>{tl(group.name)} {arrow} {tl(cat.name)}</Text>
          )}
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, lineHeight: 36 }}>{tl(p.name)}</Text>
          {p.sku ? <Text style={{ color: C.muted, letterSpacing: 0.4, fontSize: 12 }}>{t('code')}: {p.sku}</Text> : null}
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.primary }}>
            {price ? `${price} ` : t('askPrice')}
            {price ? <Text style={{ fontSize: 13, color: C.muted }}>{t('per')} {t(unitKey(p.unit))}</Text> : null}
          </Text>

          {!wide && VendorCard}

          <View style={[s.panel, { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable style={step} onPress={() => setQty(Math.max(1, qty - 1))}><Icon name="minus" size={16} color={C.primary} /></Pressable>
              <TextInput value={String(qty)} onChangeText={(x) => setQty(Math.max(1, Number(x.replace(/\D/g, '')) || 1))} keyboardType="numeric"
                style={{ width: 56, textAlign: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingVertical: 5, fontWeight: '700' }} />
              <Pressable style={step} onPress={() => setQty(qty + 1)}><Icon name="plus" size={16} color={C.primary} /></Pressable>
            </View>
            <Button
              icon={inQuote ? 'check' : 'cart'}
              title={inQuote ? `${t('added')} (${inQuote.qty})` : t('addToQuote')}
              variant={inQuote ? 'outline' : 'primary'}
              disabled={p.availability === 'out_of_stock'}
              onPress={() => addToQuote(p.id, Math.max(qty, inQuote ? 1 : minQ))}
              style={{ flexGrow: 1 }}
            />
            {inQuote && <Button variant="accent" title={t('quoteList')} onPress={() => router.push('/quote')} />}
          </View>

          {p.colors.length > 0 && (
            <View style={s.panel}><H style={{ fontSize: 14 }}>{t('colors')}</H><Swatches colors={p.colors} size={30} /></View>
          )}
          {p.thickness.length > 0 && (
            <View style={s.panel}><H style={{ fontSize: 14 }}>{t('thickness')}</H><View style={s.row}>{p.thickness.map((x) => <Chip key={x} label={x} />)}</View></View>
          )}
          {p.sizes.length > 0 && (
            <View style={s.panel}><H style={{ fontSize: 14 }}>{t('sizes')}</H><View style={s.row}>{p.sizes.map((x) => <Chip key={x} label={x} />)}</View></View>
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
            <View style={s.panel}><H style={{ fontSize: 14 }}>{t('description')}</H><Text style={{ color: C.text, lineHeight: 26, fontSize: 14 }}>{tl(p.description)}</Text></View>
          ) : null}

          {mine && <Button variant="outline" icon="edit" title={t('editProduct')} onPress={() => router.push({ pathname: '/sell', params: { edit: p.id } })} />}
        </View>
      </View>

      {v && (
        <ContactSheet
          vendor={v}
          visible={contact}
          onClose={() => setContact(false)}
          items={[{ productId: p.id, name: tl(p.name), sku: p.sku, qty: inQuote?.qty ?? (qty > 1 ? qty : undefined), unitLabel: t(unitKey(p.unit)) }]}
        />
      )}
    </Screen>
  );
}

const step = { width: 34, height: 34, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' } as const;
