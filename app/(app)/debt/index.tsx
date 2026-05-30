import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { AppHeader } from '@/components/common/AppHeader';
import { useDebtStore } from '@/store/debtStore';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { getOverdueLevel, getDebtDisplayStatus } from '@/types/debt';
import type { SalesDebtDetail, PurchaseDebt } from '@/types/debt';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Overdue Badge ─────────────────────────────────────────────────────────────

function OverdueBadge({ level }: { level: 0 | 1 | 2 }) {
  if (level === 0) return null;
  const bg  = level === 2 ? Colors.error : '#F59E0B';
  const txt = level === 2 ? i18n.t('debt.overdueLong') : i18n.t('debt.overdueShort');
  return (
    <View style={[styles.overdueBadge, { backgroundColor: bg }]}>
      <Text style={styles.overdueBadgeText}>{txt}</Text>
    </View>
  );
}

// ─── Status Pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const configs: Record<string, { bg: string; fg: string; label: string }> = {
    unpaid:  { bg: '#FEE2E2',       fg: Colors.error,  label: i18n.t('debt.statusUnpaid')  },
    partial: { bg: '#FEF3C7',       fg: '#92400E',     label: i18n.t('debt.statusPartial') },
    overdue: { bg: Colors.error,    fg: '#fff',        label: i18n.t('debt.statusOverdue') },
    paid:    { bg: '#D1FAE5',       fg: Colors.success, label: i18n.t('debt.statusPaid')   },
  };
  const cfg = configs[status] ?? configs.unpaid;
  return (
    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusPillText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(1, paid / total) : 0;
  const color = pct >= 1 ? Colors.success : pct > 0 ? '#F59E0B' : Colors.error;
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  );
}

// ─── Sales Debt Card ───────────────────────────────────────────────────────────

