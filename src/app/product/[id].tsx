import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { ContactSheet } from '../../components/contact';
import { Icon } from '../../components/icons';
import { Text, TextInput } from '../../components/text';
import { AvailabilityBadge, Button, Chip, cityName, FavButton, H, Muted, ProductThumb, RatingBadge, s, Screen, Swatches } from '../../components/ui';
import { categoryById, groupById, Product, Vendor } from '../../lib/catalog';
import { formatConverted, formatPrice, formatRate, hostOf, intlPhone, shortDate, unitKey } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, tl, lang, arrow } = useI18n();
  const { products, vendors, addToQuote, quote, me, exchange } = useStore();
  const { width } = useWindowDimensions();
  const [qty, setQty] = useState(1);
  const [contact, setContact] = useState(false);
  const p = products.find((x) => x.id === id);
  if (!p) return <Screen><Muted>{t('noProducts')}</Muted></Screen>;

  const v = vendors[p.vendorId];
  const cat = categoryById(p.categoryId);
  const group = cat && groupById(cat.group);
  const price = formatPrice(p, lang);
  const alt = formatConverted(p, exchange, lang);
  const wide = width > 820;
  const inQuote = quote.find((q) => q.productId === p.id);
  const minQ = p.minOrder ?? 1;
  const mine = me?.id === p.vendorId;
  const others = p.templateId ? new Set(products.filter((x) => x.templateId === p.templateId && x.vendorId !== p.vendorId).map((x) => x.vendorId)).size : 0;

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
            <RatingBadge vendorId={v.id} />
          </View>
        </View>
        <Button small variant="ghost" title={t('viewShop')} onPress={() => router.push(`/vendor/${v.id}`)} />
      </View>
      {!v.phone ? <Muted style={{ fontSize: 12 }}>{t('noContact')}</Muted> : (
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
      )}
      {!mine && !!v.phone && (
        <View style={[s.row, { marginTop: 4 }]}>
          <Button variant="whatsapp" icon="whatsapp" title={t('whatsapp')} style={{ flex: 1 }} onPress={() => setContact(true)} />
          <Button variant="outline" icon="phone" title={t('call')} style={{ flex: 1 }} onPress={() => setContact(true)} />
        </View>
      )}
      <SourceNote product={p} vendor={v} />
      {others > 0 && (
        <Pressable onPress={() => router.push(`/prices/${p.templateId}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primarySoft, borderRadius: 10, padding: 10 }}>
          <Icon name="scale" size={18} color={C.primary} />
          <Text style={{ flex: 1, color: C.primary, fontWeight: '700', fontSize: 13 }}>{t('compareN').replace('{n}', String(others + 1))}</Text>
          <Text style={{ color: C.primary }}>{arrow}</Text>
        </Pressable>
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
                {p.images.map((u) => <Image key={u} source={{ uri: u }} resizeMode="contain" style={{ width: wide ? 520 : width - 32, height: 320, backgroundColor: '#fff' }} />)}
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
          {alt ? (
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{alt}</Text>
              <Muted style={{ fontSize: 11, lineHeight: 18 }}>
                {t('rateNote')
                  .replace('{rate}', formatRate(exchange, lang) + (exchange.manual ? ` · ${t('rateManual')}` : ''))
                  .replace('{date}', shortDate(exchange.date) || '—')
                  .replace('{cur}', t(p.currency === 'USD' ? 'curDollar' : 'curDinar'))}
              </Muted>
            </View>
          ) : null}

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
            <InfoRow label={t('brand')} val={p.brand} />
            <InfoRow label={t('origin')} val={p.origin} />
            <InfoRow label={t('minOrder')} val={p.minOrder ? `${p.minOrder} ${t(unitKey(p.unit))}` : undefined} />
            <InfoRow label={t('stock')} val={
              p.availability === 'in_stock' ? `${t('inStock')}${p.stockQty != null ? ` · ${p.stockQty} ${t(unitKey(p.unit))}` : ''}`
              : p.availability === 'custom_order' ? t('customOrder') : t('outOfStock')} />
          </View>

          {tl(p.description) ? (
            <View style={s.panel}><H style={{ fontSize: 14 }}>{t('description')}</H><Text style={{ color: C.text, lineHeight: 26, fontSize: 14 }}>{tl(p.description)}</Text></View>
          ) : null}

          {mine && <Button variant="outline" icon="edit" title={t('editProduct')} onPress={() => router.push({ pathname: '/sell', params: { edit: p.id } })} />}
        </View>
      </View>

      {v && contact && (
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

/** For listings copied from a vendor's website or social page: where it came from and when the price was checked. */
function SourceNote({ product, vendor }: { product: Product; vendor: Vendor }) {
  const { t } = useI18n();
  const url = product.sourceUrl || vendor.website;
  if (!vendor.imported && !url) return null;
  return (
    <View style={{ borderTopWidth: 1, borderColor: C.border, paddingTop: 10, marginTop: 4, gap: 6 }}>
      {vendor.imported && (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
          <Icon name="refresh" size={14} color={C.muted} />
          <Muted style={{ flex: 1, fontSize: 12, lineHeight: 20 }}>
            {vendor.syncedAt ? t('priceChecked').replace('{date}', shortDate(vendor.syncedAt)) + ' · ' : ''}{t('importedNote')}
          </Muted>
        </View>
      )}
      {!!url && (
        <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="external" size={14} color={C.primary} />
          <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>
            {product.sourceUrl ? t('viewOriginal') : t('vendorSite')}
          </Text>
          <Muted style={{ fontSize: 12 }}>· {hostOf(url)}</Muted>
        </Pressable>
      )}
    </View>
  );
}

function InfoRow({ label, val }: { label: string; val?: string | number }) {
  if (!val) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: C.border }}>
      <Muted>{label}</Muted>
      <Text style={{ fontWeight: '600', color: C.text, fontSize: 13 }}>{val}</Text>
    </View>
  );
}

const step = { width: 34, height: 34, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' } as const;
