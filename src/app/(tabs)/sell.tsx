import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, View } from 'react-native';
import { Icon } from '../../components/icons';
import { Text } from '../../components/text';
import { Button, Chip, Field, H, Muted, s, Screen, Swatches } from '../../components/ui';
import { AVAILABILITY, categoriesOf, categoryById, COLOR_PALETTE, ColorOption, Currency, emptyProduct, GROUPS, Product, UNITS } from '../../lib/catalog';
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
  const { me, products } = useStore();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = edit ? products.find((x) => x.id === edit && x.vendorId === me?.id) : undefined;
  if (!me) return <SignInGate />;
  // A fresh form per product (or for a new one), so its fields start from that product.
  return <ProductForm key={`${me.id}-${editing?.id ?? 'new'}`} editing={editing} vendorId={me.id} />;
}

function SignInGate() {
  const { t } = useI18n();
    return (
      <Screen>
        <View style={[s.panel, { alignItems: 'center', padding: 28, gap: 12 }]}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="store" size={30} color={C.primary} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' }}>{t('vendorCtaTitle')}</Text>
          <Muted style={{ textAlign: 'center' }}>{t('signInToSell')}</Muted>
          <Button icon="user" title={t('createVendor')} onPress={() => router.push('/account')} />
        </View>
      </Screen>
    );
}

