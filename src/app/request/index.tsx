import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Icon } from '../../components/icons';
import { Text } from '../../components/text';
import { Button, Chip, Field, Muted, s, Screen } from '../../components/ui';
import { Attachment, categoriesOf, CITIES, GROUPS } from '../../lib/catalog';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

const MAX_FILES = 6;

/** Customer describes a job; every vendor is notified and can send an offer. */
export default function NewRequest() {
  const { t, tl } = useI18n();
  const { customer, createRequest, myRequests } = useStore();
  const [groupId, setGroupId] = useState('services');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [city, setCity] = useState('Erbil');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function addPhotos() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: MAX_FILES });
    if (!r.canceled) setFiles((f) => [...f, ...r.assets.map((a) => ({ url: a.uri, name: a.fileName ?? 'photo.jpg', type: a.mimeType ?? 'image/jpeg' }))].slice(0, MAX_FILES));
  }
  async function addPdf() {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
    if (!r.canceled) setFiles((f) => [...f, ...r.assets.map((a) => ({ url: a.uri, name: a.name, type: a.mimeType }))].slice(0, MAX_FILES));
  }

  async function submit() {
    setError('');
    if (description.trim().length < 3 || !name.trim() || phone.replace(/\D/g, '').length < 7) return setError(t('needJob'));
    setBusy(true);
    try {
      const r = await createRequest({
        groupId, categoryId, description: description.trim(), quantity: quantity.trim() || undefined, city, files,
        customerName: name.trim(), customerPhone: phone.trim(),
      });
      router.replace({ pathname: '/request/[id]', params: { id: r.id, k: r.token, sent: '1' } });
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={[s.panel, { flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
        <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" size={22} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{t('requestTitle')}</Text>
          <Muted style={{ fontSize: 12 }}>{t('requestIntro')}</Muted>
        </View>
      </View>
      {myRequests.length > 0 && (
        <Button variant="ghost" icon="inbox" title={`${t('myRequests')} (${myRequests.length})`} onPress={() => router.push('/requests')} />
      )}

      <View style={s.panel}>
        <Text style={s.label}>{t('whatKind')}</Text>
        <View style={s.row}>
          {GROUPS.map((g) => (
            <Chip key={g.id} icon={g.id} label={tl(g.name)} active={groupId === g.id} onPress={() => { setGroupId(g.id); setCategoryId(undefined); }} />
          ))}
        </View>
        <View style={s.row}>
          <Chip label={t('anyCategory')} active={!categoryId} onPress={() => setCategoryId(undefined)} />
          {categoriesOf(groupId).map((c) => <Chip key={c.id} icon={c.id} label={tl(c.name)} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />)}
        </View>
      </View>

      <View style={s.panel}>
        <Field label={t('describeJob')} hint={t('describeJobHint')} value={description} onChangeText={setDescription} multiline />
        <Field label={t('quantity')} hint={t('quantityHint')} value={quantity} onChangeText={setQuantity} />
        <Text style={s.label}>{t('deliverTo')}</Text>
        <View style={s.row}>{CITIES.map((c) => <Chip key={c.en} label={tl(c)} active={city === c.en} onPress={() => setCity(c.en)} />)}</View>
      </View>

      <View style={s.panel}>
        <Text style={s.label}>{t('attachDesign')}</Text>
        <View style={s.row}>
          {files.map((f) => (
            <Pressable key={f.url} onPress={() => setFiles((xs) => xs.filter((x) => x.url !== f.url))}
              style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {f.type?.startsWith('image/') ? <Image source={{ uri: f.url }} style={{ width: 72, height: 72 }} /> : (
                <View style={{ alignItems: 'center', padding: 4 }}>
                  <Icon name="file" size={22} color={C.primary} />
                  <Text numberOfLines={1} style={{ fontSize: 9, color: C.muted }}>{f.name}</Text>
                </View>
              )}
              <View style={{ position: 'absolute', top: 4, end: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 2 }}>
                <Icon name="close" size={12} color="#fff" />
              </View>
            </Pressable>
          ))}
          {files.length < MAX_FILES && <Button variant="outline" small icon="camera" title={t('addPhoto')} onPress={addPhotos} />}
          {files.length < MAX_FILES && <Button variant="outline" small icon="file" title={t('addFile')} onPress={addPdf} />}
        </View>
      </View>

      <View style={s.panel}>
        <Field label={t('yourName')} value={name} onChangeText={setName} autoComplete="name" />
        <Field label={t('yourPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" ltr />
        {error ? <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text> : null}
        <Button variant="accent" icon="send" title={t('sendRequest')} onPress={submit} disabled={busy} />
      </View>
    </Screen>
  );
}
