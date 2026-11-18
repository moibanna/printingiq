import { Tabs } from 'expo-router/tabs';
import { View } from 'react-native';
import { Icon, IconName } from '../../components/icons';
import { LangSwitcher, Logo, useWide, WebHeader } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

const icon = (name: IconName) => {
  const TabBarIcon = ({ color, focused }: { color: unknown; focused: boolean }) => (
    <Icon name={name} size={22} color={String(color ?? C.primary)} strokeWidth={focused ? 2.2 : 1.7} />
  );
  return TabBarIcon;
};

export default function TabsLayout() {
  const { t } = useI18n();
  const { quote, unread, me } = useStore();
  const wide = useWide();
  const badge = { backgroundColor: C.accent, fontFamily: 'NotoKufiArabic_700Bold', fontSize: 10 };
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: '#98A2B3',
        // Kufi letters are taller than Latin ones: give tab labels room so they aren't clipped
        tabBarLabelStyle: { fontFamily: 'NotoKufiArabic_600SemiBold', fontSize: 10, lineHeight: 18 },
        tabBarStyle: { height: 64, paddingTop: 4 },
        headerTitleStyle: { fontFamily: 'NotoKufiArabic_700Bold', fontSize: 16, color: C.primary },
        sceneStyle: { backgroundColor: C.bg },
        headerRight: () => <View style={{ marginHorizontal: 12 }}><LangSwitcher compact /></View>,
        // Desktop website: full header instead of the app's bottom tab bar
        ...(wide ? { header: () => <WebHeader />, tabBarStyle: { display: 'none' } } : {}),
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('home'), headerTitle: () => <Logo />, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="categories" options={{ title: t('categories'), tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="quote" options={{ title: t('quoteList'), tabBarIcon: icon('cart'), tabBarBadge: quote.length || undefined, tabBarBadgeStyle: badge }} />
      <Tabs.Screen name="sell" options={{ title: t('sell'), headerTitle: t('addProduct'), tabBarIcon: icon('plus') }} />
      <Tabs.Screen
        name="account"
        options={{ title: me ? t('myShop') : t('account'), headerTitle: me ? t('dashboard') : t('vendorAccount'), tabBarIcon: icon(me ? 'store' : 'user'), tabBarBadge: unread || undefined, tabBarBadgeStyle: badge }}
      />
    </Tabs>
  );
}
