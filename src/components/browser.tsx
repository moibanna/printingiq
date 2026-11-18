import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from './text';
import { Category, ColorOption, Product } from '../lib/catalog';
import { useI18n } from '../lib/i18n';
import { inCategory, Sort, SORT_LABEL, SORTS, sortProducts } from '../lib/query';
import { C } from '../lib/theme';
import { Button, Chip, ProductGrid } from './ui';

const PAGE = 40;

/** Product list with sorting, an optional subcategory row and a color filter built from the listed products. */
export function ProductBrowser({ products, subcategories }: { products: Product[]; subcategories?: Category[] }) {
  const { t, tl } = useI18n();
  const [sort, setSort] = useState<Sort>('newest');
  const [sub, setSub] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const base = sub ? inCategory(products, sub) : products;
  const colors = useMemo(() => {
    const m = new Map<string, ColorOption>();
    base.forEach((p) => p.colors.forEach((c) => m.set(c.hex, c)));
    return [...m.values()];
  }, [base]);
  const shown = sortProducts(color ? base.filter((p) => p.colors.some((c) => c.hex === color)) : base, sort);

  return (
    <View style={{ gap: 10 }}>
      {subcategories && subcategories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={t('all')} active={!sub} onPress={() => { setSub(null); setLimit(PAGE); }} />
          {subcategories.map((c) => (
            <Chip key={c.id} icon={c.id} label={tl(c.name)} active={sub === c.id} onPress={() => { setSub(c.id); setColor(null); setLimit(PAGE); }} />
          ))}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 13 }}>{t('sortBy')}:</Text>
        {SORTS.map((x) => <Chip key={x} label={t(SORT_LABEL[x])} active={sort === x} onPress={() => { setSort(x); setLimit(PAGE); }} />)}
      </ScrollView>
      {colors.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>{t('colors')}:</Text>
          {colors.map((c) => (
            <Chip key={c.hex} dot={c.hex} label={tl(c.name)} active={color === c.hex} onPress={() => { setColor(color === c.hex ? null : c.hex); setLimit(PAGE); }} />
          ))}
        </ScrollView>
      )}
      <Text style={{ color: C.muted, fontSize: 13 }}>{shown.length} {t('results')}</Text>
      <ProductGrid products={shown.slice(0, limit)} />
      {shown.length > limit && (
        <Button variant="ghost" title={`${t('showMore')} (${shown.length - limit})`} onPress={() => setLimit((n) => n + PAGE)} style={{ alignSelf: 'center', minWidth: 220 }} />
      )}
    </View>
  );
}
