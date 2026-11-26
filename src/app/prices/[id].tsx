import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '../../components/icons';
import { Text } from '../../components/text';
import { Muted, ProductGrid, s, Screen } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { sortProducts } from '../../lib/query';
import { standardById } from '../../lib/standards';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

/** One standard item from every vendor that sells it, cheapest first. */
export default function ComparePrices() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, tl } = useI18n();
  const { products, exchange } = useStore();
  const item = standardById(id);
  if (!item) return <Screen><Muted>{t('noProducts')}</Muted></Screen>;
  const list = sortProducts(products.filter((p) => p.templateId === item.id), 'priceLow', exchange.iqdPerUsd);
  return (
    <Screen>
      <Stack.Screen options={{ title: t('comparePrices') }} />
      <View style={s.panel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="scale" size={20} color={C.primary} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, flex: 1 }}>{tl(item.name)}</Text>
        </View>
        <Muted style={{ fontSize: 12 }}>{t('comparePricesIntro')}</Muted>
      </View>
      {list.length ? <ProductGrid products={list} /> : <Muted>{t('noPricesYet')}</Muted>}
    </Screen>
  );
}
