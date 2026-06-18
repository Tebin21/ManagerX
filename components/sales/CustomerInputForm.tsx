import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { searchCustomersList } from '@/lib/sqlite';
import type { CustomerInput } from '@/types/sales';
import type { Customer } from '@/types/customers';

interface Props {
  value: CustomerInput;
  onChange: (patch: Partial<CustomerInput>) => void;
  customerFound?: boolean;
  nameError?: string;
  phoneError?: string;
}

export function CustomerInputForm({ value, onChange, customerFound, nameError, phoneError }: Props) {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { arrowForwardOutline } = useDirectionalChevron();
  const { colors } = useAppTheme();
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback((query: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchCustomersList(query.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  }, []);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    onChange({
      name: customer.name,
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      selectedCustomerId: customer.id,
    });
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onChange]);

  const handleNameChange = useCallback((text: string) => {
    onChange({ name: text, selectedCustomerId: undefined });
    fetchSuggestions(text);
  }, [onChange, fetchSuggestions]);

  const handlePhoneChange = useCallback((text: string) => {
    onChange({ phone: text, selectedCustomerId: undefined });
    if (text.trim().length >= 4) {
      fetchSuggestions(text);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [onChange, fetchSuggestions]);

  return (
    <View>
      <AppTextInput
        label={t('sales.customerName') + ' *'}
        placeholder={t('common.required')}
        value={value.name}
        onChangeText={handleNameChange}
        returnKeyType="next"
        error={nameError}
      />

      {showSuggestions && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 150 }}
          style={styles.dropdown}
        >
          <FlatList
            data={suggestions}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={suggestions.length > 3}
            style={{ maxHeight: 160 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.suggestionRow, { flexDirection }]}
                onPress={() => handleSelectCustomer(item)}
                activeOpacity={0.75}
              >
                <Ionicons name="person-outline" size={14} color={colors.primary} style={styles.suggestionIcon} />
                <View style={styles.suggestionInfo}>
                  <Text style={[styles.suggestionName, { textAlign }]}>{item.name}</Text>
                  {item.phone ? (
                    <Text style={[styles.suggestionPhone, { textAlign }]}>{item.phone}</Text>
                  ) : null}
                </View>
                <Ionicons name={arrowForwardOutline as never} size={14} color={Colors.gray300} />
              </TouchableOpacity>
            )}
          />
        </MotiView>
      )}

      <AppTextInput
        label={t('sales.customerPhone') + ' *'}
        placeholder={t('common.required')}
        value={value.phone}
        onChangeText={handlePhoneChange}
        keyboardType="phone-pad"
        returnKeyType="next"
        error={phoneError}
      />

      {customerFound === true && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={[styles.foundBadge, { flexDirection }]}
        >
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={[styles.foundText, { textAlign }]}>{t('sales.returningCustomer')}</Text>
        </MotiView>
      )}

      <AppTextInput
        label={t('sales.customerAddress')}
        placeholder={t('common.optional')}
        value={value.address}
        onChangeText={(v) => onChange({ address: v })}
        returnKeyType="next"
      />
      <AppTextInput
        label={t('sales.warranty')}
        placeholder={t('sales.warrantyPlaceholder')}
        value={value.warranty}
        onChangeText={(v) => onChange({ warranty: v })}
        returnKeyType="next"
      />
      <AppTextInput
        label={t('sales.notes')}
        placeholder={t('sales.notesPlaceholder')}
        value={value.notes}
        onChangeText={(v) => onChange({ notes: v })}
        multiline
        numberOfLines={3}
        style={{ height: 72, textAlignVertical: 'top', paddingTop: 10 }}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginTop: -12,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  suggestionIcon: { marginEnd: 10 },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 13, fontWeight: '600', color: Colors.black },
  suggestionPhone: { fontSize: 12, color: Colors.gray400, marginTop: 1 },
  foundBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 14, marginTop: -8,
  },
  foundText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
});
