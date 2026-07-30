import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { TimeText } from '@/components/ui/TimeText';
import { useTranslation } from 'react-i18next';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL } from '@/lib/rtl';
import type { FinancialLedgerEvent } from '@/types/debt';

interface FinancialTimelineItemProps {
  event: FinancialLedgerEvent;
  isLast: boolean;
}

export function FinancialTimelineItem({ event, isLast }: FinancialTimelineItemProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const paidTint = useMemo(() => getStatusTint('success', colors, isDark), [colors, isDark]);
  const { flexDirection, textAlign } = useRTL();

  const dotColor =
    event.type === 'debt_created' ? colors.primary
    : event.type === 'debt_fully_paid' ? colors.success
    : colors.primary;

  return (
    <View style={[styles.timelineItem, { flexDirection }]}>
      <View style={styles.timelineDotCol}>
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineCard}>
        <View style={[styles.headerRow, { flexDirection }]}>
          {event.referenceNumber ? (
            <IdText style={[styles.reference, { color: colors.gray400 }]}>{event.referenceNumber}</IdText>
          ) : null}
          <Text style={[styles.timelineDate, { textAlign }]}>
            <DateText value={event.createdAt} size="small" /> · <TimeText value={event.createdAt} style={styles.timelineDate} />
          </Text>
        </View>

        {event.type === 'debt_created' && (
          <>
            <Text style={[styles.eventLabel, { color: colors.black, textAlign }]}>{t('debt.debtCreated')}</Text>
            <AmountText value={event.amount} currency="IQD" variant="small" style={[styles.createdAmount, { color: colors.black }]} />
          </>
        )}

        {event.type === 'payment' && (
          <>
            <View style={[styles.timelineAmountRow, { flexDirection }]}>
              <View style={[styles.timelineAmountChip, { backgroundColor: paidTint.bg }]}>
                <Text style={[styles.timelineAmountChipText, { color: paidTint.text }]}>
                  <AmountText value={event.amount} prefix="+" currency="IQD" variant="small" style={[styles.timelineAmountChipText, { color: paidTint.text }]} /> {t('debt.paidLabel')}
                </Text>
              </View>
            </View>
            <Text style={[styles.timelineRemaining, { textAlign }]}>
              {t('debt.remainingLabel')}: <AmountText value={event.remainingAfter} currency="IQD" variant="small" style={styles.timelineRemaining} />
            </Text>
            {event.paymentMethod ? (
              <Text style={[styles.timelineNote, { textAlign }]}>{event.paymentMethod}</Text>
            ) : null}
            {event.note ? (
              <Text style={[styles.timelineNote, { textAlign }]}>{event.note}</Text>
            ) : null}
          </>
        )}

        {event.type === 'debt_fully_paid' && (
          <View style={[styles.fullyPaidRow, { flexDirection }]}>
            <Ionicons name="checkmark-circle" size={16} color={paidTint.text} />
            <Text style={[styles.fullyPaidText, { color: paidTint.text }]}>{t('debt.fullyPaid')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    timelineItem: { marginBottom: 14, gap: 12 },
    timelineDotCol: { alignItems: 'center', width: 20 },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 14 },
    timelineLine: { width: 2, flex: 1, backgroundColor: colors.gray100, marginTop: 4 },
    timelineCard: { flex: 1, backgroundColor: colors.gray50, borderRadius: 12, padding: 12, gap: 4 },
    headerRow: { justifyContent: 'space-between', alignItems: 'center' },
    reference: { fontSize: 12, fontWeight: '700' },
    timelineDate: { fontSize: 11, color: colors.gray400 },
    eventLabel: { fontSize: 13, fontWeight: '700' },
    createdAmount: { fontSize: 13, fontWeight: '700' },
    timelineAmountRow: { marginTop: 2, marginBottom: 2 },
    timelineAmountChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    timelineAmountChipText: { fontSize: 13, fontWeight: '700' },
    timelineRemaining: { fontSize: 12, color: colors.gray500 },
    timelineNote: { fontSize: 12, color: colors.gray400, fontStyle: 'italic', marginTop: 2 },
    fullyPaidRow: { alignItems: 'center', gap: 6 },
    fullyPaidText: { fontSize: 13, fontWeight: '700' },
  });
