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
import { searchSuppliersList } from '@/lib/sqlite';
import type { Supplier } from '@/types/suppliers';

interface Props {
  name: string;
  phone: string;
  address: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onSupplierSelect?: (id: number) => void;
}

export function SupplierInputForm({ name, phone, address, onNameChange, onPhoneChange, onAddressChange, onSupplierSelect }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();
  const { arrowForwardOutline } = useDirectionalChevron();
  const [suggestions, setSuggestions] = useState<Supplier[]>([]);
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
        const results = await searchSuppliersList(query.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  }, []);

  const handleSelectSupplier = useCallback((supplier: Supplier) => {
    onNameChange(supplier.name);
    onPhoneChange(supplier.phone ?? '');
    onAddressChange(supplier.address ?? '');
    onSupplierSelect?.(supplier.id);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onNameChange, onPhoneChange, onAddressChange, onSupplierSelect]);

  const handleNameChange = useCallback((text: string) => {
    onNameChange(text);
    onSupplierSelect?.(0);
    fetchSuggestions(text);
  }, [onNameChange, onSupplierSelect, fetchSuggestions]);

  const handlePhoneChange = useCallback((text: string) => {
    onPhoneChange(text);
    onSupplierSelect?.(0);
    if (text.trim().length >= 4) {
      fetchSuggestions(text);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [onPhoneChange, onSupplierSelect, fetchSuggestions]);

  const returningSupplier = suggestions.some(
    (s) => s.name.toLowerCase() === name.toLowerCase() && s.phone === phone
  );

  return (
    <View>
      <AppTextInput
        label={t('purchases.supplierName')}
        placeholder="e.g. Apple Inc."
        value={name}
        onChangeText={handleNameChange}
        returnKeyType="next"
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
                onPress={() => handleSelectSupplier(item)}
                activeOpacity={0.75}
              >
                <Ionicons name="business-outline" size={14} color={colors.primary} style={styles.suggestionIcon} />
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

      {returningSupplier && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={[styles.foundBadge, { flexDirection }]}
        >
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={[styles.foundText, { textAlign }]}>{t('suppliers.returningSupplier')}</Text>
        </MotiView>
      )}

      <AppTextInput
        label={t('purchases.supplierPhone')}
        placeholder="e.g. 0770 123 4567"
        value={phone}
        onChangeText={handlePhoneChange}
        keyboardType="phone-pad"
        returnKeyType="next"
      />

      <AppTextInput
        label={t('purchases.supplierAddress')}
        placeholder="e.g. Sulaymaniyah, Iraq"
        value={address}
        onChangeText={onAddressChange}
        returnKeyType="next"
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
