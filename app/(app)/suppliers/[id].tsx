import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
  Image,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { CompactAmount } from '@/components/shared/CompactAmount';
import { DateText } from '@/components/ui/DateText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/common/AppHeader';
import { LoadingView } from '@/components/ui/LoadingView';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KeyboardAwareScrollView, useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { AppSheet, AppSheetHeader, AppSheetOption } from '@/components/ui/AppSheet';
import { copyToPermanentStorage, resolveImageUri } from '@/lib/imageStorage';
import { ensureCameraAccess, ensureGalleryAccess } from '@/lib/mediaAccess';
import { useSupplierStore } from '@/store/supplierStore';
import { useDebtStore } from '@/store/debtStore';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { Theme } from '@/constants/theme';
import { getPurchasesBySupplierName, getSupplierFinancialTimeline, isDirectSupplierName } from '@/lib/sqlite';
import { FinancialTimelineItem } from '@/components/shared/FinancialTimelineItem';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import type { SupplierWithStats } from '@/types/suppliers';
import type { Purchase } from '@/types/purchases';
import type { PurchaseDebt, FinancialLedgerEvent } from '@/types/debt';
import { fmtIQD, sanitizeNumericInput } from '@/utils/formatters';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';

interface DebtCardProps {
  debt: PurchaseDebt;
  onPay: (debtId: number, amount: number, paymentMethod?: string) => Promise<void>;
}

