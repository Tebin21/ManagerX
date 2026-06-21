import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Colors } from '@/constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  bullets?: string[];
  footerNote?: string;
}

// Generic informational dialog — mirrors settings/index.tsx's existing logout-
// confirmation Modal structure (overlay + centered card) but with an info-colored
// icon instead of the destructive one, and no second/confirm button.
export function InfoModal({ visible, onClose, title, description, bullets, footerNote }: Props) {
  const { colors, isDark } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: isDark ? colors.gray100 : Colors.white,
              borderColor: isDark ? colors.gray200 : 'transparent',
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.softBlue }]}>
            <Ionicons name="information-circle" size={28} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.black, textAlign: 'center' }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.gray500, textAlign: 'center' }]}>{description}</Text>

          {!!bullets?.length && (
            <View style={styles.bulletList}>
              {bullets.map((bullet, i) => (
                <View key={i} style={[styles.bulletRow, { flexDirection }]}>
                  <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
                  <Text style={[styles.bulletText, { color: colors.gray600, textAlign }]}>{bullet}</Text>
                </View>
              ))}
            </View>
          )}

          {!!footerNote && (
            <Text style={[styles.footerNote, { color: colors.gray400, textAlign: 'center' }]}>{footerNote}</Text>
          )}

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.closeBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  bulletList: {
    width: '100%',
    gap: 8,
    marginBottom: 14,
  },
  bulletRow: {
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 18,
    fontStyle: 'italic',
  },
  closeBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
