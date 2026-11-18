import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Button, Chip, Field, H, LangSwitcher, Muted, ProductCard, s, Screen } from '../../components/ui';
import { CITIES } from '../../lib/catalog';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

export default function Account() {
  const { t, tl } = useI18n();
  const store = useStore();
  const { me, mode, email } = store;
  const [name, setName] = useState('');
  const [city, setCity] = useState('Erbil');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [em, setEm] = useState('');
  const [pw, setPw] = useState('');

  useEffect(() => {
    if (me) { setName(me.name); setCity(me.city); setPhone(me.phone); }
  }, [me]);

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setMsg('');
    try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg(String((e as Error).message ?? e)); }
  };

  const mine = me ? store.products.filter((p) => p.vendorId === me.id) : [];
  const needsLogin = mode === 'supabase' && !email;

  return (
    <Screen>
      <View style={s.panel}>
        <H style={{ fontSize: 15 }}>{t('language')}</H>
        <LangSwitcher />
      </View>

      <Button variant="outline" title={`♡ ${t('favorites')} (${store.favorites.length})`} onPress={() => router.push('/favorites')} />
      {mode === 'local' && <Muted>ℹ️ {t('demoMode')}</Muted>}

      {needsLogin ? (
        <View style={s.panel}>
          <Field label={t('email')} value={em} onChangeText={setEm} autoCapitalize="none" keyboardType="email-address" />
          <Field label={t('password')} value={pw} onChangeText={setPw} secureTextEntry />
          <View style={s.row}>
            <Button title={t('signIn')} onPress={() => run(() => store.signIn(em, pw))} />
            <Button variant="outline" title={t('signUp')} onPress={() => run(() => store.signUp(em, pw))} />
          </View>
        </View>
      ) : (
        <View style={s.panel}>
          <H style={{ fontSize: 15 }}>{t('shopProfile')}</H>
          {email && <Muted>{email}</Muted>}
          <Field label={t('shopName')} value={name} onChangeText={setName} />
          <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={{ textAlign: 'left', writingDirection: 'ltr' }} />
          <Text style={s.label}>{t('city')}</Text>
          <View style={s.row}>
            {CITIES.map((c) => <Chip key={c.en} label={tl(c)} active={city === c.en} onPress={() => setCity(c.en)} />)}
          </View>
          <Button title={t('save')} style={{ marginTop: 8 }} disabled={!name.trim() || !phone.trim()}
            onPress={() => run(() => store.saveProfile({ name: name.trim(), city, phone: phone.trim() }), t('saved'))} />
          {mode === 'supabase' && <Button variant="outline" title={t('signOut')} onPress={() => run(store.signOut)} />}
        </View>
      )}
      {msg ? <Text style={{ color: C.primary, fontWeight: '600' }}>{msg}</Text> : null}

      {mine.length > 0 && (
        <>
          <H>{t('myProducts')}</H>
          {mine.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ flex: 1, maxWidth: 260 }}><ProductCard product={p} /></View>
              <Button variant="danger" title={t('delete')} onPress={() => {
                if (Platform.OS !== 'web' || window.confirm(t('delete') + '?')) run(() => store.deleteProduct(p.id));
              }} />
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