function SalesDebtCard({
  debt,
  onPay,
}: {
  debt: SalesDebtDetail;
  onPay: () => void;
}) {
  const router = useRouter();
  const overdueLevel = getOverdueLevel(debt.lastPaymentAt, debt.createdAt, debt.remainingAmount);
  const displayStatus = getDebtDisplayStatus(debt.paidAmount, debt.remainingAmount, overdueLevel);

  const initials = debt.customerName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250 }}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/(app)/debt/sales/${debt.id}` as never)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardAvatar}>
            <Text style={styles.cardAvatarText}>{initials || '?'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{debt.customerName}</Text>
            <Text style={styles.cardSub}>
              {debt.invoiceNumber} · {formatDate(debt.createdAt)}
            </Text>
            {debt.lastPaymentAt && (
              <Text style={styles.cardSub2}>Last payment {daysAgo(debt.lastPaymentAt)}d ago</Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <StatusPill status={displayStatus} />
            <OverdueBadge level={overdueLevel} />
          </View>
        </View>

        <View style={styles.cardAmounts}>
          <Text style={styles.amountRemaining}>{fmt(debt.remainingAmount)} IQD</Text>
          <Text style={styles.amountSub}>of {fmt(debt.originalAmount)} IQD</Text>
        </View>

        <ProgressBar paid={debt.paidAmount} total={debt.originalAmount} />

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.quickPayBtn} onPress={onPay}>
            <Ionicons name="flash" size={14} color="#fff" />
            <Text style={styles.quickPayText}>{i18n.t('debt.payCustomer')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => router.push(`/(app)/debt/sales/${debt.id}` as never)}
          >
            <Text style={styles.detailBtnText}>{i18n.t('debt.details')}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

// ─── Purchase Debt Card ────────────────────────────────────────────────────────

function PurchaseDebtCard({
  debt,
  onPay,
}: {
  debt: PurchaseDebt;
  onPay: () => void;
}) {
  const router = useRouter();
  const overdueLevel = getOverdueLevel(debt.lastPaymentAt, debt.createdAt, debt.remainingAmount);
  const displayStatus = getDebtDisplayStatus(debt.paidAmount, debt.remainingAmount, overdueLevel);

  const initials = debt.supplierName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250 }}
    >
      <TouchableOpacity
        style={[styles.card, styles.cardPurchase]}
        activeOpacity={0.85}
        onPress={() => router.push(`/(app)/debt/purchase/${debt.id}` as never)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.cardAvatar, styles.cardAvatarPurchase]}>
            <Text style={[styles.cardAvatarText, { color: Colors.error }]}>{initials || '?'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{debt.supplierName}</Text>
            <Text style={styles.cardSub}>
              {debt.purchaseNumber ?? 'No ref'} · {formatDate(debt.createdAt)}
            </Text>
            {debt.lastPaymentAt && (
              <Text style={styles.cardSub2}>Last payment {daysAgo(debt.lastPaymentAt)}d ago</Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <StatusPill status={displayStatus} />
            <OverdueBadge level={overdueLevel} />
          </View>
        </View>

        <View style={styles.cardAmounts}>
          <Text style={[styles.amountRemaining, { color: Colors.error }]}>
            {fmt(debt.remainingAmount)} IQD
          </Text>
          <Text style={styles.amountSub}>of {fmt(debt.originalAmount)} IQD owed to supplier</Text>
        </View>

        <ProgressBar paid={debt.paidAmount} total={debt.originalAmount} />

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.quickPayBtn, { backgroundColor: Colors.error }]}
            onPress={onPay}
          >
            <Ionicons name="flash" size={14} color="#fff" />
            <Text style={styles.quickPayText}>{i18n.t('debt.paySupplier')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => router.push(`/(app)/debt/purchase/${debt.id}` as never)}
          >
            <Text style={styles.detailBtnText}>{i18n.t('debt.details')}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

// ─── Quick Pay Modal ───────────────────────────────────────────────────────────

function QuickPayModal({
  visible,
  name,
  remaining,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  name: string;
  remaining: number;
  onCancel: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [value, setValue] = useState('');

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 18 }}
        style={styles.modal}
      >
        <Text style={styles.modalTitle}>{i18n.t('debt.recordPayment')}</Text>
        <Text style={styles.modalSub}>{name}</Text>
        <Text style={styles.modalRemaining}>{i18n.t('debt.remainingLabel')}: {fmt(remaining)} IQD</Text>
        <TextInput
          style={styles.modalInput}
          placeholder={i18n.t('debt.amountPlaceholder')}
          placeholderTextColor={Colors.gray400}
          keyboardType="decimal-pad"
          value={value}
          onChangeText={setValue}
          autoFocus
        />
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.modalCancel}
            onPress={() => { setValue(''); onCancel(); }}
          >
            <Text style={styles.modalCancelText}>{i18n.t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalConfirm}
            onPress={() => {
              const amt = parseFloat(value);
              if (!amt || amt <= 0) {
                Alert.alert(i18n.t('common.error'), i18n.t('debt.invalidAmount'));
                return;
              }
              setValue('');
              onConfirm(amt);
            }}
          >
            <Text style={styles.modalConfirmText}>{i18n.t('common.confirm')}</Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

type Tab = 'sales' | 'purchase';

export default function DebtScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const {
    salesDebts, purchaseDebts, summary, isLoading,
    loadAll, paySalesDebt, payPurchaseDebt,
    searchSalesDebts, searchPurchaseDebts,
  } = useDebtStore();

  const [tab, setTab]   = useState<Tab>('sales');
  const [query, setQuery] = useState('');
  const [payTarget, setPayTarget] = useState<{
    id: number; name: string; remaining: number; type: Tab;
  } | null>(null);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = useCallback(() => { loadAll(); }, [loadAll]);

  const visibleSales    = searchSalesDebts(query);
  const visiblePurchase = searchPurchaseDebts(query);

  async function handlePay(amount: number) {
    if (!payTarget) return;
    try {
      if (payTarget.type === 'sales') {
        await paySalesDebt(payTarget.id, amount);
      } else {
        await payPurchaseDebt(payTarget.id, amount);
      }
      setPayTarget(null);
    } catch {
      Alert.alert(t('common.error'), t('debt.errorPayment'));
    }
  }

  const overviewCards = [
    {
      label: t('debt.totalReceivable'),
      value: fmt(summary?.totalSalesDebt ?? 0),
      icon: 'arrow-down-circle' as const,
    },
    {
      label: t('debt.overdueDebts'),
      value: String(summary?.overdueCount ?? 0),
      icon: 'alert-circle' as const,
      highlight: (summary?.overdueCount ?? 0) > 0,
    },
    {
      label: t('debt.totalOwed'),
      value: fmt(summary?.totalPurchaseDebt ?? 0),
      icon: 'arrow-up-circle' as const,
    },
    {
      label: t('common.allTime'),
      value: String((summary?.activeSalesCount ?? 0) + (summary?.activePurchaseCount ?? 0)),
      icon: 'layers' as const,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('debt.title')} showBack onBack={() => router.back()}>

        {/* 2×2 overview grid */}
        <View style={styles.overviewGrid}>
          {overviewCards.map((card) => (
            <View
              key={card.label}
              style={[
                styles.overviewCell,
                card.highlight ? styles.overviewCellAlert : null,
              ]}
            >
              <Ionicons
                name={card.icon}
                size={18}
                color="rgba(255,255,255,0.75)"
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.overviewValue}>{card.value}</Text>
              <Text style={styles.overviewLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['sales', 'purchase'] as Tab[]).map((t) => {
            const count = t === 'sales'
              ? (summary?.activeSalesCount ?? 0)
              : (summary?.activePurchaseCount ?? 0);
            const label = t === 'sales' ? i18n.t('debt.salesTab') : i18n.t('debt.purchasesTab');
            return (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => { setTab(t); setQuery(''); }}
              >
                <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                  {label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, tab === t && styles.tabBadgeActive]}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </AppHeader>

      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.white, borderBottomColor: colors.gray100 }]}>
        <Ionicons name="search" size={16} color={colors.gray400} />
        <TextInput
          style={[styles.searchInput, { color: colors.black }]}
          placeholder={
            tab === 'sales'
              ? t('debt.searchSales')
              : t('debt.searchPurchases')
          }
          placeholderTextColor={colors.gray400}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Debt list */}
      {tab === 'sales' ? (
        <FlatList
          data={visibleSales}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SalesDebtCard
              debt={item}
              onPay={() =>
                setPayTarget({
                  id: item.id,
                  name: item.customerName,
                  remaining: item.remainingAmount,
                  type: 'sales',
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={56} color={Colors.gray300} />
              <Text style={styles.emptyTitle}>
                {isLoading ? t('common.loading') : query ? t('inventory.noResults') : t('debt.noSalesDebts')}
              </Text>
              {!isLoading && !query && (
                <Text style={styles.emptySub}>{t('debt.noSalesDebtsDetail')}</Text>
              )}
            </View>
          }
        />
      ) : (
        <FlatList
          data={visiblePurchase}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PurchaseDebtCard
              debt={item}
              onPay={() =>
                setPayTarget({
                  id: item.id,
                  name: item.supplierName,
                  remaining: item.remainingAmount,
                  type: 'purchase',
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={56} color={Colors.gray300} />
              <Text style={styles.emptyTitle}>
                {isLoading ? t('common.loading') : query ? t('inventory.noResults') : t('debt.noPurchaseDebts')}
              </Text>
              {!isLoading && !query && (
                <Text style={styles.emptySub}>{t('debt.noPurchaseDebtsDetail')}</Text>
              )}
            </View>
          }
        />
      )}

      {/* Quick pay modal */}
      <QuickPayModal
        visible={!!payTarget}
        name={payTarget?.name ?? ''}
        remaining={payTarget?.remaining ?? 0}
        onCancel={() => setPayTarget(null)}
        onConfirm={handlePay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  gradHeader: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 16,
  },

  // Overview grid
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  overviewCell: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  overviewCellAlert: { backgroundColor: 'rgba(239,68,68,0.25)' },
  overviewValue: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  overviewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: { backgroundColor: '#fff' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  tabLabelActive: { color: Colors.primary },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeActive: { backgroundColor: Colors.primary },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.black },

  listContent: { padding: 16, paddingBottom: 32 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: Theme.radius.card,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPurchase: { borderLeftWidth: 3, borderLeftColor: Colors.error },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardAvatarPurchase: { backgroundColor: '#FEE2E2' },
  cardAvatarText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 2 },
  cardSub: { fontSize: 12, color: Colors.gray400 },
  cardSub2: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },

  cardAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  amountRemaining: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  amountSub: { fontSize: 12, color: Colors.gray400 },

  progressTrack: {
    height: 6,
    backgroundColor: Colors.gray100,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  quickPayText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 2,
  },
  detailBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  statusPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  overdueBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  overdueBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray500, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.gray400, textAlign: 'center' },

  // Quick pay modal
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: 4 },
  modalSub: { fontSize: 14, color: Colors.gray500, marginBottom: 2 },
  modalRemaining: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.black,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: Colors.gray500 },
  modalConfirm: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
