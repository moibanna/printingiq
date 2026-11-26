import { useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { Attachment, categoryById, Currency, groupById, QuoteRequest } from '../lib/catalog';
import { formatPrice, intlPhone } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { Icon } from './icons';
import { Text } from './text';
import { Button, Chip, cityName, Field, Muted, s } from './ui';

/** Customer's design files: photo thumbnails and PDF links, each opening the full file. */
export function AttachmentList({ files }: { files: Attachment[] }) {
  const { t } = useI18n();
  if (!files.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>{t('files')}</Text>
      <View style={s.row}>
        {files.map((f) => (
          <Pressable key={f.url} onPress={() => Linking.openURL(f.url)} accessibilityRole="link"
            style={{ width: 76, height: 76, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {f.type?.startsWith('image/') ? <Image source={{ uri: f.url }} style={{ width: 76, height: 76 }} /> : (
              <View style={{ alignItems: 'center', padding: 4, gap: 2 }}>
                <Icon name="file" size={24} color={C.primary} />
                <Text numberOfLines={2} style={{ fontSize: 9, color: C.muted, textAlign: 'center' }}>{f.name}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function timeAgo(iso: string) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} d`;
}

function RequestCard({ r }: { r: QuoteRequest }) {
  const { t, tl, lang } = useI18n();
  const { me, myOffers, sendOffer } = useStore();
  const mine = myOffers.find((o) => o.requestId === r.id);
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(mine?.price != null ? String(mine.price) : '');
  const [currency, setCurrency] = useState<Currency>(mine?.currency ?? 'IQD');
  const [days, setDays] = useState(mine?.days ? String(mine.days) : '');
  const [note, setNote] = useState(mine?.note ?? '');
  const [busy, setBusy] = useState(false);
  const cat = r.categoryId ? categoryById(r.categoryId) : undefined;

  async function submit() {
    const offer = {
      requestId: r.id, price: price.trim() ? Number(price.replace(/[^\d.]/g, '')) || null : null, currency,
      note: note.trim() || undefined, days: days.trim() ? Number(days.replace(/\D/g, '')) || undefined : undefined,
    };
    // The customer also gets the offer on WhatsApp, so they see it even without opening PrintingIQ.
    // WhatsApp opens first: browsers block new tabs opened after waiting on the network.
    const text = [
      t('offerWa').replace('{name}', r.customerName).replace('{shop}', me?.name ?? '')
        .replace('{job}', r.description.slice(0, 80)).replace('{price}', formatPrice(offer, lang) ?? t('askPrice')),
      offer.days ? t('readyIn').replace('{n}', String(offer.days)) : '', offer.note ?? '',
    ].filter(Boolean).join('\n');
    Linking.openURL(`https://wa.me/${intlPhone(r.customerPhone)}?text=${encodeURIComponent(text)}`);
    setBusy(true);
    try {
      await sendOffer(offer);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[s.panel, !mine && { borderColor: C.accent }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Icon name={r.categoryId ?? r.groupId} size={17} color={C.primary} />
        <Text style={{ fontWeight: '700', color: C.primary, fontSize: 13 }}>{tl((cat ?? groupById(r.groupId))?.name)}</Text>
        <Muted style={{ fontSize: 12 }}>· {cityName(r.city, tl)} · {t('ago').replace('{t}', timeAgo(r.createdAt))}</Muted>
        <View style={{ flex: 1 }} />
        {mine && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="ok" size={14} color={C.success} />
            <Text style={{ color: C.success, fontSize: 12, fontWeight: '700' }}>{t('offerSent')}: {formatPrice(mine, lang) ?? t('askPrice')}</Text>
          </View>
        )}
      </View>
      <Text style={{ color: C.text, fontSize: 14, lineHeight: 22 }}>{r.description}</Text>
      {r.quantity ? <Text style={{ color: C.text, fontSize: 13 }}>{t('quantity')}: <Text style={{ fontWeight: '700' }}>{r.quantity}</Text></Text> : null}
      <AttachmentList files={r.files} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="user" size={14} color={C.muted} />
        <Text style={{ fontSize: 13, color: C.text }}>{r.customerName}</Text>
        <Text style={{ fontSize: 12, color: C.muted, direction: 'ltr' } as object}>{r.customerPhone}</Text>
      </View>

      {open ? (
        <View style={{ gap: 4, backgroundColor: C.bg, borderRadius: 10, padding: 10 }}>
          <View style={[s.row, { alignItems: 'flex-end' }]}>
            <View style={{ flex: 1, minWidth: 140 }}><Field label={t('yourPrice')} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder={t('askPrice')} ltr /></View>
            <View style={[s.row, { marginBottom: 12 }]}>
              {(['IQD', 'USD'] as Currency[]).map((c) => <Chip key={c} label={c === 'USD' ? '$' : 'IQD'} active={currency === c} onPress={() => setCurrency(c)} />)}
            </View>
            <View style={{ width: 120 }}><Field label={t('days')} value={days} onChangeText={setDays} keyboardType="numeric" ltr /></View>
          </View>
          <Field label={t('offerNote')} value={note} onChangeText={setNote} multiline />
          <View style={s.row}>
            <Button variant="whatsapp" icon="send" title={t('sendOffer')} onPress={submit} disabled={busy} />
            <Button variant="ghost" icon="close" title={t('cancel')} onPress={() => setOpen(false)} />
          </View>
        </View>
      ) : (
        <View style={s.row}>
          <Button small icon={mine ? 'edit' : 'send'} title={mine ? t('editOffer') : t('sendOffer')} onPress={() => setOpen(true)} />
          <Button small variant="outline" icon="phone" title={t('call')} onPress={() => Linking.openURL(`tel:+${intlPhone(r.customerPhone)}`)} />
        </View>
      )}
    </View>
  );
}

/** Vendor dashboard → Requests: jobs customers asked prices for. */
export function RequestsInbox() {
  const { t } = useI18n();
  const { requests, products, me } = useStore();
  // Groups this vendor sells in, to filter to relevant requests (on by default once they have products)
  const myGroups = new Set(products.filter((p) => p.vendorId === me?.id).map((p) => categoryById(p.categoryId)?.group).filter(Boolean));
  const [onlyMine, setOnlyMine] = useState(myGroups.size > 0);
  const shown = requests.filter((r) => !onlyMine || myGroups.has(r.groupId));
  return (
    <View style={{ gap: 10 }}>
      <View style={s.panel}>
        <Muted>{t('requestsIntro')}</Muted>
        {myGroups.size > 0 && (
          <View style={s.row}>
            <Chip label={t('onlyMyCategories')} active={onlyMine} onPress={() => setOnlyMine(true)} />
            <Chip label={t('allCurrencies')} active={!onlyMine} onPress={() => setOnlyMine(false)} />
          </View>
        )}
      </View>
      {shown.length ? shown.map((r) => <RequestCard key={r.id} r={r} />) : (
        <View style={[s.panel, { alignItems: 'center', padding: 24 }]}>
          <Icon name="inbox" size={36} color={C.muted} strokeWidth={1.4} />
          <Muted style={{ textAlign: 'center' }}>{t('noRequests')}</Muted>
        </View>
      )}
    </View>
  );
}
