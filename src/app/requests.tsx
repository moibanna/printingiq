import { Link, router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon } from '../components/icons';
import { RateVendors } from '../components/ratings';
import { Text } from '../components/text';
import { Button, Muted, s, Screen } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';

/** Requests sent from this phone or browser (their private links are kept on the device). */
export default function MyRequests() {
  const { t, arrow } = useI18n();
  const { myRequests } = useStore();
  return (
    <Screen>
      <RateVendors />
      <Button variant="accent" icon="send" title={t('getOffers')} onPress={() => router.push('/request')} />
      {!myRequests.length && <Muted>{t('noRequests')}</Muted>}
      <View style={[s.panel, { padding: 0, gap: 0 }]}>
        {myRequests.map((r, i) => (
          <Link key={r.id} href={{ pathname: '/request/[id]', params: { id: r.id, k: r.token } }} asChild>
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: i ? 1 : 0, borderColor: C.border }}>
              <Icon name="send" size={18} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={{ color: C.text, fontSize: 14 }}>{r.description}</Text>
                <Muted style={{ fontSize: 11 }}>{new Date(r.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</Muted>
              </View>
              <Text style={{ color: C.muted }}>{arrow}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}
