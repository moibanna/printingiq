import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useWide, WebHeader } from '../components/ui';
import { I18nProvider, useI18n } from '../lib/i18n';
import { StoreProvider } from '../lib/store';
import { C } from '../lib/theme';

function Root() {
  const { rtl, t } = useI18n();
  const wide = useWide();
  return (
    // `direction` flips every row/margin/padding for Kurdish & Arabic without restarting the app.
    <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr', backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTitleStyle: { fontWeight: '700' },
          headerTintColor: C.primary,
          contentStyle: { backgroundColor: C.bg },
          headerBackButtonDisplayMode: 'minimal',
          ...(wide ? { header: () => <WebHeader /> } : {}),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'PrintingIQ' }} />
        <Stack.Screen name="category/[id]" options={{ title: t('categories') }} />
        <Stack.Screen name="product/[id]" options={{ title: '' }} />
        <Stack.Screen name="search" options={{ title: t('allProducts') }} />
        <Stack.Screen name="favorites" options={{ title: t('favorites') }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </I18nProvider>
  );
}
