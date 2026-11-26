import { ActivityIndicator, View } from 'react-native';
import { GroupTile, HeroSlider, ProductGrid, QuickActions, RateBadge, Screen, SearchBox, SectionTitle, useColumns, useWide, VendorCta } from '../../components/ui';
import { GROUPS } from '../../lib/catalog';
import { useI18n } from '../../lib/i18n';
import { inCategory, sortProducts } from '../../lib/query';
import { useStore } from '../../lib/store';

export default function Home() {
  const { t } = useI18n();
  const { products, loading, exchange } = useStore();
  const wide = useWide();
  const cols = useColumns();
  const groupCols = wide ? 4 : 2;
  const latest = sortProducts(products, 'newest', exchange.iqdPerUsd).slice(0, cols * 2);

  return (
    <Screen>
      {!wide && <SearchBox />}
      {!wide && <RateBadge />}
      <HeroSlider />
      <QuickActions items={[
        { icon: 'scale', title: t('comparePrices'), sub: t('comparePricesSub'), href: '/prices' },
      ]} />

      <SectionTitle title={t('categories')} href="/categories" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
        {GROUPS.map((g) => (
          <View key={g.id} style={{ width: `${100 / groupCols}%`, padding: 6 }}>
            <GroupTile group={g} count={inCategory(products, g.id).length} />
          </View>
        ))}
      </View>

      <SectionTitle title={t('latest')} href="/search" />
      {loading ? <ActivityIndicator /> : <ProductGrid products={latest} />}

      <VendorCta />
    </Screen>
  );
}
