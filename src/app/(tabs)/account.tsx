import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { Icon, IconName } from '../../components/icons';
import { Text } from '../../components/text';
import { Button, Chip, Field, H, LangSwitcher, Muted, ProductThumb, s, Screen } from '../../components/ui';
import { CITIES, Lead } from '../../lib/catalog';
import { formatPrice, intlPhone } from '../../lib/format';
import { StringKey, useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

const confirmDelete = (msg: string) => Platform.OS !== 'web' || window.confirm(msg);

function ShopFields({ v, set }: { v: ShopForm; set: (k: keyof ShopForm, val: string) => void }) {
  const { t, tl } = useI18n();
  return (
    <>
      <Field label={t('shopName')} value={v.name} onChangeText={(x) => set('name', x)} />
      <Field label={t('phone')} value={v.phone} onChangeText={(x) => set('phone', x)} keyboardType="phone-pad" ltr />
      <Field label={t('whatsappNumber')} value={v.whatsapp} onChangeText={(x) => set('whatsapp', x)} keyboardType="phone-pad" ltr />
      <Text style={s.label}>{t('city')}</Text>
      <View style={[s.row, { marginBottom: 12 }]}>
        {CITIES.map((c) => <Chip key={c.en} label={tl(c)} active={v.city === c.en} onPress={() => set('city', c.en)} />)}
      </View>
      <Field label={t('aboutShop')} value={v.about} onChangeText={(x) => set('about', x)} multiline />
    </>
  );
}
type ShopForm = { name: string; phone: string; whatsapp: string; city: string; about: string };
const emptyShop: ShopForm = { name: '', phone: '', whatsapp: '', city: 'Erbil', about: '' };

/** Sign in / create vendor account */
function Auth() {
  const { t } = useI18n();
  const { signIn, signUpVendor, mode } = useStore();
  const [signup, setSignup] = useState(true);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [shop, setShop] = useState<ShopForm>(emptyShop);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(null);
    if (signup && (!shop.name.trim() || !shop.phone.trim() || !email.trim() || pw.length < 6)) return setMsg({ text: t('fillRequired') });
    setBusy(true);
    try {
      if (signup) {
        const r = await signUpVendor(email.trim(), pw, {
          name: shop.name.trim(), phone: shop.phone.trim(), whatsapp: shop.whatsapp.trim() || undefined, city: shop.city, about: shop.about.trim() || undefined,
        });
        if (r.needsConfirmation) { setMsg({ text: t('checkEmail'), ok: true }); setSignup(false); }
      } else {
        await signIn(email.trim(), pw);
      }
    } catch (e) {
      setMsg({ text: String((e as Error).message ?? e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[s.panel, { padding: 18, maxWidth: 620, width: '100%', alignSelf: 'center' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="store" size={22} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{signup ? t('createVendor') : t('signIn')}</Text>
          <Muted style={{ fontSize: 12 }}>{t('customersNoAccount')}</Muted>
        </View>
      </View>
      {signup && <ShopFields v={shop} set={(k, val) => setShop((x) => ({ ...x, [k]: val }))} />}
      <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" ltr />
      <Field label={t('password')} value={pw} onChangeText={setPw} secureTextEntry hint={signup ? t('passwordHint') : undefined} ltr />
      {msg && <Text style={{ color: msg.ok ? C.success : C.danger, fontSize: 13 }}>{msg.text}</Text>}
      <Button icon={signup ? 'plus' : 'user'} title={signup ? t('createVendor') : t('signIn')} onPress={submit} disabled={busy} />
      <Pressable onPress={() => { setSignup(!signup); setMsg(null); }} style={{ alignItems: 'center', paddingVertical: 6 }}>
        <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>{signup ? t('haveAccount') : t('noAccount')}</Text>
      </Pressable>
      {mode === 'local' && (
        <View style={{ flexDirection: 'row', gap: 6 }}><Icon name="info" size={14} color={C.muted} /><Muted style={{ flex: 1, fontSize: 12 }}>{t('demoMode')}</Muted></View>
      )}
    </View>
  );
}

const channelKey: Record<Lead['channel'], StringKey> = { whatsapp: 'viaWhatsapp', call: 'viaCall', quote: 'viaQuote' };
const channelIcon: Record<Lead['channel'], IconName> = { whatsapp: 'whatsapp', call: 'phone', quote: 'cart' };

function LeadCard({ lead }: { lead: Lead }) {
  const { t } = useI18n();
  const { markRead, me } = useStore();
  const when = new Date(lead.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const reply = () => {
    if (!lead.read) markRead(lead.id);
    const msg = t('replyGreeting').replace('{name}', lead.customerName).replace('{shop}', me?.name ?? '');
    Linking.openURL(`https://wa.me/${intlPhone(lead.customerPhone)}?text=${encodeURIComponent(msg)}`);
  };
  return (
    <View style={[s.panel, !lead.read && { borderColor: C.accent, backgroundColor: '#FFFBF7' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: lead.read ? C.primarySoft : C.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={channelIcon[lead.channel]} size={18} color={lead.read ? C.primary : '#fff'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: C.text }}>{lead.customerName}</Text>
          <Text style={{ fontSize: 12, color: C.muted, direction: 'ltr', textAlign: 'auto' } as object}>{lead.customerPhone}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: C.muted }}>{when}</Text>
          <Text style={{ fontSize: 11, color: C.primary, fontWeight: '600' }}>{t(channelKey[lead.channel])}</Text>
        </View>
      </View>
      <View style={{ backgroundColor: C.bg, borderRadius: 8, padding: 8 }}>
        {lead.items.map((i, k) => (
          <Text key={k} style={{ fontSize: 13, color: C.text }} numberOfLines={1}>• {i.name}{i.sku ? ` (${i.sku})` : ''}{i.qty ? ` × ${i.qty}` : ''}</Text>
        ))}
        {lead.message ? <Text style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>“{lead.message}”</Text> : null}
      </View>
      <View style={s.row}>
        <Button small variant="whatsapp" icon="whatsapp" title={t('replyWhatsapp')} onPress={reply} />
        <Button small variant="outline" icon="phone" title={t('call')} onPress={() => { if (!lead.read) markRead(lead.id); Linking.openURL(`tel:+${intlPhone(lead.customerPhone)}`); }} />
        {!lead.read && <Button small variant="ghost" icon="check" title={t('markRead')} onPress={() => markRead(lead.id)} />}
      </View>
    </View>
  );
}

type Tab = 'inquiries' | 'products' | 'shop';

function Dashboard() {
  const { t, tl, lang } = useI18n();
  const store = useStore();
  const { me, leads, unread, products, email } = store;
  const [tab, setTab] = useState<Tab>('inquiries');
  const [shop, setShop] = useState<ShopForm>(() =>
    me ? { name: me.name, phone: me.phone, whatsapp: me.whatsapp ?? '', city: me.city, about: me.about ?? '' } : emptyShop);
  const [saved, setSaved] = useState('');
  const [notifPerm, setNotifPerm] = useState(Platform.OS === 'web' && typeof Notification !== 'undefined' ? Notification.permission : 'granted');
  if (!me) return null;
  const mine = products.filter((p) => p.vendorId === me.id);

  const tabs: [Tab, StringKey, IconName, number?][] = [
    ['inquiries', 'inquiries', 'inbox', unread], ['products', 'myProducts', 'grid', mine.length], ['shop', 'myShop', 'store'],
  ];

  return (
    <View style={{ gap: 12 }}>
      <View style={[s.panel, { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }]}>
        <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="store" size={24} color={C.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{me.name}</Text>
          <Muted style={{ fontSize: 12 }}>{email}</Muted>
        </View>
        <Button small variant="ghost" icon="store" title={t('viewShop')} onPress={() => router.push(`/vendor/${me.id}`)} />
        <Button small icon="plus" title={t('addProduct')} onPress={() => router.push('/sell')} />
      </View>

      {notifPerm === 'default' && (
        <Pressable onPress={async () => setNotifPerm(await Notification.requestPermission())}
          style={[s.panel, { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.accentSoft, borderColor: '#FCD9BD' }]}>
          <Icon name="bell" size={20} color={C.accent} />
          <Text style={{ flex: 1, color: C.text, fontSize: 13 }}>{t('contactNote')}</Text>
          <Text style={{ color: C.accent, fontWeight: '700', fontSize: 13 }}>{t('enableAlerts')}</Text>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {tabs.map(([k, label, icon, n]) => (
          <Pressable key={k} onPress={() => setTab(k)}
            style={[s.chip, { flex: 1, justifyContent: 'center', paddingVertical: 10 }, tab === k && { backgroundColor: C.primary, borderColor: C.primary }]}>
            <Icon name={icon} size={16} color={tab === k ? '#fff' : C.primary} />
            <Text style={[s.chipText, tab === k && { color: '#fff' }]}>{t(label)}</Text>
            {n ? (
              <View style={{ backgroundColor: k === 'inquiries' ? C.accent : C.primarySoft, borderRadius: 9, minWidth: 18, paddingHorizontal: 5, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: k === 'inquiries' ? '#fff' : C.primary }}>{n}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {tab === 'inquiries' && (leads.length ? leads.map((l) => <LeadCard key={l.id} lead={l} />) : (
        <View style={[s.panel, { alignItems: 'center', padding: 24 }]}>
          <Icon name="inbox" size={36} color={C.muted} strokeWidth={1.4} />
          <Muted style={{ textAlign: 'center' }}>{t('noInquiries')}</Muted>
        </View>
      ))}

      {tab === 'products' && (
        mine.length ? mine.map((p) => (
          <View key={p.id} style={[s.panel, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <Pressable onPress={() => router.push(`/product/${p.id}`)} style={{ width: 60, borderRadius: 8, overflow: 'hidden' }}>
              <ProductThumb product={p} height={60} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontWeight: '600', color: C.text, fontSize: 13 }}>{tl(p.name)}</Text>
              <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>{formatPrice(p, lang) ?? t('askPrice')}</Text>
            </View>
            <Button small variant="outline" icon="edit" title={t('edit')} onPress={() => router.push({ pathname: '/sell', params: { edit: p.id } })} />
            <Button small variant="danger" icon="trash" title="" onPress={() => confirmDelete(t('delete') + '?') && store.deleteProduct(p.id)} />
          </View>
        )) : <Muted>{t('noProducts')}</Muted>
      )}

      {tab === 'shop' && (
        <View style={s.panel}>
          <ShopFields v={shop} set={(k, val) => setShop((x) => ({ ...x, [k]: val }))} />
          <Button icon="check" title={t('save')} disabled={!shop.name.trim() || !shop.phone.trim()}
            onPress={async () => {
              await store.saveProfile({ name: shop.name.trim(), city: shop.city, phone: shop.phone.trim(), whatsapp: shop.whatsapp.trim() || undefined, about: shop.about.trim() || undefined, email: me.email });
              setSaved(t('saved'));
            }} />
          {saved ? <Text style={{ color: C.success, fontSize: 13 }}>{saved}</Text> : null}
        </View>
      )}

      <Button variant="outline" icon="logout" title={t('signOut')} onPress={store.signOut} />
    </View>
  );
}

export default function Account() {
  const { t } = useI18n();
  const { me, favorites, loading } = useStore();
  return (
    <Screen>
      <View style={[s.panel, { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }]}>
        <H style={{ fontSize: 14 }}>{t('language')}</H>
        <View style={{ flex: 1 }} />
        <LangSwitcher />
      </View>
      <Button variant="ghost" icon="heart" title={`${t('favorites')} (${favorites.length})`} onPress={() => router.push('/favorites')} />
      {loading ? null : me ? <Dashboard /> : <Auth />}
    </Screen>
  );
}
