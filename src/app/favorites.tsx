import { Muted, ProductGrid, Screen, SectionTitle } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';

export default function FavoritesScreen() {
  const { t } = useI18n();
  const { products, favorites } = useStore();
  const list = favorites.map((id) => products.find((p) => p.id === id)).filter((p) => !!p);
  return (
    <Screen>
      <SectionTitle icon="heart" title={t('favorites')} />
      {list.length ? <ProductGrid products={list} /> : <Muted>{t('emptyFavorites')}</Muted>}
    </Screen>
  );
}
