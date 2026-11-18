import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { ProductBrowser } from '../../components/browser';
import { Screen, SectionTitle } from '../../components/ui';
import { categoriesOf, categoryById, groupById } from '../../lib/catalog';
import { useI18n } from '../../lib/i18n';
import { inCategory } from '../../lib/query';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tl, arrow } = useI18n();
  const { products } = useStore();
  const group = groupById(id);
  const cat = categoryById(id);
  const parent = cat ? groupById(cat.group) : undefined;
  const title = group ? `${group.icon} ${tl(group.name)}` : cat ? `${cat.icon} ${tl(cat.name)}` : '';

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      {parent && <Text style={{ color: C.muted }}>{tl(parent.name)} {arrow}</Text>}
      <SectionTitle title={title} />
      <ProductBrowser products={inCategory(products, id)} subcategories={group ? categoriesOf(group.id) : undefined} />
    </Screen>
  );
}
