import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import type { Purchase } from '@/types/purchases';

interface Props {
  purchase: Purchase;
  onPress: () => void;
  onDelete: () => void;
}

export function PurchaseHistoryItem({ purchase, onPress, onDelete }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const isPaid = purchase.paymentStatus === 'paid';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header row */}
      <View style={[styles.header, { flexDirection, padding: isRTL ? RTL_SPACING.cardPad : 14 }]}>
        <View style={[styles.headerLeft, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 10 }]}>
          <View style={[styles.numBadge, { backgroundColor: colors.primary }]}>
            <IdText style={styles.numText}>{purchase.purchaseNumber}</IdText>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.productName, { textAlign }]} numberOfLines={1}>{purchase.productName}</Text>
            {purchase.supplierName ? (
              <Text style={[styles.supplierName, { textAlign, marginTop: isRTL ? RTL_SPACING.title : 1 }]} numberOfLines={1}>{purchase.supplierName}</Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.headerRight, { alignItems: alignEnd, gap: isRTL ? RTL_SPACING.gapSm : 4 }]}>
          <DateText value={purchase.createdAt} size="small" style={[styles.date, { textAlign }]} />
          <View style={[styles.statusBadge, isPaid ? styles.statusPaid : styles.statusDebt]}>
            <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextDebt]}>
              {isPaid ? 'Paid' : 'Debt'}
            </Text>
          </View>
        </View>
      </View>

      {/* Detail row */}
      <View style={[styles.details, { paddingVertical: isRTL ? RTL_SPACING.gap : 12 }]}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>Qty</Text>
          <Text style={styles.detailValue}>{purchase.quantity}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>Price / Unit</Text>
          <AmountText value={purchase.buyPriceIQD} currency="IQD" style={styles.detailValue} />
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>Total</Text>
          <AmountText value={purchase.totalIQD} currency="IQD" style={[styles.detailValue, { color: colors.primary }]} />
        </View>
      </View>

      {/* Actions row */}
      <View style={[styles.actions, { flexDirection, paddingHorizontal: isRTL ? RTL_SPACING.cardPad : 14 }]}>
        <View style={[styles.purchaseNum, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4 }]}>
          <Ionicons name="receipt-outline" size={13} color={Colors.gray400} />
          <IdText size="small" style={[styles.purchaseNumText, { textAlign }]}>{purchase.purchaseNumber}</IdText>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.card,
    marginBottom: 12,
    ...Theme.shadow.soft,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  numBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 32,
    alignItems: 'center',
  },
  numText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  headerInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: Colors.black },
  supplierName: { fontSize: 12, color: Colors.gray500, marginTop: 1 },

  headerRight: { alignItems: 'flex-end', gap: 4 },
  date: { fontSize: 11, color: Colors.gray400 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPaid: { backgroundColor: '#DCFCE7' },
  statusDebt: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextPaid: { color: Colors.success },
  statusTextDebt: { color: '#92400E' },

  details: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailItem: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 11, color: Colors.gray400, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.black },
  divider: { width: 1, backgroundColor: Colors.gray100, marginVertical: 2 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  purchaseNum: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  purchaseNumText: { fontSize: 11, color: Colors.gray400 },
  deleteBtn: { padding: 6 },
});
