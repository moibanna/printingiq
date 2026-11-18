import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ProductBrowser } from '../../components/browser';
import { ContactSheet } from '../../components/contact';
import { Icon } from '../../components/icons';
import { Text } from '../../components/text';
import { Button, cityName, Muted, s, Screen } from '../../components/ui';
import { intlPhone } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

export default function VendorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, tl } = useI18n();
  const { vendors, products, me } = useStore();
  const [contact, setContact] = useState(false);
  const v = vendors[id];
  if (!v) return <Screen><Muted>{t('noProducts')}</Muted></Screen>;
  const list = products.filter((p) => p.vendorId === v.id);

  return (
    <Screen>
      <Stack.Screen options={{ title: v.name }} />
      <View style={[s.panel, { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: 18 }]}>
        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="store" size={32} color={C.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: C.text }}>{v.name}</Text>
            {v.verified && <Icon name="verified" size={18} color={C.success} />}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="pin" size={14} color={C.muted} /><Muted>{cityName(v.city, tl)}</Muted>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="whatsapp" size={14} color={C.success} />
              <Text style={{ direction: 'ltr', fontSize: 13, color: C.text } as object}>+{intlPhone(v.whatsapp || v.phone)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="grid" size={14} color={C.muted} /><Muted>{list.length} {t('productsCount')}</Muted>
            </View>
          </View>
          {v.about ? <Text style={{ color: C.text, fontSize: 13, lineHeight: 24 }}>{v.about}</Text> : null}
        </View>
        {me?.id !== v.id && <Button variant="whatsapp" icon="whatsapp" title={t('contactVendor')} onPress={() => setContact(true)} />}
      </View>

      <ProductBrowser products={list} />
      <ContactSheet vendor={v} visible={contact} onClose={() => setContact(false)} items={[{ productId: '', name: `${v.name} — PrintingIQ` }]} />
    </Screen>
  );
}
