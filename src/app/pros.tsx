import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { Icon } from '../components/icons';
import { Text } from '../components/text';
import { Button, Chip, cityName, Muted, RatingBadge, s, Screen } from '../components/ui';
import { CITIES, Product, Vendor, VendorKind } from '../lib/catalog';
import { formatPrice, intlPhone, priceInIQD } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';

const PRO_KINDS: VendorKind[] = ['printhouse', 'installer'];

/** Directory of print houses and installers (who may have no shop), by city, with their services and work photos. */
export default function Pros() {
  const { t, tl, lang } = useI18n();
  const { vendors, products, exchange, ratings } = useStore();
  const [kind, setKind] = useState<VendorKind | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const byVendor = useMemo(() => {
    const m: Record<string, Product[]> = {};
    for (const p of products) (m[p.vendorId] ??= []).push(p);
    return m;
  }, [products]);
  const pros = Object.values(vendors)
    .filter((v) => v.kind && PRO_KINDS.includes(v.kind) && (!kind || v.kind === kind) && (!city || v.city === city || v.areas?.includes(city)))
    // Best rated first, then those with the most services listed
    .sort((a, b) => (ratings[b.id]?.avg ?? 0) - (ratings[a.id]?.avg ?? 0) || (byVendor[b.id]?.length ?? 0) - (byVendor[a.id]?.length ?? 0));

  return (
    <Screen>
      <View style={s.panel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="installer" size={22} color={C.primary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{t('findPros')}</Text>
        </View>
        <Muted>{t('findProsIntro')}</Muted>
        <View style={s.row}>
          <Chip label={t('allKinds')} active={!kind} onPress={() => setKind(null)} />
          {PRO_KINDS.map((k) => <Chip key={k} icon={k} label={t(`kind_${k}`)} active={kind === k} onPress={() => setKind(k)} />)}
        </View>
        <View style={s.row}>
          <Chip label={t('anyCity')} active={!city} onPress={() => setCity(null)} />
          {CITIES.map((c) => <Chip key={c.en} label={tl(c)} active={city === c.en} onPress={() => setCity(c.en)} />)}
        </View>
      </View>

      {!pros.length && (
        <View style={[s.panel, { alignItems: 'center', gap: 10, padding: 24 }]}>
          <Muted style={{ textAlign: 'center' }}>{t('noPros')}</Muted>
          <Button icon="user" title={t('registerFree')} onPress={() => router.push('/account')} />
        </View>
      )}
      {pros.map((v) => <ProCard key={v.id} v={v} services={byVendor[v.id] ?? []} />)}
      {pros.length > 0 && <Button variant="ghost" icon="user" title={t('registerFree')} onPress={() => router.push('/account')} />}
    </Screen>
  );

  function ProCard({ v, services }: { v: Vendor; services: Product[] }) {
    const priced = services.filter((p) => p.price != null).sort((a, b) => priceInIQD(a, exchange)! - priceInIQD(b, exchange)!);
    const areas = [v.city, ...(v.areas ?? [])].filter(Boolean).map((c) => cityName(c, tl));
    return (
      <View style={s.panel}>
        <Pressable onPress={() => router.push(`/vendor/${v.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={v.kind ?? 'store'} size={24} color={C.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{v.name}</Text>
              {v.verified && <Icon name="verified" size={16} color={C.success} />}
              <RatingBadge vendorId={v.id} />
            </View>
            <Text style={{ fontSize: 12, color: C.accent, fontWeight: '700' }}>{t(`kind_${v.kind ?? 'shop'}`)}</Text>
            <Muted style={{ fontSize: 12 }}>{t('worksIn').replace('{cities}', areas.join('، '))}</Muted>
          </View>
        </Pressable>
        {v.about ? <Text numberOfLines={3} style={{ color: C.text, fontSize: 13, lineHeight: 22 }}>{v.about}</Text> : null}
        {services.length > 0 && (
          <View style={{ backgroundColor: C.bg, borderRadius: 8, padding: 8, gap: 3 }}>
            {(priced.length ? priced : services).slice(0, 4).map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', gap: 8 }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, color: C.text }}>• {tl(p.name)}</Text>
                <Text style={{ fontSize: 13, color: C.primary, fontWeight: '700' }}>{formatPrice(p, lang) ?? t('askPrice')}</Text>
              </View>
            ))}
            {services.length > 4 && <Muted style={{ fontSize: 12 }}>{t('servicesN').replace('{n}', String(services.length))}</Muted>}
          </View>
        )}
        {!!v.portfolio?.length && (
          <View style={s.row}>
            {v.portfolio.slice(0, 4).map((u) => <Image key={u} source={{ uri: u }} style={{ width: 76, height: 76, borderRadius: 8 }} />)}
          </View>
        )}
        <View style={s.row}>
          {!!v.phone && (
            <Button small variant="whatsapp" icon="whatsapp" title={t('whatsapp')}
              onPress={() => Linking.openURL(`https://wa.me/${intlPhone(v.whatsapp || v.phone)}?text=${encodeURIComponent(t('waGreeting').replace('{vendor}', v.name))}`)} />
          )}
          {!!v.phone && <Button small variant="outline" icon="phone" title={t('call')} onPress={() => Linking.openURL(`tel:+${intlPhone(v.phone)}`)} />}
          <Button small variant="ghost" icon="store" title={t('viewShop')} onPress={() => router.push(`/vendor/${v.id}`)} />
        </View>
      </View>
    );
  }
}