function ActiveDebtCard({ debt, onPay }: DebtCardProps) {
  const { colors, isDark } = useAppTheme();
  const debtStyles = useMemo(() => getDebtStyles(colors), [colors]);
  const warningTint = useMemo(() => getStatusTint('warning', colors, isDark), [colors, isDark]);
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'fib'>('cash');
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
      `${fmtIQD(val)} IQD (${paymentMethod === 'fib' ? 'FIB' : (isKuLanguage ? 'کاش' : 'Cash')}) → ${debt.purchaseNumber ?? t('common.notFound')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setPaying(true);
            try { await onPay(debt.id, val, paymentMethod); setAmount(''); setPaymentMethod('cash'); }
            catch { Alert.alert(t('common.error'), t('common.tryAgain')); }
            finally { setPaying(false); }
          },
        },
      ]
    );
  }, [amount, debt, onPay, paymentMethod, isKuLanguage, t]);

  return (
    <View style={[debtStyles.card, { backgroundColor: isDark ? colors.gray100 : colors.white, borderWidth: 1, borderColor: isDark ? colors.gray200 : colors.gray200, padding: isRTL ? RTL_SPACING.cardPad : 14 }]}>
      {/* Line 1 — purchase ref + status badge */}
      <View style={[debtStyles.top, { flexDirection }]}>
        <IdText style={[debtStyles.ref, { color: colors.primary, textAlign }]} numberOfLines={1}>
          {debt.purchaseNumber ?? '—'}
        </IdText>
        <View style={[debtStyles.badge, { backgroundColor: warningTint.bg }]}>
          <Text style={[debtStyles.badgeText, { color: warningTint.text }]}>{t('common.debt')}</Text>
        </View>
      </View>

      {/* Line 2 — remaining label */}
      <Text style={[debtStyles.remainingLabel, { color: colors.gray400, textAlign }]}>
        {t('debt.remainingLabel')}
      </Text>
      {/* Line 3 — remaining amount */}
      <AmountText value={debt.remainingAmount} currency="IQD" variant="large" style={[debtStyles.remainingValue, { color: colors.error, textAlign }]} />
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
        <View style={[debtStyles.progressFill, { width: `${percent}%` as never, backgroundColor: colors.success }]} />
      </View>

      <View style={[{ flexDirection, gap: 8, marginTop: 4, marginBottom: 8 }]}>
        <TouchableOpacity
          onPress={() => setPaymentMethod('cash')}
          activeOpacity={0.8}
          style={[
            debtStyles.methodBtn,
            paymentMethod === 'cash'
              ? { borderColor: colors.primary, backgroundColor: colors.softBlue }
              : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.gray50 },
            { flexDirection },
          ]}
        >
          <Ionicons
            name="cash-outline"
            size={16}
            color={paymentMethod === 'cash' ? colors.primary : colors.gray400}
          />
          <Text
            style={[
              debtStyles.methodBtnText,
              { color: paymentMethod === 'cash' ? colors.primary : colors.gray500 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {t('debt.cash', 'کاش')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPaymentMethod('fib')}
          activeOpacity={0.8}
          style={[
            debtStyles.methodBtn,
            paymentMethod === 'fib'
              ? { borderColor: '#3B82F6', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF' }
              : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.gray50 },
            { flexDirection },
          ]}
        >
          <Ionicons
            name="phone-portrait-outline"
            size={15}
            color={paymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray400}
          />
          <Text
            style={[
              debtStyles.methodBtnText,
              { color: paymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray500 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {t('debt.fib', 'FIB')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[debtStyles.payRow, { borderTopColor: colors.gray100, flexDirection }]}>
        <TextInput
          style={[
            debtStyles.payInput,
            { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.gray50, textAlign: isRTL ? 'right' : 'left', writingDirection: 'ltr' },
            applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: amount, placeholder: t('suppliers.payAmountHint'), keyboardType: 'numeric' }), {}),
          ]}
          value={amount}
          onChangeText={(t) => setAmount(sanitizeNumericInput(t, 'numeric'))}
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
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Text style={[debtStyles.payBtnText, { color: colors.white }]}>{t('suppliers.payDebt')}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getDebtStyles(colors: AppColors) {
  return StyleSheet.create({
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
  methodBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  methodBtnText: { fontSize: 12, fontWeight: '700' },
  payBtn:        { height: 40, paddingHorizontal: 16, borderRadius: Theme.radius.md, alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  payBtnText:    { fontSize: 14, fontWeight: '700' },
  });
}

export default function SupplierDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { suppliers, loadSuppliers, editSupplier, deleteSupplier } = useSupplierStore();
  const { purchaseDebts, loadAll: loadDebts, payPurchaseDebt } = useDebtStore();
  const { colors, isDark } = useAppTheme();
  const cardBg = isDark ? colors.gray100 : colors.white;
  const cardBorder = isDark ? colors.gray200 : colors.gray200;
  const styles = useMemo(() => getStyles(colors), [colors]);
  const errorTint = useMemo(() => getStatusTint('error', colors, isDark), [colors, isDark]);
  const warningTint = useMemo(() => getStatusTint('warning', colors, isDark), [colors, isDark]);
  const successTint = useMemo(() => getStatusTint('success', colors, isDark), [colors, isDark]);
  const { isRTL, textAlign, writingDirection, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const sectionTitleStyle = [styles.sectionTitle, { color: colors.gray400, textAlign, writingDirection }];

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [timeline, setTimeline] = useState<FinancialLedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [logoSheetVisible, setLogoSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const supplier: SupplierWithStats | undefined = suppliers.find((s) => s.id === Number(id));
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isDirectSupplier = isDirectSupplierName(supplier?.name);

  const loadAll = useCallback(async () => {
    if (!supplier) return;
    setLoading(true);
    try {
      const [p, tl] = await Promise.all([
        getPurchasesBySupplierName(supplier.name),
        getSupplierFinancialTimeline(supplier.name),
      ]);
      setPurchases(p);
      setTimeline(tl);
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
      setEditImageUri(supplier.imageUri ?? null);
    }
  }, [supplier?.id, supplier?.imageUri]);

  const handleOpenLogoSheet = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setLogoSheetVisible(true);
  }, []);

  const pickFromCamera = useCallback(async () => {
    setLogoSheetVisible(false);
    try {
      const access = await ensureCameraAccess();
      if (access === 'denied-first-time') return;
      if (access === 'denied-repeat') {
        Alert.alert(
          t('inventory.cameraAccessNeededTitle'),
          t('inventory.cameraAccessNeededMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const tempUri = result.assets[0].uri;
      let finalUri = tempUri;
      try {
        finalUri = await copyToPermanentStorage(tempUri, 'supplier_logos');
      } catch (saveErr) {
        console.warn('[SupplierDetail] permanent save skipped, using temp URI:', saveErr);
      }
      setEditImageUri(finalUri);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    } catch (err) {
      console.error('[SupplierDetail] camera error:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [t]);

  const pickFromGallery = useCallback(async () => {
    setLogoSheetVisible(false);
    try {
      const access = await ensureGalleryAccess();
      if (access === 'denied-first-time') return;
      if (access === 'denied-repeat') {
        Alert.alert(
          t('inventory.galleryAccessNeededTitle'),
          t('inventory.galleryAccessNeededMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const tempUri = result.assets[0].uri;
      let finalUri = tempUri;
      try {
        finalUri = await copyToPermanentStorage(tempUri, 'supplier_logos');
      } catch (saveErr) {
        console.warn('[SupplierDetail] permanent save skipped, using temp URI:', saveErr);
      }
      setEditImageUri(finalUri);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    } catch (err) {
      console.error('[SupplierDetail] gallery error:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [t]);

  const removeLogo = useCallback(() => {
    setLogoSheetVisible(false);
    setEditImageUri(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
  }, []);

  const activeDebts = purchaseDebts.filter(
    (d) => d.supplierName.toLowerCase() === (supplier?.name ?? '').toLowerCase() &&
      d.status === 'active' && d.remainingAmount > 0,
  );
  const totalRemaining = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
  const totalPaid = purchaseDebts
    .filter((d) => d.supplierName.toLowerCase() === (supplier?.name ?? '').toLowerCase())
    .reduce((s, d) => s + d.paidAmount, 0);

  const canDelete = purchases.length === 0 && activeDebts.length === 0 && !isDirectSupplier;

  const handlePay = useCallback(async (debtId: number, amount: number, paymentMethod?: string) => {
    await payPurchaseDebt(debtId, amount, undefined, paymentMethod);
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
        imageUri: editImageUri ? editImageUri.trim() : null,
      });
      setEditing(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
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
  }, [supplier, editName, editPhone, editAddress, editNotes, editImageUri, editSupplier, t]);

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
    if (isDirectSupplier) {
      Alert.alert(
        t('common.error'),
        isKuLanguage
          ? 'ئەم دابینکەرە تایبەتە بە کڕینی ڕاستەوخۆ (سیستەم) و بە هیچ شێوەیەک ناتوانرێت بسڕدرێتەوە.'
          : 'Direct Supplier is a permanent system account and cannot be deleted.'
      );
      return;
    }
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
              if (msg === 'CANNOT_DELETE_DIRECT_SUPPLIER') {
                Alert.alert(
                  t('common.error'),
                  isKuLanguage
                    ? 'ئەم دابینکەرە تایبەتە بە کڕینی ڕاستەوخۆ (سیستەم) و بە هیچ شێوەیەک ناتوانرێت بسڕدرێتەوە.'
                    : 'Direct Supplier is a permanent system account and cannot be deleted.'
                );
              } else if (msg === 'SUPPLIER_HAS_ACTIVE_DEBTS') {
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
  }, [supplier, isDirectSupplier, isKuLanguage, deleteSupplier, router, t]);

  if (!supplier) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('suppliers.title')} showBack onBack={() => router.back()} />
        <LoadingView />
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
          isDirectSupplier ? undefined : (
            <HeaderActionButton
              icon={editing ? 'close-outline' : 'create-outline'}
              onPress={() => setEditing((v) => !v)}
            />
          )
        }
      />

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Supplier contact pills (phone, address, direct badge) */}
        {(supplier.phone || supplier.address || isDirectSupplier) ? (
          <MotiView
            from={{ opacity: 0, translateY: -6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            style={styles.contactContainer}
          >
            {isDirectSupplier && (
              <View style={[styles.directCustomerChip, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FFFBEB', borderColor: isDark ? '#D97706' : '#FDE68A', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="flash" size={13} color="#D97706" />
                <Text style={[styles.directCustomerText, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                  {isKuLanguage ? 'دابینکەری ڕاستەوخۆ (سیستەم)' : 'Direct Supplier'}
                </Text>
              </View>
            )}

            {supplier.phone ? (
              <View
                style={[styles.phonePill, { backgroundColor: cardBg, borderColor: cardBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View style={[styles.contactPillIcon, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5' }]}>
                  <Ionicons name="call-outline" size={14} color={colors.success} />
                </View>
                <Text style={[styles.phonePillText, { color: colors.black }]}>
                  {supplier.phone}
                </Text>
              </View>
            ) : null}

            {supplier.address ? (
              <View style={[styles.addressPill, { backgroundColor: cardBg, borderColor: cardBorder, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }]}>
                <View style={[styles.contactPillIcon, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.1)', marginTop: 2 }]}>
                  <Ionicons name="location-outline" size={15} color={colors.primary} />
                </View>
                <View style={styles.addressContent}>
                  <Text style={[styles.addressLabel, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
                    {isKuLanguage ? 'ناونیشان' : 'Address'}
                  </Text>
                  <Text style={[styles.addressText, { color: colors.gray700, textAlign: isRTL ? 'right' : 'left' }]}>
                    {supplier.address}
                  </Text>
                </View>
              </View>
            ) : null}
          </MotiView>
        ) : null}

        {/* Stats 2×2 grid */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220 }}
          style={styles.statsGrid}
        >
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
              <Ionicons name="cart-outline" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
              <Text style={[styles.statVal, { color: colors.black }]}>{supplier.purchaseCount}</Text>
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('suppliers.purchaseCount')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
              <Ionicons name="cash-outline" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
              <CompactAmount value={supplier.totalSpent} style={[styles.statVal, { color: colors.primary }]} />
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('suppliers.totalSpent')}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }, totalRemaining > 0 && { backgroundColor: errorTint.bg, borderWidth: 1, borderColor: colors.error }]}>
              <Ionicons name="alert-circle-outline" size={16} color={totalRemaining > 0 ? colors.error : colors.gray300} style={{ marginBottom: 4 }} />
              {totalRemaining > 0 ? (
                <CompactAmount value={totalRemaining} showCurrency={false} style={[styles.statVal, { color: colors.error }]} />
              ) : (
                <Text style={[styles.statVal, { color: colors.black }]} numberOfLines={1}>—</Text>
              )}
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('suppliers.remainingDebt')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={totalPaid > 0 ? colors.success : colors.gray300} style={{ marginBottom: 4 }} />
              {totalPaid > 0 ? (
                <CompactAmount value={totalPaid} showCurrency={false} style={[styles.statVal, { color: colors.success }]} />
              ) : (
                <Text style={[styles.statVal, { color: colors.black }]} numberOfLines={1}>—</Text>
              )}
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('suppliers.totalPaid')}</Text>
            </View>
          </View>
          {supplier.lastPurchaseDate ? (
            <View
              style={[
                styles.activityRow,
                {
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  flexDirection,
                },
              ]}
            >
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text
                style={[
                  styles.activityText,
                  {
                    color: colors.gray500,
                    textAlign,
                    writingDirection,
                  },
                ]}
              >
                {t('suppliers.lastPurchase')}:{' '}
                <DateText value={supplier.lastPurchaseDate} size="small" style={{ color: colors.black, fontWeight: '600' }} />
              </Text>
            </View>
          ) : null}
        </MotiView>

        {/* Contact info / edit form */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 50 }}
          style={[styles.section, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}
        >
          <Text style={sectionTitleStyle}>{t('suppliers.contactInfo')}</Text>
          {editing ? (
            <View>
              {/* Supplier Logo / Image Picker */}
              <View style={styles.avatarPickerWrap}>
                <TouchableOpacity
                  style={[
                    styles.avatarPickerBox,
                    {
                      borderColor: editImageUri ? colors.primary : colors.gray200,
                      backgroundColor: editImageUri ? (isDark ? colors.gray100 : '#FFFFFF') : (isDark ? colors.gray100 : colors.gray50),
                    },
                  ]}
                  onPress={handleOpenLogoSheet}
                  activeOpacity={0.8}
                  accessibilityLabel={isKuLanguage ? 'لۆگۆی دابینکەر' : 'Supplier Logo'}
                >
                  {editImageUri ? (
                    <>
                      <Image
                        source={{ uri: resolveImageUri(editImageUri) || editImageUri }}
                        style={styles.avatarPickerImage}
                        resizeMode="cover"
                      />
                      <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary, borderColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
                        <Ionicons name="pencil" size={12} color="#FFFFFF" />
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons name="business-outline" size={32} color={colors.primary} />
                      <View style={[styles.avatarAddBadge, { backgroundColor: colors.primary, borderColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
                        <Ionicons name="camera" size={11} color="#FFFFFF" />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenLogoSheet} hitSlop={8} style={{ marginTop: 8 }}>
                  <Text
                    style={[
                      styles.avatarPickerHint,
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                      { color: editImageUri ? colors.primary : colors.gray500, textAlign: 'center' },
                    ]}
                  >
                    {editImageUri
                      ? (isKuLanguage ? 'گۆڕین یان سڕینەوەی لۆگۆ' : 'Change or remove logo')
                      : (isKuLanguage ? 'دانانی وێنە یان لۆگۆی دابینکەر' : 'Set supplier logo or brand image')}
                  </Text>
                </TouchableOpacity>
              </View>

              <AppTextInput label={t('suppliers.name')} value={editName} onChangeText={setEditName}
                placeholder={t('suppliers.name')} autoCapitalize="words" />
              <AppTextInput label={t('suppliers.phone')} value={editPhone} onChangeText={(t) => setEditPhone(sanitizeNumericInput(t, 'phone-pad'))}
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
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={[styles.saveBtnText, { color: colors.white }]}>{t('suppliers.editSave')}</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {supplier.imageUri ? (
                <View style={styles.viewAvatarWrap}>
                  <Image
                    source={{ uri: resolveImageUri(supplier.imageUri) || supplier.imageUri }}
                    style={[styles.viewAvatarImage, { borderColor: colors.primary }]}
                    resizeMode="cover"
                  />
                </View>
              ) : null}
              <View style={[styles.infoRow, { borderBottomColor: colors.gray100, flexDirection }]}>
                <Ionicons name="business-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoText, { color: colors.black, textAlign, writingDirection }]}>{supplier.name}</Text>
              </View>
              {supplier.phone ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.gray100, flexDirection }]}>
                  <Ionicons name="call-outline" size={16} color={colors.gray400} />
                  <Text style={[styles.infoText, { color: colors.black, textAlign, writingDirection }]}>{supplier.phone}</Text>
                </View>
              ) : null}
              {supplier.address ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.gray100, flexDirection }]}>
                  <Ionicons name="location-outline" size={16} color={colors.gray400} />
                  <Text style={[styles.infoText, { color: colors.black, textAlign, writingDirection }]}>{supplier.address}</Text>
                </View>
              ) : null}
              {supplier.notes ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.gray100, flexDirection }]}>
                  <Ionicons name="document-text-outline" size={16} color={colors.gray400} />
                  <Text style={[styles.infoText, { color: colors.black, textAlign, writingDirection }]}>{supplier.notes}</Text>
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
            style={[styles.section, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}
          >
            <Text style={sectionTitleStyle}>
              {t('suppliers.activeDebts')} ({activeDebts.length})
            </Text>
            {activeDebts.map((debt) => (
              <ActiveDebtCard key={debt.id} debt={debt} onPay={handlePay} />
            ))}
          </MotiView>
        )}

        {/* Financial timeline — permanent debt lifecycle history (created → payments → fully paid) */}
        {timeline.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 100 }}
            style={[styles.section, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}
          >
            <Text style={sectionTitleStyle}>
              {t('suppliers.financialTimeline')}
            </Text>
            {timeline.map((event, i) => {
              const prev = timeline[i - 1];
              const showDivider = prev && prev.debtId !== event.debtId;
              return (
                <React.Fragment key={`${event.debtId}-${event.paymentId ?? 'settled'}-${event.type}`}>
                  {showDivider && <View style={[styles.timelineDivider, { backgroundColor: colors.gray100 }]} />}
                  <FinancialTimelineItem event={event} isLast={i === timeline.length - 1} />
                </React.Fragment>
              );
            })}
          </MotiView>
        )}

        {/* Purchase History */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 120 }}
          style={[styles.section, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}
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
                  style={[styles.purchaseRow, { borderBottomColor: colors.gray100, flexDirection }]}
                  onPress={() => router.push({ pathname: '/(app)/invoices', params: { tab: 'purchases', id: String(p.id) } } as never)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.purchaseLeft, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <IdText style={[styles.purchaseNum, { color: colors.primary, textAlign }]}>{p.purchaseNumber}</IdText>
                    <Text style={[styles.purchaseName, { color: colors.black, textAlign }]} numberOfLines={1}>{p.productName}</Text>
                    <DateText value={p.date ?? p.createdAt} size="small" style={[styles.purchaseDate, { color: colors.gray400, textAlign }]} />
                  </View>
                  <View style={[styles.purchaseRight, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                    <AmountText value={p.totalIQD} currency="IQD" style={[styles.purchaseTotal, { color: colors.primary }]} />
                    <View style={[styles.statusBadge, { backgroundColor: p.paymentStatus === 'paid' ? successTint.bg : warningTint.bg }]}>
                      <Text style={[styles.statusText, { color: p.paymentStatus === 'paid' ? successTint.text : warningTint.text }]}>
                        {p.paymentStatus === 'paid' ? t('common.paid') : t('common.debt')}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={chevronForward as never}
                    size={16}
                    color={colors.gray300}
                    style={{ marginStart: isRTL ? 0 : 8, marginEnd: isRTL ? 8 : 0 }}
                  />
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
            style={[styles.section, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}
          >
            <Text style={sectionTitleStyle}>{t('suppliers.notes')}</Text>
            <Text style={[styles.notesText, { color: colors.black, textAlign, writingDirection }]}>{supplier.notes}</Text>
          </MotiView>
        ) : null}

        {/* Danger Zone or Permanent System Notice */}
        {isDirectSupplier ? (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 200 }}
            style={[
              styles.section,
              {
                borderWidth: 1.5,
                borderColor: isDark ? '#D97706' : '#F59E0B',
                backgroundColor: isDark ? '#1E293B' : '#FFFBEB',
              },
            ]}
          >
            <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 8 }]}>
              <Ionicons name="shield-checkmark" size={22} color="#D97706" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FBBF24' : '#B45309' }}>
                {t('suppliers.permanentAccountTitle')}
              </Text>
            </View>
            <Text style={{ fontSize: 13, lineHeight: 21, color: isDark ? '#E2E8F0' : '#78350F', textAlign }}>
              {t('suppliers.permanentAccountDesc')}
            </Text>
          </MotiView>
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 200 }}
            style={[styles.section, { borderWidth: 1, borderColor: colors.error, backgroundColor: cardBg }]}
          >
            <Text style={sectionTitleStyle}>
              {t('customers.deleteAccountSection')}
            </Text>
            {!canDelete ? (
              <>
                <View style={[styles.deleteWarningBox, { backgroundColor: warningTint.bg }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                  <Text style={[styles.deleteWarningText, { color: colors.gray600, textAlign, writingDirection }]}>
                    {purchases.length > 0
                      ? t('suppliers.hasPurchases')
                      : t('suppliers.hasActiveDebts')}
                  </Text>
                </View>
                <TouchableOpacity style={[styles.deleteAccountBtn, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]} disabled activeOpacity={1}>
                  <Ionicons name="trash-outline" size={16} color={colors.gray400} />
                  <Text style={[styles.deleteAccountBtnText, { color: colors.gray400 }]}>
                    {t('suppliers.deleteAccount')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={[styles.deleteAccountBtn, { borderColor: colors.error, backgroundColor: errorTint.bg }]} onPress={handleDelete} activeOpacity={0.82}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.deleteAccountBtnText, { color: colors.error }]}>
                  {t('suppliers.deleteAccount')}
                </Text>
              </TouchableOpacity>
            )}
          </MotiView>
        )}

      </KeyboardAwareScrollView>

      {/* Logo Picker Action Sheet */}
      <AppSheet visible={logoSheetVisible} onClose={() => setLogoSheetVisible(false)}>
        <AppSheetHeader
          title={isKuLanguage ? 'لۆگۆ و وێنەی دابینکەر' : 'Supplier Brand / Logo'}
          onClose={() => setLogoSheetVisible(false)}
        />
        <Text
          style={[
            styles.sheetSubtitle,
            isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
            { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {editName || supplier.name}
        </Text>

        {editImageUri ? (
          <View style={styles.sheetPreviewWrap}>
            <View
              style={[
                styles.sheetPreviewBox,
                {
                  borderColor: colors.primary,
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                },
              ]}
            >
              <Image
                source={{ uri: resolveImageUri(editImageUri) || editImageUri }}
                style={styles.sheetPreviewImage}
                resizeMode="cover"
              />
            </View>
          </View>
        ) : null}

        <AppSheetOption
          icon="camera-outline"
          label={isKuLanguage ? 'گرتنی وێنە بە کامێرا' : 'Take Photo with Camera'}
          indicator="chevron"
          onPress={pickFromCamera}
        />

        <AppSheetOption
          icon="images-outline"
          label={isKuLanguage ? 'هەڵبژاردن لە گەلەری' : 'Choose from Gallery'}
          indicator="chevron"
          onPress={pickFromGallery}
        />

        {editImageUri ? (
          <TouchableOpacity
            style={[styles.removeOptionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={removeLogo}
            activeOpacity={0.7}
          >
            <View style={[styles.removeIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </View>
            <Text
              style={[
                styles.removeOptionLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                { color: '#EF4444', textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {isKuLanguage ? 'سڕینەوەی لۆگۆ' : 'Remove Logo'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.sheetCancelBtn, { borderTopColor: colors.gray100 }]}
          onPress={() => setLogoSheetVisible(false)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.sheetCancelText,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
              { color: colors.gray500, textAlign: 'center' },
            ]}
          >
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </AppSheet>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: AppColors) {
  return StyleSheet.create({
  container:               { flex: 1 },
  centered:                { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contactContainer:        { marginBottom: 12, gap: 8 },
  avatarPickerWrap:        { alignItems: 'center', marginBottom: 18 },
  avatarPickerBox:         { width: 84, height: 84, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  avatarPickerImage:       { width: 80, height: 80, borderRadius: 20 },
  avatarEditBadge:         { position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  avatarAddBadge:          { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 1.5 },
  avatarPickerHint:        { fontSize: 12.5, fontWeight: '600' },
  viewAvatarWrap:          { alignItems: 'center', marginBottom: 14 },
  viewAvatarImage:         { width: 74, height: 74, borderRadius: 20, borderWidth: 2 },
  sheetSubtitle:           { fontSize: 13, marginTop: -8, marginBottom: 10 },
  sheetPreviewWrap:        { alignItems: 'center', marginVertical: 12 },
  sheetPreviewBox:         { width: 76, height: 76, borderRadius: 20, borderWidth: 2, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  sheetPreviewImage:       { width: 76, height: 76 },
  removeOptionRow:         { alignItems: 'center', paddingVertical: 14, gap: 12 },
  removeIconWrap:          { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  removeOptionLabel:       { fontSize: 14, fontWeight: '700' },
  sheetCancelBtn:          { paddingVertical: 14, borderTopWidth: 1, marginTop: 6, alignItems: 'center' },
  sheetCancelText:         { fontSize: 14 },
  directCustomerChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  directCustomerText:      { fontSize: 12, fontWeight: '700' },
  phonePill:               { width: '100%', minHeight: 46, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, alignItems: 'center', gap: 10, ...Theme.shadow.soft },
  phonePillText:           { fontSize: 14, fontWeight: '700' },
  addressPill:             { width: '100%', minHeight: 52, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, gap: 10, ...Theme.shadow.soft },
  contactPillIcon:         { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addressContent:          { flex: 1, justifyContent: 'center' },
  addressLabel:            { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  addressText:             { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  scroll:                  { padding: 16, paddingBottom: 40 },
  // Stats grid — matches customer screen exactly
  statsGrid:               { marginBottom: 14, gap: 10 },
  statsRow:                { flexDirection: 'row', gap: 10 },
  statCard:                { flex: 1, borderRadius: Theme.radius.card, padding: 14, alignItems: 'center', ...Theme.shadow.soft },
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
  saveBtnText:             { fontSize: 15, fontWeight: '700' },
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
  timelineDivider:         { height: 1, marginVertical: 10 },
  // Danger zone — matches customer screen exactly
  deleteWarningBox:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Theme.radius.md, padding: 12, marginBottom: 12 },
  deleteWarningText:       { flex: 1, fontSize: 13, lineHeight: 18 },
  deleteAccountBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Theme.radius.md, paddingVertical: 12, borderWidth: 1.5 },
  deleteAccountBtnText:    { fontSize: 14, fontWeight: '700' },
  });
}
