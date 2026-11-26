import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Icon, IconName } from '../components/icons';
import { Text, TextInput } from '../components/text';
import { Button, Chip, Muted, s, Screen } from '../components/ui';
import { aiMessage } from '../lib/aiMessage';
import { AiError, backend } from '../lib/backend';
import { AI_CATEGORIES, Cell, draftToProduct, fileToBase64, parseCsv, ProductDraft, readExcel, rowsToDrafts, templateCsv } from '../lib/bulkImport';
import { categoriesOf, categoryById, Currency, GROUPS } from '../lib/catalog';
import { LANG_LABEL, LANGS, StringKey, useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';

type Row = ProductDraft & { on: boolean; key: string };
const BOT_NUMBER = (process.env.EXPO_PUBLIC_WHATSAPP_BOT ?? '').replace(/\D/g, '');

function download(name: string, text: string) {
  if (Platform.OS !== 'web') return;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Vendor: add many products at once from Excel/CSV, a price list (PDF/photo/text, read by AI) or product photos. */
export default function Upload() {
  const { t, tl, lang } = useI18n();
  const { me, addProduct } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [text, setText] = useState('');
  const [pickFor, setPickFor] = useState<string | null>(null); // row key choosing a category, or '*' for all
  if (!me) return <Screen><Muted>{t('signInToSell')}</Muted><Button title={t('createVendor')} onPress={() => router.push('/account')} /></Screen>;

  const show = (drafts: ProductDraft[]) => {
    if (!drafts.length) return setMsg({ text: t('nothingFound') });
    setMsg(null);
    setRows(drafts.map((d, i) => ({ ...d, on: true, key: `${Date.now()}-${i}` })));
  };
  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ text: e instanceof AiError ? aiMessage(e, t) : String((e as Error).message ?? e) }); }
    finally { setBusy(''); }
  };

  const fromSheet = () => run(t('reading').replace('{n}', ''), async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'],
    });
    if (r.canceled) return;
    const f = r.assets[0];
    let cells: Cell[][];
    if (/\.xlsx$/i.test(f.name) || f.mimeType?.includes('spreadsheetml')) {
      try { cells = await readExcel(f.uri); } catch { throw new Error(Platform.OS === 'web' ? t('nothingFound') : t('excelOnWebsite')); }
    } else {
      cells = parseCsv(await (await fetch(f.uri)).text());
    }
    show(rowsToDrafts(cells, ''));
  });

  const fromPriceList = () => run(t('reading').replace('{n}', ''), async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
    if (r.canceled) return;
    const files = await Promise.all(r.assets.slice(0, 5).map(async (a) => ({
      mediaType: a.mimeType ?? (/\.pdf$/i.test(a.name) ? 'application/pdf' : 'image/jpeg'), data: await fileToBase64(a.uri),
    })));
    show(await backend.aiAssist({ mode: 'pricelist', files, categories: AI_CATEGORIES }));
  });

  const fromText = () => run(t('reading').replace('{n}', ''), async () => {
    show(await backend.aiAssist({ mode: 'pricelist', text, categories: AI_CATEGORIES }));
  });

  const fromPhotos = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: true, selectionLimit: 20 });
    if (r.canceled) return;
    await run('', async () => {
      const drafts: ProductDraft[] = [];
      for (const [i, a] of r.assets.entries()) {
        setBusy(t('reading').replace('{n}', `${i + 1} / ${r.assets.length}`));
        const [d] = await backend.aiAssist({ mode: 'photo', files: [{ mediaType: a.mimeType ?? 'image/jpeg', data: await fileToBase64(a.uri) }], categories: AI_CATEGORIES });
        if (d) drafts.push({ ...d, images: [a.uri] });
      }
      show(drafts);
    });
  };

  async function publish() {
    if (!rows || !me) return;
    const chosen = rows.filter((r) => r.on && r.categoryId);
    let n = 0;
    await run('', async () => {
      for (const r of chosen) {
        setBusy(t('reading').replace('{n}', `${n + 1} / ${chosen.length}`));
        await addProduct(draftToProduct(r, me.id));
        n++;
      }
      setRows(null);
      setMsg({ text: t('publishedN').replace('{n}', String(n)), ok: true });
    });
  }

  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null);
  const chosenCount = rows?.filter((r) => r.on && r.categoryId).length ?? 0;
  const missingCategory = rows?.some((r) => r.on && !r.categoryId);

  const ways: { icon: IconName; title: StringKey; sub: StringKey; action: () => void; extra?: ReactNode; ai?: boolean }[] = [
    { icon: 'file', title: 'fromExcel', sub: 'fromExcelSub', action: fromSheet,
      extra: Platform.OS === 'web' ? <Button small variant="ghost" icon="upload" title={t('downloadTemplate')} onPress={() => download('printingiq-products.csv', templateCsv())} /> : null },
    { icon: 'receipt', title: 'fromPriceList', sub: 'fromPriceListSub', action: fromPriceList, ai: true },
    { icon: 'camera', title: 'fromPhotos', sub: 'fromPhotosSub', action: fromPhotos, ai: true },
    { icon: 'link', title: 'fromLink', sub: 'fromLinkSub', action: () => router.push({ pathname: '/account', params: { tab: 'shop' } }) },
    // PrintingIQ's WhatsApp bot number (supabase/functions/whatsapp-bot), once it is set up
    ...(BOT_NUMBER ? [{ icon: 'whatsapp' as IconName, title: 'fromWhatsapp' as StringKey, sub: 'fromWhatsappSub' as StringKey,
      action: () => Linking.openURL(`https://wa.me/${BOT_NUMBER}`) }] : []),
  ];

  return (
    <Screen>
      {!rows && (
        <>
          <View style={s.panel}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{t('addMany')}</Text>
            <Muted>{t('addManyIntro')}</Muted>
          </View>
          {ways.map((w) => (
            <View key={w.title} style={[s.panel, { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }]}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: w.ai ? '#F1EBFF' : C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={w.icon} size={22} color={w.ai ? '#6B3FD1' : C.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontWeight: '700', color: C.text, fontSize: 15 }}>{t(w.title)}</Text>
                  {w.ai && <Icon name="sparkles" size={14} color="#6B3FD1" />}
                </View>
                <Muted style={{ fontSize: 12 }}>{t(w.sub)}</Muted>
              </View>
              <View style={s.row}>
                {w.extra}
                <Button small variant={w.icon === 'whatsapp' ? 'whatsapp' : 'primary'} icon={w.icon === 'link' || w.icon === 'whatsapp' ? w.icon : 'upload'} title={w.icon === 'camera' ? t('choosePhotos') : w.icon === 'link' ? t('importLink') : w.icon === 'whatsapp' ? t('openWhatsapp') : t('chooseFile')} onPress={w.action} disabled={!!busy} />
              </View>
            </View>
          ))}
          <View style={s.panel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="message" size={18} color="#6B3FD1" />
              <Text style={{ fontWeight: '700', color: C.text, fontSize: 15 }}>{t('fromText')}</Text>
              <Icon name="sparkles" size={14} color="#6B3FD1" />
            </View>
            <Muted style={{ fontSize: 12 }}>{t('fromTextSub')}</Muted>
            <TextInput value={text} onChangeText={setText} multiline placeholder={t('pasteHere')}
              style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]} />
            <Button small icon="sparkles" title={t('readList')} onPress={fromText} disabled={!!busy || text.trim().length < 3} />
          </View>
        </>
      )}

      {busy ? (
        <View style={[s.panel, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <ActivityIndicator color={C.primary} />
          <Text style={{ color: C.text }}>{busy}</Text>
        </View>
      ) : null}
      {msg && (
        <View style={[s.panel, { backgroundColor: msg.ok ? '#ECFDF3' : '#FEF3F2', borderColor: msg.ok ? '#ABEFC6' : '#FECDCA' }]}>
          <Text style={{ color: msg.ok ? C.success : C.danger, fontSize: 13 }}>{msg.text}</Text>
          {msg.ok && <Button small variant="ghost" icon="grid" title={t('myProducts')} onPress={() => router.push({ pathname: '/account', params: { tab: 'products' } })} />}
        </View>
      )}

      {rows && (
        <>
          <View style={s.panel}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{t('reviewTitle')}</Text>
            <Muted>{t('reviewIntro').replace('{n}', String(rows.length))}</Muted>
            {missingCategory && (
              <Button small variant="outline" icon="grid" title={t('categoryForAll')} onPress={() => setPickFor('*')} />
            )}
          </View>
          {rows.map((r) => {
            const cat = categoryById(r.categoryId);
            // Edit the name in the page's language when it has one, otherwise in the language it was written in
            const nl = r.name[lang] ? lang : LANGS.find((l) => r.name[l]) ?? lang;
            return (
              <View key={r.key} style={[s.panel, !r.on && { opacity: 0.55 }]}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Pressable onPress={() => set(r.key, { on: !r.on })} accessibilityRole="checkbox" accessibilityState={{ checked: r.on }}
                    style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: r.on ? C.primary : '#B8C2CF',
                      backgroundColor: r.on ? C.primary : '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                    {r.on && <Icon name="check" size={15} color="#fff" strokeWidth={3} />}
                  </Pressable>
                  {r.images?.[0] && <Image source={{ uri: r.images[0] }} style={{ width: 64, height: 64, borderRadius: 8 }} />}
                  <View style={{ flex: 1, gap: 4 }}>
                    <TextInput value={r.name[nl]} onChangeText={(v) => set(r.key, { name: { ...r.name, [nl]: v } })}
                      style={[s.input, { fontWeight: '600', writingDirection: nl === 'en' ? 'ltr' : 'rtl', textAlign: nl === 'en' ? 'left' : 'right' }]} />
                    <Muted style={{ fontSize: 11 }}>
                      {LANGS.filter((l) => l !== nl && r.name[l]).map((l) => `${LANG_LABEL[l]}: ${r.name[l]}`).join('  ·  ')}
                    </Muted>
                  </View>
                </View>
                <View style={[s.row, { paddingStart: 34 }]}>
                  <TextInput value={r.price != null ? String(r.price) : ''} keyboardType="numeric" placeholder={t('askPrice')}
                    onChangeText={(v) => set(r.key, { price: v.trim() ? Number(v.replace(/[^\d.]/g, '')) || null : null })}
                    style={[s.input, { width: 120, paddingVertical: 6, direction: 'ltr', textAlign: 'left' } as object]} />
                  {(['IQD', 'USD'] as Currency[]).map((c) => <Chip key={c} label={c === 'USD' ? '$' : 'IQD'} active={r.currency === c} onPress={() => set(r.key, { currency: c })} />)}
                  <Pressable onPress={() => setPickFor(r.key)}
                    style={[s.chip, !cat && { borderColor: C.danger }]}>
                    <Icon name={cat ? cat.id : 'grid'} size={14} color={cat ? C.primary : C.danger} />
                    <Text style={[s.chipText, !cat && { color: C.danger }]}>{cat ? tl(cat.name) : t('chooseCategory')}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          <View style={[s.panel, { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }]}>
            <Button icon="check" title={t('publishN').replace('{n}', String(chosenCount))} onPress={publish} disabled={!!busy || !chosenCount} />
            <Button variant="ghost" icon="refresh" title={t('startOver')} onPress={() => setRows(null)} />
          </View>
        </>
      )}

      <Modal visible={!!pickFor} transparent animationType="fade" onRequestClose={() => setPickFor(null)}>
        <Pressable onPress={() => setPickFor(null)} style={{ flex: 1, backgroundColor: 'rgba(16,24,40,0.5)', justifyContent: 'center', padding: 16 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, maxWidth: 560, width: '100%', alignSelf: 'center', maxHeight: '85%' }}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: C.text }}>{t('chooseCategory')}</Text>
              {GROUPS.map((g) => (
                <View key={g.id} style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: C.muted, fontWeight: '700' }}>{tl(g.name)}</Text>
                  <View style={s.row}>
                    {categoriesOf(g.id).map((c) => (
                      <Chip key={c.id} icon={c.id} label={tl(c.name)} onPress={() => {
                        if (pickFor === '*') setRows((rs) => rs?.map((r) => (r.categoryId ? r : { ...r, categoryId: c.id })) ?? null);
                        else if (pickFor) set(pickFor, { categoryId: c.id });
                        setPickFor(null);
                      }} />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
