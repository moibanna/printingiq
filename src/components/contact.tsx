import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Lead, Vendor } from '../lib/catalog';
import { intlPhone } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { Icon } from './icons';
import { Text } from './text';
import { Button, cityName, Field, Muted } from './ui';

export type ContactItem = Lead['items'][number] & { unitLabel?: string };

/**
 * Asks the customer for their name and phone, records the inquiry (the vendor is notified on PrintingIQ),
 * then opens WhatsApp with a ready message, or the phone dialer.
 */
export function ContactSheet({ vendor, items, visible, onClose, quote }: {
  vendor: Vendor; items: ContactItem[]; visible: boolean; onClose: () => void; quote?: boolean;
}) {
  const { t, tl } = useI18n();
  const { customer, sendLead } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && customer) { setName((n) => n || customer.name); setPhone((p) => p || customer.phone); }
    if (visible) setError('');
  }, [visible, customer]);

  const wa = intlPhone(vendor.whatsapp || vendor.phone);
  const tel = intlPhone(vendor.phone);

  function go(channel: 'whatsapp' | 'call') {
    if (!name.trim() || phone.replace(/\D/g, '').length < 7) return setError(t('needNamePhone'));
    // Record the inquiry in the background (the vendor is notified). WhatsApp must open right away:
    // browsers block new tabs that are opened after waiting on the network.
    sendLead({
      vendorId: vendor.id, channel: quote ? 'quote' : channel, customerName: name.trim(), customerPhone: phone.trim(),
      message: message.trim() || undefined, items: items.map(({ unitLabel: _u, ...i }) => i),
    });
    if (channel === 'whatsapp') {
      const lines = items.map((i) => `• ${i.name}${i.sku ? ` (${i.sku})` : ''}${i.qty ? ` × ${i.qty}${i.unitLabel ? ' ' + i.unitLabel : ''}` : ''}`);
      const text = [
        t('waGreeting').replace('{vendor}', vendor.name), ...lines, '',
        `${t('waMyName')}: ${name.trim()} · ${phone.trim()}`, message.trim(),
      ].filter((x, k, a) => x !== '' || k < a.length - 1).join('\n');
      Linking.openURL(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`);
    } else {
      Linking.openURL(`tel:+${tel}`);
    }
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(16,24,40,0.5)', justifyContent: 'center', padding: 16 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, maxWidth: 460, width: '100%', alignSelf: 'center', maxHeight: '92%' }}>
            <ScrollView contentContainerStyle={{ padding: 18, gap: 10 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="store" size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{vendor.name}</Text>
                    {vendor.verified && <Icon name="verified" size={16} color={C.success} />}
                  </View>
                  <Muted>{cityName(vendor.city, tl)}</Muted>
                </View>
                <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={20} color={C.muted} /></Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="whatsapp" size={15} color={C.success} />
                  <Text style={{ direction: 'ltr', color: C.text, fontSize: 13 } as object}>+{wa}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="phone" size={15} color={C.primary} />
                  <Text style={{ direction: 'ltr', color: C.text, fontSize: 13 } as object}>+{tel}</Text>
                </View>
              </View>

              <View style={{ backgroundColor: C.bg, borderRadius: 10, padding: 10, gap: 2 }}>
                {items.map((i) => (
                  <Text key={i.productId} numberOfLines={1} style={{ fontSize: 13, color: C.text }}>
                    • {i.name}{i.qty ? ` × ${i.qty}` : ''}
                  </Text>
                ))}
              </View>

              <Field label={t('yourName')} value={name} onChangeText={setName} autoComplete="name" />
              <Field label={t('yourPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" ltr />
              <Field label={t('yourMessage')} value={message} onChangeText={setMessage} multiline />
              {error ? <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant="whatsapp" icon="whatsapp" title={t('whatsapp')} onPress={() => go('whatsapp')} style={{ flex: 1 }} />
                {!quote && <Button variant="outline" icon="phone" title={t('call')} onPress={() => go('call')} style={{ flex: 1 }} />}
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                <Icon name="bell" size={14} color={C.muted} />
                <Muted style={{ flex: 1, fontSize: 12 }}>{t('contactNote')}</Muted>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
