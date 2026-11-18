import { View } from 'react-native';
import { Screen, SectionTitle, SubTile } from '../../components/ui';
import { categoriesOf, GROUPS } from '../../lib/catalog';
import { useI18n } from '../../lib/i18n';
import { inCategory } from '../../lib/query';
import { useStore } from '../../lib/store';

export default function Categories() {
  const { tl } = useI18n();
  const { products } = useStore();
  return (
    <Screen>
      {GROUPS.map((g) => (
        <View key={g.id} style={{ gap: 8 }}>
          <SectionTitle icon={g.id} title={tl(g.name)} href={`/category/${g.id}`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {categoriesOf(g.id).map((c) => <SubTile key={c.id} category={c} count={inCategory(products, c.id).length} />)}
          </View>
        </View>
      ))}
    </Screen>
  );
}
