import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { backend } from '../lib/backend';
import { categoryById, Currency, emptyProduct, GROUPS, Product, ShopLink } from '../lib/catalog';
import { formatPrice, roundShopPrice, unitKey } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { foldText } from '../lib/query';
import { STANDARD_ITEMS, StandardItem } from '../lib/standards';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { Icon } from './icons';
import { Text, TextInput } from './text';
import { Button, Chip, Field, Muted, s } from './ui';

type Row = { on: boolean; price: string; currency: Currency };
const parsePrice = (v: string) => (v.trim() ? Number(v.replace(/[^\d.]/g, '')) || null : null);

/**
 * Vendor dashboard → Price list: tick the standard items you sell and type a price. Each ticked item becomes a product
 * in the shop (with templateId), so a whole shop is listed in minutes and customers can compare prices.
 */
export function PriceListEditor({ vendorId, startGroup = null }: { vendorId: string; startGroup?: string | null }) {
  const { t, tl } = useI18n();
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const existing = useMemo(() => {
    const m: Record<string, Product> = {};
    for (const p of products) if (p.vendorId === vendorId && p.templateId) m[p.templateId] = p;
    return m;
  }, [products, vendorId]);
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(Object.entries(existing).map(([k, p]) => [k, { on: true, price: p.price != null ? String(p.price) : '', currency: p.currency }])));
  const [group, setGroup] = useState<string | null>(startGroup);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const row = (id: string): Row => rows[id] ?? { on: false, price: '', currency: 'IQD' };
  const setRow = (id: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...row(id), ...patch } }));
  const groupOf = (it: StandardItem) => categoryById(it.categoryId)?.group ?? '';
  const words = foldText(q).split(/\s+/).filter(Boolean);
  const shown = STANDARD_ITEMS.filter((it) => (!group || groupOf(it) === group) &&
    words.every((w) => foldText(`${it.name.en} ${it.name.ar} ${it.name.ckb}`).includes(w)));
  const groups = GROUPS.filter((g) => STANDARD_ITEMS.some((it) => groupOf(it) === g.id));
  const selected = STANDARD_ITEMS.filter((it) => row(it.id).on).length;

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      for (const it of STANDARD_ITEMS) {
        const r = row(it.id);
        const old = existing[it.id];
        const price = parsePrice(r.price);
        if (r.on && old) {
          if (old.price !== price || old.currency !== r.currency) await updateProduct({ ...old, price, currency: r.currency });
        } else if (r.on) {
          await addProduct({
            ...emptyProduct(vendorId), templateId: it.id, categoryId: it.categoryId, unit: it.unit,
            name: { ...it.name }, description: it.note ? { ...it.note } : { en: '', ar: '', ckb: '' },
            price, currency: r.currency, availability: 'custom_order',
          });
        } else if (old) {
          await deleteProduct(old.id);
        }
      }
      setMsg(t('priceListSaved').replace('{n}', String(selected)));
    } catch (e) {
      setMsg(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={s.panel}>
        <Muted>{t('priceListIntro')}</Muted>
        <Field label={t('filterItems')} value={q} onChangeText={setQ} />
        <View style={s.row}>
          <Chip label={t('allCurrencies')} active={!group} onPress={() => setGroup(null)} />
          {groups.map((g) => <Chip key={g.id} icon={g.id} label={tl(g.name)} active={group === g.id} onPress={() => setGroup(g.id)} />)}
        </View>
      </View>

      <View style={[s.panel, { padding: 0, gap: 0 }]}>
        {shown.map((it, k) => {
          const r = row(it.id);
          return (
            <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, flexWrap: 'wrap',
              borderTopWidth: k ? 1 : 0, borderColor: C.border, backgroundColor: r.on ? '#F5FAFF' : undefined }}>
              <Pressable onPress={() => setRow(it.id, { on: !r.on })} accessibilityRole="checkbox" accessibilityState={{ checked: r.on }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: r.on ? C.primary : '#B8C2CF',
                  backgroundColor: r.on ? C.primary : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  {r.on && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
                </View>
                <Icon name={it.categoryId} size={18} color={C.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: C.text, fontWeight: r.on ? '600' : '400' }}>{tl(it.name)}</Text>
                  <Muted style={{ fontSize: 11 }}>{it.note ? tl(it.note) : t(unitKey(it.unit))}</Muted>
                </View>
              </Pressable>
              {r.on && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput value={r.price} onChangeText={(v) => setRow(it.id, { price: v })} keyboardType="numeric" placeholder={t('askPrice')}
                    style={[s.input, { width: 120, paddingVertical: 6, direction: 'ltr', textAlign: 'left' } as object]} />
                  {(['IQD', 'USD'] as Currency[]).map((c) => (
                    <Chip key={c} label={c === 'USD' ? '$' : 'IQD'} active={r.currency === c} onPress={() => setRow(it.id, { currency: c })} />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={[s.panel, { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }]}>
        <Text style={{ flex: 1, color: C.text, fontWeight: '600' }}>{t('selectedCount').replace('{n}', String(selected))}</Text>
        <Button icon="check" title={t('savePriceList')} onPress={save} disabled={busy} />
      </View>
      {msg ? <Text style={{ color: C.success, fontSize: 13 }}>{msg}</Text> : null}
    </View>
  );
}

/** "Change all prices by 5%": for when the dollar moves or costs go up. */
export function BulkPriceChange({ products }: { products: Product[] }) {
  const { t, lang } = useI18n();
  const { updateProduct } = useStore();
  const [pct, setPct] = useState('');
  const [cur, setCur] = useState<Currency | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const target = products.filter((p) => p.price != null && (!cur || p.currency === cur));
  const n = Number(pct.replace('٫', '.').replace(/[^\d.-]/g, ''));
  const valid = pct.trim() !== '' && Number.isFinite(n) && n !== 0 && n > -90 && n < 500;
  const example = target[0] && valid ? { ...target[0], price: roundShopPrice(target[0].price! * (1 + n / 100), target[0].currency) } : null;

  async function apply() {
    setBusy(true);
    try {
      for (const p of target) await updateProduct({ ...p, price: roundShopPrice(p.price! * (1 + n / 100), p.currency) });
      setMsg(t('pricesChanged').replace('{n}', String(target.length)));
      setPct('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.panel}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="refresh" size={18} color={C.primary} />
        <Text style={{ fontWeight: '700', color: C.text }}>{t('changePrices')}</Text>
      </View>
      <Muted style={{ fontSize: 12 }}>{t('changePricesHint')}</Muted>
      <View style={[s.row, { alignItems: 'flex-end' }]}>
        <View style={{ width: 130 }}><Field label={t('percent')} value={pct} onChangeText={setPct} keyboardType="numbers-and-punctuation" placeholder="5" ltr /></View>
        <View style={{ gap: 6, marginBottom: 12 }}>
          <Text style={s.label}>{t('onlyCurrency')}</Text>
          <View style={s.row}>
            <Chip label={t('allCurrencies')} active={!cur} onPress={() => setCur(null)} />
            <Chip label="IQD" active={cur === 'IQD'} onPress={() => setCur('IQD')} />
            <Chip label="$" active={cur === 'USD'} onPress={() => setCur('USD')} />
          </View>
        </View>
      </View>
      {example && (
        <Muted style={{ fontSize: 12 }}>
          {formatPrice(target[0], lang)} → {formatPrice(example, lang)}
        </Muted>
      )}
      <Button small icon="check" title={t('applyChange').replace('{n}', String(target.length))} onPress={apply} disabled={!valid || busy || !target.length} />
      {msg ? <Text style={{ color: C.success, fontSize: 13 }}>{msg}</Text> : null}
    </View>
  );
}

const statusKey = { pending: 'linkPending', approved: 'linkApproved', rejected: 'linkRejected' } as const;
const statusColor = { pending: C.accent, approved: C.success, rejected: C.danger } as const;

/** Vendor dashboard → My shop: import my shop from a link, or claim a shop PrintingIQ already imports. */
export function ShopLinks() {
  const { t } = useI18n();
  const { vendors } = useStore();
  const [links, setLinks] = useState<ShopLink[] | null>(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    backend.listMyLinks().then((l) => { if (alive) setLinks(l); }).catch(() => { if (alive) setLinks([]); });
    return () => { alive = false; };
  }, [reload]);

  async function send() {
    setErr('');
    const u = url.trim();
    if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(u)) return setErr(t('linkBad'));
    if (/facebook\.com|fb\.com|wa\.me|whatsapp\.com|opensooq/i.test(u)) return setErr(t('linkUnsupported'));
    await backend.addLink({ kind: 'import', url: /^https?:\/\//i.test(u) ? u : `https://${u}` });
    setUrl('');
    setReload((n) => n + 1);
  }
  async function claim(sourceId: string) {
    await backend.addLink({ kind: 'claim', sourceId });
    setReload((n) => n + 1);
  }
  async function remove(id: string) {
    await backend.removeLink(id);
    setReload((n) => n + 1);
  }

  const imported = Object.values(vendors).filter((v) => v.imported);
  const claimedIds = new Set((links ?? []).filter((l) => l.kind === 'claim').map((l) => l.sourceId));
  return (
    <View style={{ gap: 10 }}>
      <View style={s.panel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="link" size={18} color={C.primary} />
          <Text style={{ fontWeight: '700', color: C.text }}>{t('importLink')}</Text>
        </View>
        <Muted style={{ fontSize: 12 }}>{t('importLinkSub')}</Muted>
        <TextInput value={url} onChangeText={setUrl} placeholder={t('linkPlaceholder')} autoCapitalize="none" keyboardType="url"
          style={[s.input, { direction: 'ltr', textAlign: 'left' } as object]} />
        {err ? <Text style={{ color: C.danger, fontSize: 13 }}>{err}</Text> : null}
        <Button small icon="send" title={t('sendLink')} onPress={send} disabled={!url.trim()} />
        {(links ?? []).map((l) => (
          <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 8, padding: 8, flexWrap: 'wrap' }}>
            <Icon name={l.kind === 'claim' ? 'store' : 'link'} size={15} color={C.muted} />
            <View style={{ flex: 1, minWidth: 180 }}>
              <Text numberOfLines={1} style={{ fontSize: 13, color: C.text, direction: 'ltr' } as object}>
                {l.kind === 'claim' ? vendors[l.sourceId ?? '']?.name ?? l.sourceId : l.url}
              </Text>
              <Text style={{ fontSize: 11, color: statusColor[l.status], fontWeight: '700' }}>{t(statusKey[l.status])}</Text>
              {l.lastResult ? <Muted style={{ fontSize: 11 }}>{t('lastImport').replace('{r}', `${l.lastResult}${l.syncedAt ? ` · ${l.syncedAt.slice(0, 10)}` : ''}`)}</Muted> : null}
            </View>
            <Button small variant="ghost" icon="trash" title={t('remove')} onPress={() => remove(l.id)} />
          </View>
        ))}
      </View>

      {imported.length > 0 && (
        <View style={s.panel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="store" size={18} color={C.primary} />
            <Text style={{ fontWeight: '700', color: C.text }}>{t('claimShop')}</Text>
          </View>
          <Muted style={{ fontSize: 12 }}>{t('claimShopSub')}</Muted>
          {imported.map((v) => (
            <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ flex: 1, color: C.text, fontSize: 13 }}>{v.name}{v.city ? ` · ${v.city}` : ''}</Text>
              {claimedIds.has(v.id)
                ? <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>{t('linkPending')}</Text>
                : <Button small variant="outline" icon="check" title={t('claimThis')} onPress={() => claim(v.id)} />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
