import { router, useLocalSearchParams } from 'expo-router';
import { ProductBrowser } from '../components/browser';
import { Screen, SearchBox } from '../components/ui';
import { searchProducts } from '../lib/query';
import { useStore } from '../lib/store';

export default function SearchScreen() {
  const { q = '' } = useLocalSearchParams<{ q?: string }>();
  const { products } = useStore();
  return (
    <Screen>
      <SearchBox key={q} initial={q} autoFocus={!q} onSubmit={(v) => router.setParams({ q: v })} />
      <ProductBrowser key={q} products={searchProducts(products, q)} />
    </Screen>
  );
}
