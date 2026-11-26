import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { AttachmentList } from '../../components/requests';
import { Icon } from '../../components/icons';
import { Text } from '../../components/text';
import { Button, cityName, Muted, s, Screen } from '../../components/ui';
import { backend } from '../../lib/backend';
import { categoryById, groupById, Offer, QuoteRequest } from '../../lib/catalog';
import { formatConverted, formatPrice, intlPhone, priceInIQD } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

const REFRESH_MS = 30_000; // new offers show up while the page is open

/** Customer's private page for one request: what they asked and every vendor's offer, cheapest first. */
export default function RequestPage() {
  const { id, k, sent } = useLocalSearchParams<{ id: string; k?: string; sent?: string }>();
  const { t, tl, lang } = useI18n();
  const { vendors, exchange, myRequests } = useStore();
  const token = k || myRequests.find((r) => r.id === id)?.token || '';
  const [data, setData] = useState<{ request: QuoteRequest; offers: Offer[] } | null | undefined>(undefined);

  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const tick = () => backend.getRequest(id, token)
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setData((x) => x ?? null); });
    tick();
    const timer = setInterval(tick, REFRESH_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [id, token, reload]);

  if (!token) return <Screen><Muted>{t('noRequests')}</Muted></Screen>;
  if (data === undefined) return <Screen><ActivityIndicator /></Screen>;
  if (!data) return <Screen><Muted>{t('noRequests')}</Muted></Screen>;
  const { request: r } = data;
  const offers = [...data.offers].sort((a, b) => (priceInIQD(a, exchange) ?? Infinity) - (priceInIQD(b, exchange) ?? Infinity));
  const cat = r.categoryId ? categoryById(r.categoryId) : undefined;

  async function close() {
    if (Platform.OS === 'web' && !window.confirm(t('closeRequest') + '?')) return;
    await backend.closeRequest(r.id, token);
    setReload((n) => n + 1);
  }

  return (
    <Screen>
      {sent === '1' && (
        <View style={[s.panel, { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#ECFDF3', borderColor: '#ABEFC6' }]}>
          <Icon name="ok" size={22} color={C.success} />
          <Text style={{ flex: 1, color: C.text, fontSize: 13 }}>{t('requestSent')}</Text>
        </View>
      )}

      <View style={s.panel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Icon name={r.categoryId ?? r.groupId} size={18} color={C.primary} />
          <Text style={{ fontWeight: '700', color: C.primary }}>{tl((cat ?? groupById(r.groupId))?.name)}</Text>
          <Muted style={{ fontSize: 12 }}>· {cityName(r.city, tl)} · {new Date(r.createdAt).toLocaleDateString('en-GB')}</Muted>
          {r.status === 'closed' && <Text style={{ color: C.muted, fontWeight: '700', fontSize: 12 }}>· {t('requestClosed')}</Text>}
        </View>
        <Text style={{ color: C.text, fontSize: 15, lineHeight: 24 }}>{r.description}</Text>
        {r.quantity ? <Text style={{ color: C.text }}>{t('quantity')}: <Text style={{ fontWeight: '700' }}>{r.quantity}</Text></Text> : null}
        <AttachmentList files={r.files} />
      </View>

      <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{t('offers')} ({offers.length})</Text>
      {!offers.length && <View style={s.panel}><Muted>{t('noOffersYet')}</Muted></View>}
      {offers.map((o, i) => {
        const v = vendors[o.vendorId];
        const wa = v ? intlPhone(v.whatsapp || v.phone) : '';
        const price = formatPrice(o, lang);
        return (
          <View key={o.id} style={[s.panel, i === 0 && o.price != null && { borderColor: C.success, borderWidth: 1.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="store" size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{v?.name ?? '—'}</Text>
                {v && <Muted style={{ fontSize: 12 }}>{cityName(v.city, tl)}</Muted>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {i === 0 && o.price != null && offers.length > 1 && <Text style={{ color: C.success, fontWeight: '700', fontSize: 11 }}>{t('cheapest')}</Text>}
                <Text style={{ color: C.primary, fontWeight: '800', fontSize: 17 }}>{price ?? t('askPrice')}</Text>
                {price && <Muted style={{ fontSize: 11 }}>{formatConverted(o, exchange, lang)}</Muted>}
              </View>
            </View>
            {o.note ? <Text style={{ color: C.text, fontSize: 13 }}>{o.note}</Text> : null}
            {o.days ? <Muted style={{ fontSize: 12 }}>{t('readyIn').replace('{n}', String(o.days))}</Muted> : null}
            {v && (
              <View style={s.row}>
                <Button small variant="whatsapp" icon="whatsapp" title={t('whatsapp')}
                  onPress={() => Linking.openURL(`https://wa.me/${wa}?text=${encodeURIComponent(`${t('waOfferReply').replace('{vendor}', v.name)}\n${r.description}`)}`)} />
                <Button small variant="outline" icon="phone" title={t('call')} onPress={() => Linking.openURL(`tel:+${intlPhone(v.phone)}`)} />
                <Button small variant="ghost" icon="store" title={t('viewShop')} onPress={() => router.push(`/vendor/${v.id}`)} />
              </View>
            )}
          </View>
        );
      })}
      {r.status === 'open' && <Button variant="outline" icon="check" title={t('closeRequest')} onPress={close} />}
    </Screen>
  );
}
