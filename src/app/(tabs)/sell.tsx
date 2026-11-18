import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, Text, View } from 'react-native';
import { Button, Chip, Field, H, Muted, s, Screen, Swatches } from '../../components/ui';
import { AVAILABILITY, categoriesOf, categoryById, COLOR_PALETTE, ColorOption, Currency, emptyProduct, GROUPS, UNITS } from '../../lib/catalog';
import { unitKey } from '../../lib/format';
import { Lang, LANG_LABEL, LANGS, useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

const splitList = (v: string) => v.split(/[,،]/).map((x) => x.trim()).filter(Boolean);

function notify(msg: string) {
  if (Platform.OS === 'web') window.alert(msg);
  else Alert.alert(msg);
}

export default function Sell() {
  const { t, tl } = useI18n();
  const { me, addProduct } = useStore();
  const [p, setP] = useState(() => emptyProduct(me?.id ?? ''));
  const [nameLang, setNameLang] = useState<Lang>('ckb');
  const [price, setPrice] = useState('');
  const [thickness, setThickness] = useState('');
  const [sizes, setSizes] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP((x) => ({ ...x, [k]: v }));
  const toggleColor = (c: ColorOption) =>
    set('colors', p.colors.some((x) => x.hex === c.hex) ? p.colors.filter((x) => x.hex !== c.hex) : [...p.colors, c]);

  async function pickImage() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 6 });
    if (!r.canceled) set('images', [...p.images, ...r.assets.map((a) => a.uri)].slice(0, 6));
  }

  async function publish() {
    if (!me) return notify(t('needProfile'));
    if (!p.categoryId || !LANGS.some((l) => p.name[l].trim())) return notify(t('required'));
    setBusy(true);
    try {
      const saved = await addProduct({
        ...p,
        vendorId: me.id,
        price: price.trim() ? Number(price.replace(/[^\d.]/g, '')) : null,
        minOrder: minOrder ? Number(minOrder) : undefined,
        stockQty: stockQty.trim() ? Number(stockQty.replace(/\D/g, '')) : undefined,
        sku: p.sku?.trim() || undefined,
        thickness: splitList(thickness),
        sizes: splitList(sizes),
      });
      notify(t('published'));
      setP(emptyProduct(me.id)); setPrice(''); setThickness(''); setSizes(''); setMinOrder(''); setStockQty('');
      router.push(`/product/${saved.id}`);
    } catch (e) {
      notify(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Muted>{t('sellIntro')}</Muted>
      {!me && (
        <Pressable onPress={() => router.push('/account')} style={[s.panel, { backgroundColor: '#FFFAEB', borderColor: '#FEDF89' }]}>
          <Text style={{ color: C.warning, fontWeight: '600' }}>⚠️ {t('needProfile')}</Text>
        </Pressable>
      )}

      <View style={s.panel}>
        <H style={{ fontSize: 15 }}>{t('category')}</H>
        <View style={s.row}>
          {GROUPS.map((g) => (
            <Chip key={g.id} label={`${g.icon} ${tl(g.name)}`} active={groupId === g.id} onPress={() => setGroupId(g.id)} />
          ))}
        </View>
        <H style={{ fontSize: 15, marginTop: 6 }}>{t('subcategory')}</H>
        <View style={s.row}>
          {categoriesOf(groupId).map((c) => (
            <Chip key={c.id} label={`${c.icon} ${tl(c.name)}`} active={p.categoryId === c.id} onPress={() => set('categoryId', c.id)} />
          ))}
        </View>
        {p.categoryId && categoryById(p.categoryId)?.group !== groupId ? (
          <Muted>✓ {tl(categoryById(p.categoryId)!.name)}</Muted>
        ) : null}
      </View>

      {/* Name + description per language, switchable tabs so the form stays short on phones */}
      <View style={s.panel}>
        <View style={s.row}>
          {LANGS.map((l) => (
            <Chip key={l} label={`${LANG_LABEL[l]}${p.name[l].trim() ? ' ✓' : ''}`} active={nameLang === l} onPress={() => setNameLang(l)} />
          ))}
        </View>
        <Field
          label={`${t('productName')} (${LANG_LABEL[nameLang]})`}
          value={p.name[nameLang]}
          onChangeText={(v) => set('name', { ...p.name, [nameLang]: v })}
          style={{ writingDirection: nameLang === 'en' ? 'ltr' : 'rtl', textAlign: nameLang === 'en' ? 'left' : 'right' }}
        />
        <Field
          label={`${t('description')} (${LANG_LABEL[nameLang]})`}
          multiline
          value={p.description[nameLang]}
          onChangeText={(v) => set('description', { ...p.description, [nameLang]: v })}
          style={{ writingDirection: nameLang === 'en' ? 'ltr' : 'rtl', textAlign: nameLang === 'en' ? 'left' : 'right' }}
        />
      </View>

      <View style={s.panel}>
        <Field label={t('price')} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder={t('askPrice')} />
        <H style={{ fontSize: 15 }}>{t('currency')}</H>
        <View style={s.row}>
          {(['IQD', 'USD'] as Currency[]).map((c) => <Chip key={c} label={c} active={p.currency === c} onPress={() => set('currency', c)} />)}
        </View>
        <H style={{ fontSize: 15, marginTop: 8 }}>{t('unit')}</H>
        <View style={s.row}>
          {UNITS.map((u) => <Chip key={u} label={t(unitKey(u))} active={p.unit === u} onPress={() => set('unit', u)} />)}
        </View>
        <Field label={t('minOrder')} value={minOrder} onChangeText={setMinOrder} keyboardType="numeric" style={{ marginTop: 8 }} />
      </View>

      <View style={s.panel}>
        <H style={{ fontSize: 15 }}>{t('colors')}</H>
        <Swatches colors={COLOR_PALETTE} size={30} selected={p.colors.map((c) => c.hex)} onToggle={toggleColor} />
      </View>

      <View style={s.panel}>
        <Field label={t('thickness')} value={thickness} onChangeText={setThickness} hint={t('commaHint')} placeholder="2mm, 3mm, 5mm" />
        <Field label={t('sizes')} value={sizes} onChangeText={setSizes} placeholder="122×244 cm, A4" />
        <Field label={t('brand')} value={p.brand ?? ''} onChangeText={(v) => set('brand', v)} />
        <Field label={t('origin')} value={p.origin ?? ''} onChangeText={(v) => set('origin', v)} />
        <Field label={t('sku')} value={p.sku ?? ''} onChangeText={(v) => set('sku', v)} placeholder="AC-122" autoCapitalize="characters" />
        <Field label={t('stockQty')} value={stockQty} onChangeText={setStockQty} keyboardType="numeric" />
        <Text style={s.label}>{t('stock')}</Text>
        <View style={s.row}>
          {AVAILABILITY.map((a) => (
            <Chip key={a} label={t(a === 'in_stock' ? 'inStock' : a === 'custom_order' ? 'customOrder' : 'outOfStock')}
              active={p.availability === a} onPress={() => set('availability', a)} />
          ))}
        </View>
      </View>

      <View style={s.panel}>
        <H style={{ fontSize: 15 }}>{t('photos')}</H>
        <View style={s.row}>
          {p.images.map((u) => (
            <Pressable key={u} onLongPress={() => set('images', p.images.filter((x) => x !== u))}>
              <Image source={{ uri: u }} style={{ width: 72, height: 72, borderRadius: 8 }} />
            </Pressable>
          ))}
          <Button variant="outline" title={`📷 ${t('addPhoto')}`} onPress={pickImage} />
        </View>
      </View>

      <Button title={t('publish')} onPress={publish} disabled={busy} />
    </Screen>
  );
}
