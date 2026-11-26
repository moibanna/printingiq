import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../components/icons';
import { Text } from '../../components/text';
import { Chip, Field, Muted, s, Screen } from '../../components/ui';
import { categoryById, GROUPS, Product } from '../../lib/catalog';
import { formatPrice, priceInIQD } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { foldText } from '../../lib/query';
import { STANDARD_ITEMS } from '../../lib/standards';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

/** Standard items with prices from several vendors: lowest price and how many vendors sell it. */
export default function Prices() {
  const { t, tl, lang, arrow } = useI18n();
  const { products, exchange } = useStore();
  const [group, setGroup] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const byTemplate = useMemo(() => {
    const m: Record<string, Product[]> = {};
    for (const p of products) if (p.templateId) (m[p.templateId] ??= []).push(p);
    return m;
  }, [products]);
  const words = foldText(q).split(/\s+/).filter(Boolean);
  const items = STANDARD_ITEMS.filter((it) => byTemplate[it.id]?.length &&
    (!group || categoryById(it.categoryId)?.group === group) &&
    words.every((w) => foldText(`${it.name.en} ${it.name.ar} ${it.name.ckb}`).includes(w)));
  const groups = GROUPS.filter((g) => STANDARD_ITEMS.some((it) => byTemplate[it.id]?.length && categoryById(it.categoryId)?.group === g.id));

  return (
    <Screen>
      <View style={s.panel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="scale" size={22} color={C.primary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{t('comparePrices')}</Text>
        </View>
        <Muted>{t('comparePricesIntro')}</Muted>
        <Field label={t('filterItems')} value={q} onChangeText={setQ} />
        <View style={s.row}>
          <Chip label={t('allCurrencies')} active={!group} onPress={() => setGroup(null)} />
          {groups.map((g) => <Chip key={g.id} icon={g.id} label={tl(g.name)} active={group === g.id} onPress={() => setGroup(g.id)} />)}
        </View>
      </View>
      {!items.length && <Muted>{t('noPricesYet')}</Muted>}
      <View style={[s.panel, { padding: 0, gap: 0 }]}>
        {items.map((it, k) => {
          const list = byTemplate[it.id];
          const priced = list.filter((p) => p.price != null).sort((a, b) => priceInIQD(a, exchange)! - priceInIQD(b, exchange)!);
          const vendorsN = new Set(list.map((p) => p.vendorId)).size;
          return (
            <Link key={it.id} href={`/prices/${it.id}`} asChild>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: k ? 1 : 0, borderColor: C.border }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={it.categoryId} size={19} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{tl(it.name)}</Text>
                  <Muted style={{ fontSize: 12 }}>{t('vendorsCount').replace('{n}', String(vendorsN))}{it.note ? ` · ${tl(it.note)}` : ''}</Muted>
                </View>
                {priced[0] && (
                  <Text style={{ color: C.success, fontWeight: '700', fontSize: 13 }}>{t('fromPrice').replace('{price}', formatPrice(priced[0], lang) ?? '')}</Text>
                )}
                <Text style={{ color: C.muted }}>{arrow}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </Screen>
  );
}
