import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { backend } from '../lib/backend';
import { Review } from '../lib/catalog';
import { useI18n } from '../lib/i18n';
import { MyContact, useStore } from '../lib/store';
import { C } from '../lib/theme';
import { Icon } from './icons';
import { Text, TextInput } from './text';
import { Button, Muted, RatingBadge, s, Stars } from './ui';

function RateCard({ c }: { c: MyContact }) {
  const { t } = useI18n();
  const { vendors, rate } = useStore();
  const [stars, setStars] = useState(c.rated ?? 0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const v = vendors[c.vendorId];
  if (!v) return null;
  async function send() {
    setBusy(true); setErr('');
    try { await rate(c, stars, comment.trim() || undefined); } catch (e) { setErr(String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }
  return (
    <View style={{ gap: 6, paddingVertical: 10, borderTopWidth: 1, borderColor: C.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="store" size={16} color={C.primary} />
        <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{v.name}</Text>
        <Muted style={{ fontSize: 11 }}>{t('contactedOn').replace('{date}', c.createdAt.slice(0, 10))}</Muted>
      </View>
      {c.rated ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Stars value={c.rated} />
          <Text style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>{t('thanksRating')}</Text>
        </View>
      ) : (
        <>
          <Stars value={stars} size={26} onChange={setStars} />
          {stars > 0 && (
            <>
              <TextInput value={comment} onChangeText={setComment} placeholder={t('yourComment')} multiline style={[s.input, { minHeight: 60 }]} />
              <Button small icon="send" title={t('sendRating')} onPress={send} disabled={busy} />
            </>
          )}
          {err ? <Text style={{ color: C.danger, fontSize: 12 }}>{err}</Text> : null}
        </>
      )}
    </View>
  );
}

/** Customer: vendors they contacted from this device, with stars to rate each one once. */
export function RateVendors() {
  const { t } = useI18n();
  const { myContacts, vendors } = useStore();
  const list = myContacts.filter((c) => vendors[c.vendorId]);
  if (!list.length) return null;
  return (
    <View style={s.panel}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="star" size={18} color="#F5A524" />
        <Text style={{ fontWeight: '700', color: C.text }}>{t('rateVendors')}</Text>
      </View>
      <Muted style={{ fontSize: 12 }}>{t('rateVendorsSub')}</Muted>
      {list.map((c) => <RateCard key={c.leadId} c={c} />)}
    </View>
  );
}

/** Vendor page: average rating and the latest reviews. */
export function VendorReviews({ vendorId }: { vendorId: string }) {
  const { t } = useI18n();
  const { ratings } = useStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const count = ratings[vendorId]?.count ?? 0;
  useEffect(() => {
    let alive = true;
    if (count) backend.listReviews(vendorId).then((r) => { if (alive) setReviews(r); }).catch(() => {});
    return () => { alive = false; };
  }, [vendorId, count]);
  if (!count) return null;
  return (
    <View style={s.panel}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Text style={{ fontWeight: '700', color: C.text, fontSize: 15 }}>{t('reviews')}</Text>
        <RatingBadge vendorId={vendorId} />
      </View>
      {reviews.map((r) => (
        <View key={r.id} style={{ gap: 2, paddingTop: 8, borderTopWidth: 1, borderColor: C.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Stars value={r.stars} size={12} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{r.customerName}</Text>
            <Muted style={{ fontSize: 11 }}>{r.createdAt.slice(0, 10)}</Muted>
          </View>
          {r.comment ? <Text style={{ fontSize: 13, color: C.text }}>{r.comment}</Text> : null}
        </View>
      ))}
    </View>
  );
}
