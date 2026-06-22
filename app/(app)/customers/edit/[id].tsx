import React, { useEffect, useState } from 'react';
import {
  View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { KeyboardAwareScrollView, useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { useCustomerStore } from '@/store/customerStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';

export default function EditCustomerScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { colors } = useAppTheme();
  const { customers, editCustomer } = useCustomerStore();
  const scrollIntoView = useKeyboardAwareFocus();

  const customer = customers.find((c) => c.id === Number(id));

  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone ?? '');
      setAddress(customer.address ?? '');
      setNotes(customer.notes ?? '');
    }
  }, [customer]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('common.required'), t('customers.nameRequired')); return; }
    setSaving(true);
    try {
      await editCustomer(Number(id), {
        name: name.trim(), phone: phone.trim() || undefined,
        address: address.trim() || undefined, notes: notes.trim() || undefined,
      });
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'DUPLICATE_NAME') {
        Alert.alert(t('common.error'), t('customers.duplicateName'));
      } else if (msg.startsWith('DUPLICATE_PHONE:')) {
        Alert.alert(t('common.error'), t('customers.duplicatePhone'));
      } else {
        Alert.alert(t('common.error'), t('customers.errorSave'));
      }
    } finally { setSaving(false); }
  };

  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('customers.editCustomer')} showBack />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('customers.editCustomer')} showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray300} />
          <Text style={{ color: colors.gray400, marginTop: 12, fontSize: 15 }}>{t('common.notFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.gray50 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title={t('customers.editCustomer')} showBack />

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>{t('customers.customerInfo')}</Text>

          <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('customers.name')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign }]}
            value={name} onChangeText={setName}
            placeholder={t('customers.name')} placeholderTextColor={colors.gray300}
            onFocus={scrollIntoView}
          />

          <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('customers.phone')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white }]}
            value={phone} onChangeText={setPhone}
            placeholder={t('sales.customerPhone')} placeholderTextColor={colors.gray300}
            keyboardType="phone-pad"
            onFocus={scrollIntoView}
          />

          <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('customers.address')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign }]}
            value={address} onChangeText={setAddress}
            placeholder={t('sales.customerAddress')} placeholderTextColor={colors.gray300}
            onFocus={scrollIntoView}
          />

          <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('customers.notesLabel')}</Text>
          <TextInput
            style={[styles.input, styles.textarea, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign }]}
            value={notes} onChangeText={setNotes}
            placeholder={t('purchases.notes')} placeholderTextColor={colors.gray300}
            multiline numberOfLines={4}
            onFocus={scrollIntoView}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, flexDirection }, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{t('common.saveChanges')}</Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  loadWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gradHeader:      { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 },
  scroll:          { padding: 16, paddingBottom: 48 },
  card:            { borderRadius: Theme.radius.card, padding: 16, marginBottom: 16, ...Theme.shadow.soft },
  cardTitle:       { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  label:           { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input:           { height: Theme.input.height, borderWidth: 1.5, borderRadius: Theme.input.borderRadius, paddingHorizontal: 14, fontSize: 15, marginBottom: 14 },
  textarea:        { height: 96, textAlignVertical: 'top', paddingTop: 12 },
  saveBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Theme.radius.md, paddingVertical: 16, ...Theme.shadow.button },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText:     { fontSize: 16, fontWeight: '700', color: '#fff' },
});
