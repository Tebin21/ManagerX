import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  TextProps,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { fmtIQD, formatCompactIQD } from '@/utils/formatters';

interface CompactAmountProps extends Omit<TextProps, 'children'> {
  /** Raw amount in IQD — formatting and compacting happen internally. */
  value: number;
  currency?: string;
  /** Set false when the caller renders the currency label itself (e.g. on its own line). */
  showCurrency?: boolean;
  /** Plain text glued onto the front of the displayed string (e.g. "+ ", "− ") — kept inside the
   *  same Text node so this component stays safe to nest inside a parent <Text>. */
  prefix?: string;
}

/**
 * Drop-in replacement for `{fmtIQD(value)} IQD` in summary/stat cards. Switches
 * to compact notation (3.98M) once the value crosses the 1M threshold, and
 * makes itself tappable so the user can always see the full, exact amount —
 * never used for invoices/receipts/transaction tables, which must stay full.
 *
 * Tap-to-expand is wired via Text's own onPress (not a wrapping Touchable) so
 * this component stays safe to nest inside another <Text> for inline cases
 * (e.g. a "+ 1.2M IQD" suffix glued onto a label in the same line).
 */
export function CompactAmount({ value, currency = 'IQD', showCurrency = true, prefix, style, ...rest }: CompactAmountProps) {
  const [open, setOpen] = useState(false);
  const { text, isCompact } = formatCompactIQD(value);
  const display = `${prefix ?? ''}${showCurrency ? `${text} ${currency}` : text}`;

  return (
    <>
      <LTRNumber
        style={style}
        onPress={isCompact ? () => setOpen(true) : undefined}
        {...rest}
      >
        {display}
      </LTRNumber>
      {isCompact && (
        <AmountDetailModal
          visible={open}
          onClose={() => setOpen(false)}
          value={value}
          currency={currency}
          prefix={prefix}
          compactText={text}
        />
      )}
    </>
  );
}

function AmountDetailModal({
  visible, onClose, value, currency, prefix, compactText,
}: {
  visible: boolean;
  onClose: () => void;
  value: number;
  currency: string;
  prefix?: string;
  compactText: string;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { flexDirection } = useRTL();
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          Animated.timing(translateY, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.card, { backgroundColor: colors.white, transform: [{ translateY }] }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.gray200 }]} />

          <View style={[styles.headerRow, { flexDirection }]}>
            <View style={{ width: 28 }} />
            <Text style={[styles.title, { color: colors.black }]}>{t('common.fullAmount')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <LTRNumber style={[styles.fullValue, { color: colors.black, textAlign: 'center' }]}>
            {prefix ?? ''}{fmtIQD(value)} {currency}
          </LTRNumber>

          <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />

          <Text style={[styles.subLabel, { color: colors.gray400, textAlign: 'center' }]}>
            {t('common.compactAmount')}
          </Text>
          <LTRNumber style={[styles.compactValue, { color: colors.gray500, textAlign: 'center' }]}>
            {prefix ?? ''}{compactText} {currency}
          </LTRNumber>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 14, fontWeight: '700' },
  closeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  fullValue: { fontSize: 24, fontWeight: '800', marginBottom: 18 },
  divider: { height: 1, marginBottom: 14 },
  subLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  compactValue: { fontSize: 16, fontWeight: '700' },
});
