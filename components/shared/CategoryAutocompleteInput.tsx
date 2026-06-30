import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  categories: string[];
  label?: string;
  placeholder?: string;
  /** Merged onto the input's default style — undefined leaves it unchanged */
  inputStyle?: TextStyle;
}

export function CategoryAutocompleteInput({
  value,
  onChange,
  categories,
  label,
  placeholder = 'e.g. Electronics',
  inputStyle,
}: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { colors } = useAppTheme();
  const { textAlign } = useRTL();
  const scrollIntoView = useKeyboardAwareFocus();

  const trimmedLower = value.trim().toLowerCase();
  const filtered = trimmedLower
    ? categories.filter((c) => c.toLowerCase().includes(trimmedLower))
    : categories;

  const exactMatch = categories.some(
    (c) => c.toLowerCase() === value.trim().toLowerCase()
  );
  const showCreate = value.trim() !== '' && !exactMatch;
  const hasContent = filtered.length > 0 || showCreate;

  function handleSelect(cat: string) {
    onChange(cat);
    setShowDropdown(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  function handleFocus(e: Parameters<ReturnType<typeof useKeyboardAwareFocus>>[0]) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setShowDropdown(true);
    scrollIntoView(e);
  }

  function handleBlur() {
    closeTimer.current = setTimeout(() => setShowDropdown(false), 160);
  }

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: colors.gray600, textAlign }]}>{label}</Text>
      ) : null}

      <MotiView
        animate={{
          borderColor: showDropdown ? colors.primary : colors.gray200,
          shadowOpacity: showDropdown ? 0.12 : 0,
        }}
        transition={{ type: 'timing', duration: 200 }}
        style={[
          styles.inputWrap,
          { borderColor: colors.gray200, backgroundColor: colors.gray50, shadowColor: colors.primary },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.black, textAlign }, inputStyle]}
          value={value}
          onChangeText={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          returnKeyType="done"
        />
        {value.length > 0 ? (
          <TouchableOpacity
            onPress={() => onChange('')}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.gray400} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={14} color={colors.gray400} style={styles.chevron} />
        )}
      </MotiView>

      {showDropdown && hasContent ? (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 150 }}
          style={[
            styles.dropdown,
            { backgroundColor: colors.white, borderColor: colors.gray200 },
          ]}
        >
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={filtered.length > 4}
            style={{ maxHeight: 200 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.gray100 }]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={13}
                  color={colors.primary}
                  style={styles.rowIcon}
                />
                <Text style={[styles.rowText, { color: colors.black }]}>{item}</Text>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              showCreate ? (
                <TouchableOpacity
                  style={[styles.row, styles.createRow]}
                  onPress={() => handleSelect(value.trim())}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={13}
                    color={colors.primary}
                    style={styles.rowIcon}
                  />
                  <Text style={[styles.rowText, { color: colors.primary }]}>
                    {`Create "${value.trim()}"`}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </MotiView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Theme.input.borderRadius,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 0,
  },
  input: {
    flex: 1,
    height: Theme.input.height,
    fontSize: 15,
  },
  clearBtn: { paddingStart: 6 },
  chevron: { paddingStart: 4 },
  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: -10,
    marginBottom: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  rowIcon: { marginEnd: 10 },
  rowText: { fontSize: 13, fontWeight: '500', flex: 1 },
  createRow: { borderBottomWidth: 0 },
});
