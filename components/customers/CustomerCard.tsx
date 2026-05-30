import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import type { CustomerWithStats } from '@/types/customers';

interface Props {
  customer: CustomerWithStats;
  onPress: () => void;
}

export function CustomerCard({ customer, onPress }: Props) {
  const hasDebt = customer.remainingDebt > 0;
  const lastDate = customer.lastPurchaseDate
    ? new Date(customer.lastPurchaseDate).toLocaleDateString()
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
      {/* Avatar + name row */}
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {customer.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.nameWrap}>
          <Text style={styles.name} numberOfLines={1}>{customer.name}</Text>
          {customer.phone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={12} color={Colors.gray400} />
              <Text style={styles.phone}>{customer.phone}</Text>
            </View>
          ) : null}
        </View>
        {hasDebt && (
          <View style={styles.debtBadge}>
            <Text style={styles.debtBadgeText}>Debt</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Purchases</Text>
          <Text style={styles.statValue}>{customer.saleCount}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Spent</Text>
          <Text style={styles.statValue}>{customer.totalPurchases.toLocaleString('en-US')} IQD</Text>
        </View>
        {hasDebt && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={[styles.statValue, styles.debtValue]}>
                {customer.remainingDebt.toLocaleString('en-US')} IQD
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Footer */}
      {lastDate && (
        <View style={styles.footer}>
          <Ionicons name="time-outline" size={12} color={Colors.gray400} />
          <Text style={styles.footerText}>Last purchase: {lastDate}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.card,
    padding: 16,
    marginBottom: 10,
    ...Theme.shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  nameWrap: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 3,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phone: {
    fontSize: 12,
    color: Colors.gray500,
  },
  debtBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  debtBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.gray50,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: Colors.gray400, fontWeight: '600', marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '700', color: Colors.black },
  debtValue: { color: Colors.warning },
  statDivider: { width: 1, backgroundColor: Colors.gray200, marginVertical: 4 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: Colors.gray400,
  },
});
