import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/common/AppHeader';
import { KeyboardAwareScrollView, useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { useSupplierStore } from '@/store/supplierStore';
import { useDebtStore } from '@/store/debtStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { getPurchasesBySupplierName } from '@/lib/sqlite';
import type { SupplierWithStats } from '@/types/suppliers';
import type { Purchase } from '@/types/purchases';
import type { PurchaseDebt } from '@/types/debt';
import { fmtIQD } from '@/utils/formatters';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';


interface DebtCardProps {
  debt: PurchaseDebt;
  onPay: (debtId: number, amount: number) => Promise<void>;
}

function ActiveDebtCard({ debt, onPay }: DebtCardProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const scrollIntoView = useKeyboardAwareFocus();

  const percent = debt.originalAmount > 0
    ? Math.round((debt.paidAmount / debt.originalAmount) * 100)
    : 0;

  const handlePay = useCallback(() => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { Alert.alert(t('common.error'), t('suppliers.payAmountHint')); return; }
    if (val > debt.remainingAmount) {
      Alert.alert(t('common.error'), t('debt.maxPaymentExceeded', { amount: fmtIQD(debt.remainingAmount) }));
      return;
    }
    Alert.alert(
      t('suppliers.payConfirm'),
      `${fmtIQD(val)} IQD → ${debt.purchaseNumber ?? t('common.notFound')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setPaying(true);
            try { await onPay(debt.id, val); setAmount(''); }
            catch { Alert.alert(t('common.error'), t('common.tryAgain')); }
            finally { setPaying(false); }
          },
        },
      ]
    );
  }, [amount, debt, onPay, t]);

  return (
    <View style={[debtStyles.card, { backgroundColor: colors.white, padding: isRTL ? RTL_SPACING.cardPad : 14 }]}>
      {/* Line 1 — purchase ref + status badge */}
      <View style={[debtStyles.top, { flexDirection }]}>
        <IdText style={[debtStyles.ref, { color: colors.primary, textAlign }]} numberOfLines={1}>
          {debt.purchaseNumber ?? '—'}
        </IdText>
        <View style={[debtStyles.badge, { backgroundColor: '#FFF7ED' }]}>
          <Text style={[debtStyles.badgeText, { color: Colors.warning }]}>{t('common.debt')}</Text>
        </View>
      </View>

      {/* Line 2 — remaining label */}
      <Text style={[debtStyles.remainingLabel, { color: colors.gray400, textAlign }]}>
        {t('debt.remainingLabel')}
      </Text>
      {/* Line 3 — remaining amount */}
      <AmountText value={debt.remainingAmount} currency="IQD" variant="large" style={[debtStyles.remainingValue, { color: Colors.error, textAlign }]} />
      {/* Line 4 — paid / total */}
      <Text style={[debtStyles.amounts, { color: colors.gray500, textAlign }]}>
        <AmountText value={debt.paidAmount} variant="small" /> / <AmountText value={debt.originalAmount} currency="IQD" variant="small" />
      </Text>
      {/* Line 5 — progress percentage */}
      <Text style={[debtStyles.progressText, { color: colors.gray400, textAlign }]}>
        {percent}% {t('debt.paidLabel')}
      </Text>
      {/* Line 6 — progress bar */}
      <View style={[debtStyles.progressTrack, { backgroundColor: colors.gray100 }]}>
        <View style={[debtStyles.progressFill, { width: `${percent}%` as never, backgroundColor: Colors.success }]} />
      </View>

      <View style={[debtStyles.payRow, { borderTopColor: colors.gray100, flexDirection }]}>
        <TextInput
          style={[debtStyles.payInput, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.gray50 }]}
          value={amount}
          onChangeText={setAmount}
          placeholder={t('suppliers.payAmountHint')}
          placeholderTextColor={colors.gray400}
          keyboardType="numeric"
          returnKeyType="done"
          onFocus={scrollIntoView}
        />
        <TouchableOpacity
          style={[debtStyles.payBtn, { backgroundColor: paying ? colors.gray200 : colors.primary }]}
          onPress={handlePay}
          disabled={paying}
          activeOpacity={0.85}
        >
          {paying
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={debtStyles.payBtnText}>{t('suppliers.payDebt')}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const debtStyles = StyleSheet.create({
  card:          { borderRadius: Theme.radius.card, padding: 14, marginBottom: 10, ...Theme.shadow.soft },
  top:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ref:           { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  badge:         { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:     { fontSize: 11, fontWeight: '700' },
  remainingLabel:{ fontSize: 11, fontWeight: '600', marginBottom: 2 },
  remainingValue:{ fontSize: 16, fontWeight: '800', marginBottom: 10 },
  amounts:       { fontSize: 12, marginBottom: 10 },
  progressText:  { fontSize: 11, marginBottom: 4 },
  progressTrack: { height: 6, borderRadius: 3, marginBottom: 10, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  payRow:        { flexDirection: 'row', gap: 8, marginTop: 2, paddingTop: 12, borderTopWidth: 1, alignItems: 'center' },
  payInput:      { flex: 1, height: 40, borderWidth: 1.5, borderRadius: Theme.radius.md, paddingHorizontal: 12, fontSize: 14 },
  payBtn:        { height: 40, paddingHorizontal: 16, borderRadius: Theme.radius.md, alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  payBtnText:    { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default function SupplierDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { suppliers, loadSuppliers, editSupplier, deleteSupplier } = useSupplierStore();
  const { purchaseDebts, loadAll: loadDebts, payPurchaseDebt } = useDebtStore();
  const { colors } = useAppTheme();
  const { textAlign, writingDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const sectionTitleStyle = [styles.sectionTitle, { color: colors.gray400, textAlign, writingDirection }];

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const supplier: SupplierWithStats | undefined = suppliers.find((s) => s.id === Number(id));

  const loadAll = useCallback(async () => {
    if (!supplier) return;
    setLoading(true);
    try {
      const p = await getPurchasesBySupplierName(supplier.name);
      setPurchases(p);
    } catch (err) {
      console.error('Failed to load supplier purchases:', err);
    } finally {
      setLoading(false);
    }
  }, [supplier?.name]);

  useEffect(() => {
    if (!supplier) loadSuppliers();
    loadDebts();
  }, []);

  useEffect(() => {
    if (supplier) {
      loadAll();
      setEditName(supplier.name);
      setEditPhone(supplier.phone ?? '');
      setEditAddress(supplier.address ?? '');
      setEditNotes(supplier.notes ?? '');
    }
  }, [supplier?.id]);

  const activeDebts = purchaseDebts.filter(
    (d) => d.supplierName.toLowerCase() === (supplier?.name ?? '').toLowerCase() &&
      d.status === 'active' && d.remainingAmount > 0,
  );
  const settledDebts = purchaseDebts.filter(
    (d) => d.supplierName.toLowerCase() === (supplier?.name ?? '').toLowerCase() &&
      (d.status === 'settled' || d.remainingAmount <= 0),
  );
  const totalRemaining = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
  const totalPaid = purchaseDebts
    .filter((d) => d.supplierName.toLowerCase() === (supplier?.name ?? '').toLowerCase())
    .reduce((s, d) => s + d.paidAmount, 0);

  const canDelete = purchases.length === 0 && activeDebts.length === 0;

  const handlePay = useCallback(async (debtId: number, amount: number) => {
    await payPurchaseDebt(debtId, amount);
    await loadDebts();
    await loadAll();
  }, [payPurchaseDebt, loadDebts, loadAll]);

  const handleSaveEdit = useCallback(async () => {
    if (!supplier || !editName.trim()) return;
    setSaving(true);
    try {
      await editSupplier(supplier.id, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        notes: editNotes.trim() || null,
      });
      setEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'DUPLICATE_NAME') {
        Alert.alert(t('common.error'), t('suppliers.duplicateName'));
      } else if (msg.startsWith('DUPLICATE_PHONE:')) {
        Alert.alert(t('common.error'), t('suppliers.duplicatePhone'));
      } else {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      }
    } finally {
      setSaving(false);
    }
  }, [supplier, editName, editPhone, editAddress, editNotes, editSupplier]);

  const handleExportPDF = useCallback(async () => {
    if (!supplier) return;
    try {
      const { shareSupplierReport } = await import('@/lib/generateInvoice');
      const { loadBusiness } = await import('@/lib/sqlite');
      const biz = await loadBusiness();
      const allDebts = purchaseDebts.filter(
        (d) => d.supplierName.toLowerCase() === supplier.name.toLowerCase()
      );
      await shareSupplierReport(supplier, purchases, allDebts, {
        name: biz?.name ?? 'My Business',
        phone: biz?.phone ?? '',
        address: biz?.address ?? '',
        logoUri: biz?.logoPath ?? null,
      });
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [supplier, purchases, purchaseDebts, t]);

  const handleDelete = useCallback(() => {
    if (!supplier) return;
    Alert.alert(
      t('suppliers.deleteTitle'),
      t('suppliers.deleteMsg', { name: supplier.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSupplier(supplier.id);
              router.back();
            } catch (err) {
              const msg = err instanceof Error ? err.message : '';
              if (msg === 'SUPPLIER_HAS_ACTIVE_DEBTS') {
                Alert.alert(t('suppliers.deleteTitle'), t('suppliers.hasActiveDebts'));
              } else if (msg === 'SUPPLIER_HAS_PURCHASES') {
                Alert.alert(t('suppliers.deleteTitle'), t('suppliers.hasPurchases'));
              } else {
                Alert.alert(t('common.error'), t('common.tryAgain'));
              }
            }
          },
        },
      ]
    );
  }, [supplier, deleteSupplier]);

  if (!supplier) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('suppliers.title')} showBack onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.gray50 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title={supplier.name}
        showBack
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity onPress={() => setEditing((v) => !v)} hitSlop={8}>
            <Ionicons name={editing ? 'close-outline' : 'create-outline'} size={22} color="#fff" />
          </TouchableOpacity>
        }
      >
        {/* Contact chips */}
        <View style={styles.chipsRow}>
          {supplier.phone ? (
            <View style={styles.chip}>
              <Ionicons name="call-outline" size={12} color="#fff" />
              <Text style={styles.chipText}>{supplier.phone}</Text>
            </View>
          ) : null}
          {supplier.address ? (
            <View style={styles.chip}>
              <Ionicons name="location-outline" size={12} color="#fff" />
              <Text style={styles.chipText} numberOfLines={1}>{supplier.address}</Text>
            </View>
          ) : null}
        </View>
      </AppHeader>

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats 2×2 grid */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220 }}
          style={styles.statsGrid}
        >
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.white }]}>
              <Ionicons name="cart-outline" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
              <Text style={[styles.statVal, { color: colors.black }]}>{supplier.purchaseCount}</Text>
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('suppliers.purchaseCount')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.white }]}>
              <Ionicons name="cash-outline" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
              <AmountText value={supplier.totalSpent} variant="large" numberOfLines={1} style={[styles.statVal, { color: colors.primary }]} />
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('suppliers.totalSpent')} IQD</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.white }, totalRemaining > 0 && styles.statCardDebt]}>
              <Ionicons name="alert-circle-outline" size={16} color={totalRemaining > 0 ? colors.error : colors.gray300} style={{ marginBottom: 4 }} />
              {totalRemaining > 0 ? (
                <AmountText value={totalRemaining} variant="large" numberOfLines={1} style={[styles.statVal, { color: colors.error }]} />
              ) : (
                <Text style={[styles.statVal, { color: colors.black }]} numberOfLines={1}>—</Text>
              )}
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('suppliers.remainingDebt')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.white }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={totalPaid > 0 ? Colors.success : colors.gray300} style={{ marginBottom: 4 }} />
              {totalPaid > 0 ? (
                <AmountText value={totalPaid} variant="large" numberOfLines={1} style={[styles.statVal, { color: Colors.success }]} />
              ) : (
                <Text style={[styles.statVal, { color: colors.black }]} numberOfLines={1}>—</Text>
              )}
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('suppliers.totalPaid')}</Text>
            </View>
          </View>
          {supplier.lastPurchaseDate ? (
            <View style={[styles.activityRow, { backgroundColor: colors.white }]}>
              <Ionicons name="time-outline" size={14} color={colors.gray400} />
              <Text style={[styles.activityText, { color: colors.gray500 }]}>
                {t('suppliers.lastPurchase')}: <DateText value={supplier.lastPurchaseDate} size="small" />
              </Text>
            </View>
          ) : null}
        </MotiView>

        {/* Contact info / edit form */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 50 }}
          style={[styles.section, { backgroundColor: colors.white }]}
        >
          <Text style={sectionTitleStyle}>{t('suppliers.contactInfo')}</Text>
          {editing ? (
            <View>
              <AppTextInput label={t('suppliers.name')} value={editName} onChangeText={setEditName}
                placeholder={t('suppliers.name')} autoCapitalize="words" />
              <AppTextInput label={t('suppliers.phone')} value={editPhone} onChangeText={setEditPhone}
                placeholder="e.g. 0770 123 4567" keyboardType="phone-pad" />
              <AppTextInput label={t('suppliers.address')} value={editAddress} onChangeText={setEditAddress}
                placeholder="e.g. Sulaimani, Iraq" autoCapitalize="sentences" />
              <AppTextInput label={t('suppliers.notes')} value={editNotes} onChangeText={setEditNotes}
                placeholder={t('purchases.notesPlaceholder')} multiline autoCapitalize="sentences" />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: saving ? colors.gray200 : colors.primary }]}
                onPress={handleSaveEdit} disabled={saving} activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>{t('suppliers.editSave')}</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[styles.infoRow, { borderBottomColor: colors.gray100 }]}>
                <Ionicons name="business-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoText, { color: colors.black }]}>{supplier.name}</Text>
              </View>
              {supplier.phone ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.gray100 }]}>
                  <Ionicons name="call-outline" size={16} color={colors.gray400} />
                  <Text style={[styles.infoText, { color: colors.black }]}>{supplier.phone}</Text>
                </View>
              ) : null}
              {supplier.address ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.gray100 }]}>
                  <Ionicons name="location-outline" size={16} color={colors.gray400} />
                  <Text style={[styles.infoText, { color: colors.black }]}>{supplier.address}</Text>
                </View>
              ) : null}
            </>
          )}
        </MotiView>

        {/* Active Debts */}
        {activeDebts.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 80 }}
            style={[styles.section, { backgroundColor: colors.white }]}
          >
            <Text style={sectionTitleStyle}>
              {t('suppliers.activeDebts')} ({activeDebts.length})
            </Text>
            {activeDebts.map((debt) => (
              <ActiveDebtCard key={debt.id} debt={debt} onPay={handlePay} />
            ))}
          </MotiView>
        )}

        {/* Settled Debts */}
        {settledDebts.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 100 }}
            style={[styles.section, { backgroundColor: colors.white }]}
          >
            <Text style={sectionTitleStyle}>
              {t('suppliers.settledDebts')} ({settledDebts.length})
            </Text>
            {settledDebts.map((debt) => (
              <View key={debt.id} style={[styles.settledRow, { borderBottomColor: colors.gray100 }]}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <View style={{ flex: 1, marginStart: 8 }}>
                  <IdText style={[styles.settledInvoice, { color: colors.black }]}>{debt.purchaseNumber ?? '—'}</IdText>
                  <AmountText value={debt.originalAmount} currency="IQD" variant="small" style={[styles.settledAmount, { color: colors.gray400 }]} />
                </View>
                <View style={styles.settledBadge}>
                  <Text style={styles.settledBadgeText}>{t('common.settled')}</Text>
                </View>
              </View>
            ))}
          </MotiView>
        )}

        {/* Purchase History */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 120 }}
          style={[styles.section, { backgroundColor: colors.white }]}
        >
          <Text style={sectionTitleStyle}>
            {t('suppliers.purchaseHistory')} ({purchases.length})
          </Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} />
          ) : purchases.length === 0 ? (
            <Text style={[styles.noData, { color: colors.gray400 }]}>{t('suppliers.noPurchases')}</Text>
          ) : (
            purchases.map((p, i) => (
              <MotiView
                key={p.id}
                from={{ opacity: 0, translateY: 6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 220, delay: Math.min(i * 35, 350) }}
              >
                <TouchableOpacity
                  style={[styles.purchaseRow, { borderBottomColor: colors.gray100 }]}
                  onPress={() => router.push(`/(app)/purchases/${p.id}` as never)}
                  activeOpacity={0.75}
                >
                  <View style={styles.purchaseLeft}>
                    <IdText style={[styles.purchaseNum, { color: colors.primary }]}>{p.purchaseNumber}</IdText>
                    <Text style={[styles.purchaseName, { color: colors.black }]} numberOfLines={1}>{p.productName}</Text>
                    <DateText value={p.date ?? p.createdAt} size="small" style={[styles.purchaseDate, { color: colors.gray400 }]} />
                  </View>
                  <View style={styles.purchaseRight}>
                    <AmountText value={p.totalIQD} currency="IQD" style={[styles.purchaseTotal, { color: colors.primary }]} />
                    <View style={[styles.statusBadge, { backgroundColor: p.paymentStatus === 'paid' ? '#F0FDF4' : '#FFF7ED' }]}>
                      <Text style={[styles.statusText, { color: p.paymentStatus === 'paid' ? Colors.success : Colors.warning }]}>
                        {p.paymentStatus === 'paid' ? t('common.paid') : t('common.debt')}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name={chevronForward as never} size={16} color={colors.gray300} style={{ marginStart: 8 }} />
                </TouchableOpacity>
              </MotiView>
            ))
          )}
        </MotiView>

        {/* Notes */}
        {!editing && supplier.notes ? (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 160 }}
            style={[styles.section, { backgroundColor: colors.white }]}
          >
            <Text style={sectionTitleStyle}>{t('suppliers.notes')}</Text>
            <Text style={[styles.notesText, { color: colors.black }]}>{supplier.notes}</Text>
          </MotiView>
        ) : null}

        {/* Danger Zone */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 200 }}
          style={[styles.section, styles.deleteSectionBorder, { backgroundColor: colors.white }]}
        >
          <Text style={sectionTitleStyle}>
            {t('customers.deleteAccountSection')}
          </Text>
          {!canDelete ? (
            <>
              <View style={styles.deleteWarningBox}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
                <Text style={[styles.deleteWarningText, { color: colors.gray600, textAlign, writingDirection }]}>
                  {purchases.length > 0
                    ? t('suppliers.hasPurchases')
                    : t('suppliers.hasActiveDebts')}
                </Text>
              </View>
              <TouchableOpacity style={[styles.deleteAccountBtn, styles.deleteAccountBtnDisabled]} disabled activeOpacity={1}>
                <Ionicons name="trash-outline" size={16} color={Colors.gray400} />
                <Text style={[styles.deleteAccountBtnText, { color: colors.gray400 }]}>
                  {t('suppliers.deleteAccount')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDelete} activeOpacity={0.82}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={[styles.deleteAccountBtnText, { color: Colors.error }]}>
                {t('suppliers.deleteAccount')}
              </Text>
            </TouchableOpacity>
          )}
        </MotiView>

      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:               { flex: 1 },
  centered:                { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chipsRow:                { flexDirection: 'row', paddingHorizontal: 20, gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  chip:                    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipText:                { fontSize: 12, color: '#fff', fontWeight: '500' },
  scroll:                  { padding: 16, paddingBottom: 40 },
  // Stats grid — matches customer screen exactly
  statsGrid:               { marginBottom: 14, gap: 10 },
  statsRow:                { flexDirection: 'row', gap: 10 },
  statCard:                { flex: 1, borderRadius: Theme.radius.card, padding: 14, alignItems: 'center', ...Theme.shadow.soft },
  statCardDebt:            { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FECACA' },
  statVal:                 { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statLabel:               { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  activityRow:             { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Theme.radius.card, paddingHorizontal: 14, paddingVertical: 10, ...Theme.shadow.soft },
  activityText:            { fontSize: 12, fontWeight: '500' },
  // Section cards — matches customer screen exactly
  section:                 { borderRadius: Theme.radius.card, padding: 16, marginBottom: 14, ...Theme.shadow.soft },
  sectionTitle:            { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  noData:                  { fontSize: 13, fontStyle: 'italic' },
  notesText:               { fontSize: 14, lineHeight: 20 },
  // Contact info rows
  infoRow:                 { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  infoText:                { fontSize: 14, fontWeight: '500' },
  saveBtn:                 { borderRadius: Theme.radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  saveBtnText:             { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Purchase rows (inside section card)
  purchaseRow:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  purchaseLeft:            { flex: 1 },
  purchaseNum:             { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  purchaseName:            { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  purchaseDate:            { fontSize: 11 },
  purchaseRight:           { alignItems: 'flex-end', gap: 4 },
  purchaseTotal:           { fontSize: 14, fontWeight: '800' },
  statusBadge:             { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:              { fontSize: 11, fontWeight: '700' },
  // Settled debts (inside section card)
  settledRow:              { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  settledInvoice:          { fontSize: 13, fontWeight: '600' },
  settledAmount:           { fontSize: 11, marginTop: 1 },
  settledBadge:            { backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  settledBadgeText:        { fontSize: 11, fontWeight: '700', color: '#10B981' },
  // Danger zone — matches customer screen exactly
  deleteSectionBorder:     { borderWidth: 1, borderColor: '#FECACA' },
  deleteWarningBox:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderRadius: Theme.radius.md, padding: 12, marginBottom: 12 },
  deleteWarningText:       { flex: 1, fontSize: 13, lineHeight: 18 },
  deleteAccountBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Theme.radius.md, paddingVertical: 12, borderWidth: 1.5, borderColor: Colors.error, backgroundColor: '#FFF5F5' },
  deleteAccountBtnDisabled:{ borderColor: Colors.gray200, backgroundColor: Colors.gray50 },
  deleteAccountBtnText:    { fontSize: 14, fontWeight: '700' },
});
