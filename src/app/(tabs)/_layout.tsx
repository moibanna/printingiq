import { Tabs } from 'expo-router/tabs';
import { Text, View } from 'react-native';
import { LangSwitcher, Logo, useWide, WebHeader } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

const icon = (glyph: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>
);

export default function TabsLayout() {
  const { t } = useI18n();
  const { quote } = useStore();
  const wide = useWide();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        headerTitleStyle: { fontWeight: '800', color: C.primary },
        sceneStyle: { backgroundColor: C.bg },
        headerRight: () => <View style={{ marginHorizontal: 12 }}><LangSwitcher compact /></View>,
        // Desktop website: full header instead of the app's bottom tab bar
        ...(wide ? { header: () => <WebHeader />, tabBarStyle: { display: 'none' } } : {}),
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('home'), headerTitle: () => <Logo />, tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="categories" options={{ title: t('categories'), tabBarIcon: icon('🗂️') }} />
      <Tabs.Screen
        name="quote"
        options={{ title: t('quoteList'), tabBarIcon: icon('🛒'), tabBarBadge: quote.length || undefined, tabBarBadgeStyle: { backgroundColor: C.accent } }}
      />
      <Tabs.Screen name="sell" options={{ title: t('sell'), headerTitle: t('addProduct'), tabBarIcon: icon('➕') }} />
      <Tabs.Screen name="account" options={{ title: t('account'), tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
