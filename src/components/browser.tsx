import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Category, ColorOption, Product } from '../lib/catalog';
import { useI18n } from '../lib/i18n';
import { inCategory, Sort, SORT_LABEL, SORTS, sortProducts } from '../lib/query';
import { C } from '../lib/theme';
import { Chip, ProductGrid } from './ui';

/** Product list with sorting, an optional subcategory row and a color filter built from the listed products. */
export function ProductBrowser({ products, subcategories }: { products: Product[]; subcategories?: Category[] }) {
  const { t, tl } = useI18n();
  const [sort, setSort] = useState<Sort>('newest');
  const [sub, setSub] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

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
          <Chip label={t('all')} active={!sub} onPress={() => setSub(null)} />
          {subcategories.map((c) => (
            <Chip key={c.id} label={`${c.icon} ${tl(c.name)}`} active={sub === c.id} onPress={() => { setSub(c.id); setColor(null); }} />
          ))}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 13 }}>{t('sortBy')}:</Text>
        {SORTS.map((x) => <Chip key={x} label={t(SORT_LABEL[x])} active={sort === x} onPress={() => setSort(x)} />)}
      </ScrollView>
      {colors.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>{t('colors')}:</Text>
          {colors.map((c) => (
            <Chip key={c.hex} dot={c.hex} label={tl(c.name)} active={color === c.hex} onPress={() => setColor(color === c.hex ? null : c.hex)} />
          ))}
        </ScrollView>
      )}
      <Text style={{ color: C.muted, fontSize: 13 }}>{shown.length} {t('results')}</Text>
      <ProductGrid products={shown} />
    </View>
  );
}