function ProductForm({ editing, vendorId }: { editing?: Product; vendorId: string }) {
  const { t, tl } = useI18n();
  const { addProduct, updateProduct } = useStore();
  const [p, setP] = useState<Product>(() => editing ?? emptyProduct(vendorId));
  const [nameLang, setNameLang] = useState<Lang>('ckb');
  const [price, setPrice] = useState(editing?.price != null ? String(editing.price) : '');
  const [thickness, setThickness] = useState(editing?.thickness.join(', ') ?? '');
  const [sizes, setSizes] = useState(editing?.sizes.join(', ') ?? '');
  const [minOrder, setMinOrder] = useState(editing?.minOrder ? String(editing.minOrder) : '');
  const [stockQty, setStockQty] = useState(editing?.stockQty != null ? String(editing.stockQty) : '');
  const [groupId, setGroupId] = useState((editing && categoryById(editing.categoryId)?.group) || GROUPS[0].id);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const toggleColor = (c: ColorOption) =>
    set('colors', p.colors.some((x) => x.hex === c.hex) ? p.colors.filter((x) => x.hex !== c.hex) : [...p.colors, c]);

  async function pickImage() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 6 });
    if (!r.canceled) set('images', [...p.images, ...r.assets.map((a) => a.uri)].slice(0, 6));
  }

  async function publish() {
    if (!p.categoryId || !LANGS.some((l) => p.name[l].trim())) return notify(t('required'));
    setBusy(true);
    try {
      const data: Product = {
        ...p,
        vendorId,
        price: price.trim() ? Number(price.replace(/[^\d.]/g, '')) : null,
        minOrder: minOrder ? Number(minOrder) : undefined,
        stockQty: stockQty.trim() ? Number(stockQty.replace(/\D/g, '')) : undefined,
        sku: p.sku?.trim() || undefined,
        thickness: splitList(thickness),
        sizes: splitList(sizes),
      };
      const saved = editing ? await updateProduct(data) : await addProduct(data);
      notify(editing ? t('saved') : t('published'));
      router.replace(`/product/${saved.id}`);
    } catch (e) {
      notify(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  const dirOf = (l: Lang) => ({ writingDirection: l === 'en' ? 'ltr' : 'rtl', textAlign: l === 'en' ? 'left' : 'right' }) as const;

  return (
    <Screen>
      <Stack.Screen options={{ headerTitle: editing ? t('editProduct') : t('addProduct') }} />
      <Muted>{t('sellIntro')}</Muted>

      <View style={s.panel}>
        <H style={{ fontSize: 14 }}>{t('category')}</H>
        <View style={s.row}>
          {GROUPS.map((g) => <Chip key={g.id} icon={g.id} label={tl(g.name)} active={groupId === g.id} onPress={() => setGroupId(g.id)} />)}
        </View>
        <H style={{ fontSize: 14, marginTop: 6 }}>{t('subcategory')}</H>
        <View style={s.row}>
          {categoriesOf(groupId).map((c) => (
            <Chip key={c.id} icon={c.id} label={tl(c.name)} active={p.categoryId === c.id} onPress={() => set('categoryId', c.id)} />
          ))}
        </View>
      </View>

      {/* Name + description per language; tabs keep the form short on phones */}
      <View style={s.panel}>
        <View style={s.row}>
          {LANGS.map((l) => (
            <Chip key={l} icon={p.name[l].trim() ? 'check' : undefined} label={LANG_LABEL[l]} active={nameLang === l} onPress={() => setNameLang(l)} />
          ))}
        </View>
        <Field label={`${t('productName')} (${LANG_LABEL[nameLang]})`} value={p.name[nameLang]}
          onChangeText={(v) => set('name', { ...p.name, [nameLang]: v })} style={dirOf(nameLang)} />
        <Field label={`${t('description')} (${LANG_LABEL[nameLang]})`} multiline value={p.description[nameLang]}
          onChangeText={(v) => set('description', { ...p.description, [nameLang]: v })} style={dirOf(nameLang)} />
      </View>

      <View style={s.panel}>
        <Field label={t('price')} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder={t('askPrice')} ltr />
        <H style={{ fontSize: 14 }}>{t('currency')}</H>
        <View style={s.row}>
          {(['IQD', 'USD'] as Currency[]).map((c) => <Chip key={c} label={c} active={p.currency === c} onPress={() => set('currency', c)} />)}
        </View>
        <H style={{ fontSize: 14, marginTop: 8 }}>{t('unit')}</H>
        <View style={s.row}>
          {UNITS.map((u) => <Chip key={u} label={t(unitKey(u))} active={p.unit === u} onPress={() => set('unit', u)} />)}
        </View>
        <Field label={t('minOrder')} value={minOrder} onChangeText={setMinOrder} keyboardType="numeric" style={{ marginTop: 8 }} ltr />
      </View>

      <View style={s.panel}>
        <H style={{ fontSize: 14 }}>{t('colors')}</H>
        <Swatches colors={COLOR_PALETTE} size={30} selected={p.colors.map((c) => c.hex)} onToggle={toggleColor} />
      </View>

      <View style={s.panel}>
        <Field label={t('thickness')} value={thickness} onChangeText={setThickness} hint={t('commaHint')} placeholder="2mm, 3mm, 5mm" ltr />
        <Field label={t('sizes')} value={sizes} onChangeText={setSizes} placeholder="122×244 cm, A4" ltr />
        <Field label={t('brand')} value={p.brand ?? ''} onChangeText={(v) => set('brand', v)} />
        <Field label={t('origin')} value={p.origin ?? ''} onChangeText={(v) => set('origin', v)} />
        <Field label={t('sku')} value={p.sku ?? ''} onChangeText={(v) => set('sku', v)} placeholder="AC-122" autoCapitalize="characters" ltr />
        <Field label={t('stockQty')} value={stockQty} onChangeText={setStockQty} keyboardType="numeric" ltr />
        <Text style={s.label}>{t('stock')}</Text>
        <View style={s.row}>
          {AVAILABILITY.map((a) => (
            <Chip key={a} label={t(a === 'in_stock' ? 'inStock' : a === 'custom_order' ? 'customOrder' : 'outOfStock')}
              active={p.availability === a} onPress={() => set('availability', a)} />
          ))}
        </View>
      </View>

      <View style={s.panel}>
        <H style={{ fontSize: 14 }}>{t('photos')}</H>
        <View style={s.row}>
          {p.images.map((u) => (
            <Pressable key={u} onPress={() => set('images', p.images.filter((x) => x !== u))}>
              <Image source={{ uri: u }} style={{ width: 72, height: 72, borderRadius: 8 }} />
              <View style={{ position: 'absolute', top: 4, end: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 2 }}>
                <Icon name="close" size={12} color="#fff" />
              </View>
            </Pressable>
          ))}
          <Button variant="outline" icon="camera" title={t('addPhoto')} onPress={pickImage} />
        </View>
      </View>

      <Button icon={editing ? 'check' : 'plus'} title={editing ? t('saveChanges') : t('publish')} onPress={publish} disabled={busy} />
    </Screen>
  );
}
