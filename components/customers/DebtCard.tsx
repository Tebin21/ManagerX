import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Typography } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import type { Debt } from '@/types/sales';
import { fmtIQD } from '@/utils/formatters';

interface Props {
  debt: Debt;
  invoiceNumber?: string;
  onPayment: (debtId: number, amount: number) => Promise<void>;
}

export function DebtCard({ debt, invoiceNumber, onPayment }: Props) {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const cardPad = isRTL ? RTL_SPACING.cardPad : 14;
  const [expanded, setExpanded] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const scrollIntoView = useKeyboardAwareFocus();

  const isSettled = debt.status === 'settled' || debt.remainingAmount <= 0;
  const percent = debt.originalAmount > 0
    ? Math.round((debt.paidAmount / debt.originalAmount) * 100)
    : 100;

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('common.error'), t('debt.invalidAmount'));
      return;
    }
    if (amount > debt.remainingAmount) {
      Alert.alert(t('common.error'), t('debt.maxPaymentExceeded', { amount: fmtIQD(debt.remainingAmount) }));
      return;
    }
    setSaving(true);
    try {
      await onPayment(debt.id, amount);
      setPayAmount('');
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.card, isSettled && styles.cardSettled, { padding: cardPad }]}>
      {/* Line 1 — invoice number + status */}
      <TouchableOpacity
        style={[styles.header, { flexDirection }]}
        onPress={() => !isSettled && setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={[styles.headerLeft, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 10 }]}>
          <View style={[styles.statusDot, isSettled ? styles.dotSettled : styles.dotActive]} />
          {invoiceNumber && (
            <IdText style={[styles.invoiceNum, { textAlign }]} numberOfLines={1}>{invoiceNumber}</IdText>
          )}
        </View>
        {isSettled ? (
          <View style={styles.settledBadge}>
            <Text style={styles.settledText}>{t('common.settled')}</Text>
          </View>
        ) : (
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gray400} />
        )}
      </TouchableOpacity>

      {isSettled ? (
        // Settled — just confirm what the debt was for, no remaining/progress needed.
        <Text style={[styles.amounts, { textAlign, marginBottom: 0 }]}>
          <AmountText value={debt.paidAmount} variant="small" /> / <AmountText value={debt.originalAmount} currency="IQD" variant="small" />
        </Text>
      ) : (
        <>
          {/* Line 2 — remaining label */}
          <Text style={[styles.remainingLabel, { textAlign }]}>{t('debt.remainingLabel')}</Text>
          {/* Line 3 — remaining amount */}
          <AmountText value={debt.remainingAmount} currency="IQD" variant="large" style={[styles.remainingValue, { textAlign }]} />
          {/* Line 4 — paid / total */}
          <Text style={[styles.amounts, { textAlign }]}>
            <AmountText value={debt.paidAmount} variant="small" /> / <AmountText value={debt.originalAmount} currency="IQD" variant="small" />
          </Text>
          {/* Line 5 — progress percentage */}
          <Text style={[styles.progressText, { textAlign }]}>{percent}% {t('debt.paidLabel')}</Text>
          {/* Line 6 — progress bar */}
          <View style={styles.progressBg}>
            <MotiView
              from={{ width: '0%' }}
              animate={{ width: `${percent}%` }}
              transition={{ type: 'timing', duration: 800 }}
              style={styles.progressFill}
            />
          </View>
        </>
      )}

      {/* Payment form */}
      {expanded && !isSettled && (
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 250 }}
          style={styles.payForm}
        >
          <TextInput
            style={[styles.payInput, { textAlign: 'right', writingDirection: 'ltr' }]}
            value={payAmount}
            onChangeText={setPayAmount}
            placeholder={t('suppliers.payAmountHint')}
            placeholderTextColor={Colors.gray300}
            keyboardType="decimal-pad"
            autoFocus
            onFocus={scrollIntoView}
          />
          <TouchableOpacity
            style={[styles.payBtn, saving && styles.payBtnDisabled]}
            onPress={handlePay}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.payBtnText}>{t('debt.recordPayment')}</Text>
            )}
          </TouchableOpacity>
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...Theme.shadow.soft,
  },
  cardSettled: {
    borderColor: '#BBF7D0',
    opacity: 0.85,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive:   { backgroundColor: Colors.warning },
  dotSettled:  { backgroundColor: Colors.success },

  invoiceNum: { fontSize: 13, fontWeight: '700', color: Colors.black },

  remainingLabel: { ...Typography.label, color: Colors.gray400, marginBottom: 2 },
  remainingValue: { color: Colors.error, marginBottom: 10 },
  amounts:        { ...Typography.bodySmall, color: Colors.gray500, marginBottom: 10 },

  settledBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  settledText: { fontSize: 11, fontWeight: '700', color: '#166534' },

  progressText: { fontSize: 11, color: Colors.gray400, marginBottom: 4 },
  progressBg: {
    height: 6,
    backgroundColor: Colors.gray100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },

  payForm: {
    marginTop: 12,
    gap: 8,
  },
  payInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.black,
  },
  payBtn: {
    backgroundColor: Colors.success,
    borderRadius: Theme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
