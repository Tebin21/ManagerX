import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
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
  const { isRTL, flexDirection } = useRTL();
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
      Alert.alert('Invalid', 'Please enter a valid payment amount.');
      return;
    }
    if (amount > debt.remainingAmount) {
      Alert.alert('Too much', `Maximum payment is ${fmtIQD(debt.remainingAmount)} IQD`);
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
      <TouchableOpacity
        style={[styles.header, { flexDirection }]}
        onPress={() => !isSettled && setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={[styles.headerLeft, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 10 }]}>
          <View style={[styles.statusDot, isSettled ? styles.dotSettled : styles.dotActive]} />
          <View>
            {invoiceNumber && (
              <Text style={styles.invoiceNum}>{invoiceNumber}</Text>
            )}
            <Text style={[styles.amounts, { marginTop: isRTL ? RTL_SPACING.title : 1 }]}>
              {fmtIQD(debt.paidAmount)} / {fmtIQD(debt.originalAmount)} IQD
            </Text>
          </View>
        </View>

        <View style={[styles.headerRight, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
          {isSettled ? (
            <View style={styles.settledBadge}>
              <Text style={styles.settledText}>Settled</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.remainingLabel}>Remaining</Text>
              <Text style={[styles.remainingValue, { marginTop: isRTL ? RTL_SPACING.title : 0 }]}>
                {fmtIQD(debt.remainingAmount)} IQD
              </Text>
            </View>
          )}
          {!isSettled && (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.gray400}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      {!isSettled && (
        <View style={[styles.progressWrap, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
          <View style={styles.progressBg}>
            <MotiView
              from={{ width: '0%' }}
              animate={{ width: `${percent}%` }}
              transition={{ type: 'timing', duration: 800 }}
              style={styles.progressFill}
            />
          </View>
          <Text style={[styles.progressText, { textAlign: isRTL ? 'left' : 'right' }]}>{percent}% paid</Text>
        </View>
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
            placeholder={`Amount (max ${fmtIQD(debt.remainingAmount)} IQD)`}
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
              <Text style={styles.payBtnText}>Add Payment</Text>
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive:   { backgroundColor: Colors.warning },
  dotSettled:  { backgroundColor: Colors.success },

  invoiceNum: { fontSize: 12, fontWeight: '700', color: Colors.black },
  amounts:    { fontSize: 12, color: Colors.gray500, marginTop: 1 },

  remainingLabel: { fontSize: 10, color: Colors.gray400, fontWeight: '600' },
  remainingValue: { fontSize: 14, fontWeight: '800', color: Colors.error },

  settledBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  settledText: { fontSize: 11, fontWeight: '700', color: '#166534' },

  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  progressBg: {
    flex: 1,
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
  progressText: { fontSize: 11, color: Colors.gray400, width: 54 },

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
