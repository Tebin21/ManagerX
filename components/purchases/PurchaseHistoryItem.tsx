import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import type { Purchase } from '@/types/purchases';

interface Props {
  purchase: Purchase;
  onPress: () => void;
  onDelete: () => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PurchaseHistoryItem({ purchase, onPress, onDelete }: Props) {
  const isPaid = purchase.paymentStatus === 'paid';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.numBadge}>
            <Text style={styles.numText}>{purchase.purchaseNumber.split('-').pop()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.productName} numberOfLines={1}>{purchase.productName}</Text>
            {purchase.supplierName ? (
              <Text style={styles.supplierName} numberOfLines={1}>{purchase.supplierName}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.date}>{formatDate(purchase.createdAt)}</Text>
          <View style={[styles.statusBadge, isPaid ? styles.statusPaid : styles.statusDebt]}>
            <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextDebt]}>
              {isPaid ? 'Paid' : 'Debt'}
            </Text>
          </View>
        </View>
      </View>

      {/* Detail row */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Qty</Text>
          <Text style={styles.detailValue}>{purchase.quantity}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Price / Unit</Text>
          <Text style={styles.detailValue}>{fmt(purchase.buyPriceIQD)} IQD</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={[styles.detailValue, styles.totalValue]}>{fmt(purchase.totalIQD)} IQD</Text>
        </View>
      </View>

      {/* Actions row */}
      <View style={styles.actions}>
        <View style={styles.purchaseNum}>
          <Ionicons name="receipt-outline" size={13} color={Colors.gray400} />
          <Text style={styles.purchaseNumText}>{purchase.purchaseNumber}</Text>
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
    backgroundColor: Colors.primary,
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
  statusDebt: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextPaid: { color: Colors.success },
  statusTextDebt: { color: Colors.error },

  details: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailItem: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 11, color: Colors.gray400, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.black },
  totalValue: { color: Colors.primary },
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
