import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  initialNotes: string;
  onClose: () => void;
  onSave: (notes: string) => void;
}

const PRESET_DEFAULT_NOTE = 'نرخەکان بەپێی گۆڕانکارییەکانی بازاڕ بۆ ماوەی ٧ ڕۆژ کاریان پێدەکرێت.';

export function EditDefaultNotesModal({ visible, initialNotes, onClose, onSave }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const [text, setText] = useState(initialNotes);

  useEffect(() => {
    if (visible) {
      setText(initialNotes || PRESET_DEFAULT_NOTE);
    }
  }, [visible, initialNotes]);

  const handleSave = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    onSave(text.trim());
    onClose();
  };

  const handleReset = () => {
    setText(PRESET_DEFAULT_NOTE);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { backgroundColor: isDark ? colors.gray100 : colors.white, borderColor: colors.gray200 }]}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.gray200 }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.iconBox, { backgroundColor: colors.softBlue }]}>
                <Ionicons name="settings-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.black }]}>
                {isKuLanguage ? 'ڕێکخستنی مەرج و تێبینی بنەڕەتی' : 'Default Terms & Notes'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.body}>
            <Text style={[styles.desc, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>
              {isKuLanguage
                ? 'ئەم مەرج و تێبینییە بە شێوەیەکی هەمیشەیی بۆ هەر عەرزێکی نوێ دادەنرێت. دەتوانیت لە کاتی دروستکردنی هەر عەرزێکیشدا بە ئارەزووی خۆت دەستکاری بکەیت.'
                : 'These terms and notes will automatically be used as the permanent default for all new quotations.'}
            </Text>

            {/* Multiline Input */}
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.gray200 : colors.gray50,
                  borderColor: colors.gray300,
                  color: colors.black,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              multiline
              numberOfLines={4}
              value={text}
              onChangeText={setText}
              placeholder={isKuLanguage ? 'تێبینی بنەڕەتی لێرە بنووسە...' : 'Enter default notes...'}
              placeholderTextColor={colors.gray400}
            />

            {/* Preset Reset Button */}
            <TouchableOpacity
              style={[styles.resetBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={handleReset}
            >
              <Ionicons name="refresh-outline" size={14} color={colors.primary} />
              <Text style={[styles.resetBtnText, { color: colors.primary }]}>
                {isKuLanguage ? 'گەڕاندنەوە بۆ دەقی بنەڕەتی سیستەم' : 'Reset to System Default'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.gray200 }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.gray300 }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: colors.gray600 }]}>
                {isKuLanguage ? 'پاشگەزبوونەوە' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={isKuLanguage ? 'پاشەکەوتکردن' : 'Save Default'}
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  desc: {
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  resetBtn: {
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  resetBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  actions: {
    padding: 14,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
