import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useResponsive } from '@/hooks/useResponsive';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';
import { useCapitalStore, type DrawerFullStats } from '@/store/capitalStore';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { formatDateShort } from '@/utils/formatters';

export function CapitalView() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const {
    isEnabled,
    initialCapital,
    deposits,
    activate,
    addDeposit,
    withdraw,
    deactivate,
    loadDrawerStats,
  } = useCapitalStore();

  const [stats, setStats] = useState<DrawerFullStats>({
    initialCapital: 0,
    netCapital: 0,
    salesCash: 0,
    customerDebtCash: 0,
    purchasesCash: 0,
    supplierDebtCash: 0,
    expensesCash: 0,
    currentBalance: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Activation flow states
  const [hasAgreed, setHasAgreed] = useState(false);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [initialAmountInput, setInitialAmountInput] = useState('1000000');
  const [initialNoteInput, setInitialNoteInput] = useState('');

  // Fund adjustment modal
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjType, setAdjType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [adjAmountInput, setAdjAmountInput] = useState('');
  const [adjNoteInput, setAdjNoteInput] = useState('');

  const refreshStats = useCallback(async () => {
    if (!isEnabled) return;
    setLoadingStats(true);
    try {
      const data = await loadDrawerStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load drawer stats:', e);
    } finally {
      setLoadingStats(false);
    }
  }, [isEnabled, loadDrawerStats]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats, deposits]);

  // ─── Activation Handlers ──────────────────────────────────────────────────
  const handleOpenActivate = () => {
    if (!hasAgreed) return;
    setInitialAmountInput('1000000');
    setInitialNoteInput('');
    setActivateModalOpen(true);
  };

  const handleConfirmActivate = () => {
    const amt = parseFloat(initialAmountInput.replace(/[^0-9.]/g, '')) || 0;
    if (amt <= 0) {
      Alert.alert(t('common.required'), t('capital.amountPlaceholder'));
      return;
    }
    activate(amt, initialNoteInput);
    setActivateModalOpen(false);
    setHasAgreed(false);
  };

  // ─── Adjustment Handlers ──────────────────────────────────────────────────
  const handleOpenAdjustment = (type: 'deposit' | 'withdrawal') => {
    setAdjType(type);
    setAdjAmountInput('');
    setAdjNoteInput('');
    setAdjModalOpen(true);
  };

  const handleConfirmAdjustment = () => {
    const amt = parseFloat(adjAmountInput.replace(/[^0-9.]/g, '')) || 0;
    if (amt <= 0) {
      Alert.alert(t('common.required'), t('capital.amountPlaceholder'));
      return;
    }
    if (adjType === 'deposit') {
      addDeposit(amt, adjNoteInput);
    } else {
      withdraw(amt, adjNoteInput);
    }
    setAdjModalOpen(false);
  };

  // ─── Deactivation Handler ────────────────────────────────────────────────
  const handleDeactivate = () => {
    Alert.alert(
      t('capital.deactivateTitle'),
      t('capital.deactivateMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('capital.deactivateConfirm'),
          style: 'destructive',
          onPress: () => {
            deactivate();
            setHasAgreed(false);
          },
        },
      ]
    );
  };

  const QUICK_AMOUNTS = [500000, 1000000, 2000000, 5000000];

  // ─── STATE A: INACTIVE / ONBOARDING ──────────────────────────────────────
  if (!isEnabled) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 280 }}
        >
          {/* Hero Banner */}
          <View style={[styles.heroCard, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.heroIconBox, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="cash" size={32} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.heroTitle,
                { color: colors.darkBlue, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('capital.title')}
            </Text>
            <Text style={[styles.heroSub, { color: colors.gray500, textAlign }]}>
              {t('capital.subtitle')}
            </Text>
          </View>

          {/* Explanation Section */}
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.darkBlue, textAlign },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
            ]}
          >
            {t('capital.introTitle')}
          </Text>

          {/* Point 1 */}
          <View style={[styles.pointCard, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.pointHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.pointBadge, { backgroundColor: '#3B82F618' }]}>
                <Ionicons name="wallet-outline" size={20} color="#3B82F6" />
              </View>
              <Text
                style={[
                  styles.pointTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('capital.point1Title')}
              </Text>
            </View>
            <Text style={[styles.pointDesc, { color: colors.gray600, textAlign }]}>
              {t('capital.point1Desc')}
            </Text>
          </View>

          {/* Point 2 */}
          <View style={[styles.pointCard, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.pointHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.pointBadge, { backgroundColor: '#EF444418' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#EF4444" />
              </View>
              <Text
                style={[
                  styles.pointTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('capital.point2Title')}
              </Text>
            </View>
            <Text style={[styles.pointDesc, { color: colors.gray600, textAlign }]}>
              {t('capital.point2Desc')}
            </Text>
          </View>

          {/* Point 3 */}
          <View style={[styles.pointCard, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.pointHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.pointBadge, { backgroundColor: '#10B98118' }]}>
                <Ionicons name="sync-outline" size={20} color="#10B981" />
              </View>
              <Text
                style={[
                  styles.pointTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('capital.point3Title')}
              </Text>
            </View>
            <Text style={[styles.pointDesc, { color: colors.gray600, textAlign }]}>
              {t('capital.point3Desc')}
            </Text>
          </View>

          {/* Point 4 */}
          <View style={[styles.pointCard, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.pointHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.pointBadge, { backgroundColor: '#F59E0B18' }]}>
                <Ionicons name="refresh-circle-outline" size={20} color="#F59E0B" />
              </View>
              <Text
                style={[
                  styles.pointTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('capital.point4Title')}
              </Text>
            </View>
            <Text style={[styles.pointDesc, { color: colors.gray600, textAlign }]}>
              {t('capital.point4Desc')}
            </Text>
          </View>

          {/* Agreement Checkbox */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setHasAgreed(!hasAgreed)}
            style={[
              styles.agreeRow,
              {
                backgroundColor: hasAgreed ? colors.primary + '14' : colors.white,
                borderColor: hasAgreed ? colors.primary : colors.lightBlue,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: hasAgreed ? colors.primary : 'transparent',
                  borderColor: hasAgreed ? colors.primary : colors.gray300,
                },
              ]}
            >
              {hasAgreed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text
              style={[
                styles.agreeText,
                { color: hasAgreed ? colors.darkBlue : colors.gray600, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('capital.agreeCheckbox')}
            </Text>
          </TouchableOpacity>

          {/* Activation Button */}
          <View style={{ marginTop: 14 }}>
            <PrimaryButton
              label={t('capital.activateBtn')}
              onPress={handleOpenActivate}
              disabled={!hasAgreed}
              fullWidth
            />
          </View>
        </MotiView>

        {/* Modal: Enter Initial Capital */}
        <Modal
          visible={activateModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setActivateModalOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalBox, { backgroundColor: colors.white }]}>
              <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="cash" size={24} color={colors.primary} />
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.darkBlue },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('capital.modalTitle')}
                </Text>
              </View>
              <Text style={[styles.modalDesc, { color: colors.gray500, textAlign }]}>
                {t('capital.modalDesc')}
              </Text>

              {/* Quick Select Chips */}
              <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {QUICK_AMOUNTS.map((amt) => {
                  const numValue = amt >= 1000000 ? String(amt / 1000000) : String(amt / 1000);
                  const unitText = amt >= 1000000
                    ? (isKurdish ? 'ملیۆن' : 'M')
                    : (isKurdish ? 'هەزار' : 'K');
                  const isSelected = initialAmountInput === String(amt);

                  return (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => setInitialAmountInput(String(amt))}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.gray100,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.chipInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text
                          style={[
                            styles.chipNum,
                            { color: isSelected ? '#FFFFFF' : colors.darkBlue },
                          ]}
                        >
                          {numValue}
                        </Text>
                        <Text
                          style={[
                            styles.chipUnit,
                            { color: isSelected ? '#FFFFFF' : colors.gray600 },
                            isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                          ]}
                        >
                          {unitText}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.gray50,
                    borderColor: colors.gray200,
                    color: colors.darkBlue,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                keyboardType="numeric"
                value={initialAmountInput}
                onChangeText={setInitialAmountInput}
                placeholder={t('capital.amountPlaceholder')}
                placeholderTextColor={colors.gray400}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.gray50,
                    borderColor: colors.gray200,
                    color: colors.darkBlue,
                    textAlign: isRTL ? 'right' : 'left',
                    marginTop: 10,
                  },
                ]}
                value={initialNoteInput}
                onChangeText={setInitialNoteInput}
                placeholder={t('capital.notePlaceholder')}
                placeholderTextColor={colors.gray400}
              />

              <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={() => setActivateModalOpen(false)}
                  style={[styles.modalCancelBtn, { borderColor: colors.gray200 }]}
                >
                  <Text
                    style={[
                      styles.modalCancelText,
                      { color: colors.gray500 },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmActivate}
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                >
                  <Text
                    style={[
                      styles.modalConfirmText,
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {t('capital.confirmActivate')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    );
  }

  // ─── STATE B: ACTIVE CAPITAL MANAGEMENT ─────────────────────────────────
  const isPositiveBalance = stats.currentBalance >= 0;
  const balanceColor = isPositiveBalance ? colors.success : colors.error;

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
      showsVerticalScrollIndicator={false}
    >
      <MotiView
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 280 }}
      >
        {/* Status Pill */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: '#10B98115',
              borderColor: '#10B98135',
              alignSelf: isRTL ? 'flex-end' : 'flex-start',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text
            style={[
              styles.statusText,
              { color: '#10B981' },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
            ]}
          >
            {t('capital.statusActive')}
          </Text>
        </View>

        {/* Hero Card: Current Drawer Balance */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: colors.white,
              borderColor: colors.lightBlue,
            },
          ]}
        >
          <View style={[styles.balanceCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.balanceIconWrap, { backgroundColor: balanceColor + '15' }]}>
              <Ionicons name="cash" size={24} color={balanceColor} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.balanceLabel, { color: colors.gray500 }]}>
                {t('capital.currentBalance')}
              </Text>
              <View style={[styles.balanceAmtRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <AmountText
                  value={Math.abs(stats.currentBalance)}
                  currency={null}
                  style={[styles.balanceBigAmt, { color: balanceColor }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                />
                <Text style={[styles.balanceCurrency, { color: balanceColor + 'AA' }]}> IQD</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Breakdown Grid */}
        <View style={styles.gridContainer}>
          {/* 1. Initial Capital */}
          <View style={[styles.gridCell, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.gridCellTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.miniIconBox, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="wallet" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.gridCellLabel, { color: colors.gray500, textAlign }]}>
                {t('capital.initialCapital')}
              </Text>
            </View>
            <AmountText
              value={stats.initialCapital}
              style={[styles.gridCellAmt, { color: colors.darkBlue, textAlign }]}
            />
          </View>

          {/* 2. Sales Cash (+) */}
          <View style={[styles.gridCell, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.gridCellTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.miniIconBox, { backgroundColor: colors.success + '18' }]}>
                <Ionicons name="arrow-up-circle" size={16} color={colors.success} />
              </View>
              <Text style={[styles.gridCellLabel, { color: colors.gray500, textAlign }]}>
                {t('capital.salesCash')}
              </Text>
            </View>
            <AmountText
              value={stats.salesCash}
              style={[styles.gridCellAmt, { color: colors.success, textAlign }]}
            />
          </View>

          {/* 3. Customer Debt Collected (+) */}
          <View style={[styles.gridCell, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.gridCellTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.miniIconBox, { backgroundColor: '#05966918' }]}>
                <Ionicons name="cash-outline" size={16} color="#059669" />
              </View>
              <Text style={[styles.gridCellLabel, { color: colors.gray500, textAlign }]}>
                {t('capital.customerDebtCash')}
              </Text>
            </View>
            <AmountText
              value={stats.customerDebtCash}
              style={[styles.gridCellAmt, { color: '#059669', textAlign }]}
            />
          </View>

          {/* 4. Purchases Cash (-) */}
          <View style={[styles.gridCell, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.gridCellTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.miniIconBox, { backgroundColor: colors.error + '18' }]}>
                <Ionicons name="cart" size={16} color={colors.error} />
              </View>
              <Text style={[styles.gridCellLabel, { color: colors.gray500, textAlign }]}>
                {t('capital.purchasesCash')}
              </Text>
            </View>
            <AmountText
              value={stats.purchasesCash}
              style={[styles.gridCellAmt, { color: colors.error, textAlign }]}
            />
          </View>

          {/* 5. Supplier Debt Paid (-) */}
          <View style={[styles.gridCell, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.gridCellTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.miniIconBox, { backgroundColor: '#DC262618' }]}>
                <Ionicons name="card-outline" size={16} color="#DC2626" />
              </View>
              <Text style={[styles.gridCellLabel, { color: colors.gray500, textAlign }]}>
                {t('capital.supplierDebtCash')}
              </Text>
            </View>
            <AmountText
              value={stats.supplierDebtCash}
              style={[styles.gridCellAmt, { color: '#DC2626', textAlign }]}
            />
          </View>

          {/* 6. Expenses (-) */}
          <View style={[styles.gridCell, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <View style={[styles.gridCellTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.miniIconBox, { backgroundColor: colors.warning + '18' }]}>
                <Ionicons name="receipt" size={16} color={colors.warning} />
              </View>
              <Text style={[styles.gridCellLabel, { color: colors.gray500, textAlign }]}>
                {t('capital.expensesCash')}
              </Text>
            </View>
            <AmountText
              value={stats.expensesCash}
              style={[styles.gridCellAmt, { color: colors.warning, textAlign }]}
            />
          </View>
        </View>

        {/* Quick Fund Adjustment Buttons */}
        <View style={[styles.actionBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.fundActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleOpenAdjustment('deposit')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text
              style={[
                styles.fundActionText,
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={2}
            >
              {t('capital.addFunds')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fundActionBtn, { backgroundColor: colors.gray200 }]}
            onPress={() => handleOpenAdjustment('withdrawal')}
            activeOpacity={0.8}
          >
            <Ionicons name="remove-circle" size={18} color={colors.darkBlue} />
            <Text
              style={[
                styles.fundActionText,
                { color: colors.darkBlue },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={2}
            >
              {t('capital.withdrawFunds')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions History */}
        {deposits.length > 0 && (
          <View style={[styles.historyCard, { backgroundColor: colors.white, borderColor: colors.lightBlue }]}>
            <Text
              style={[
                styles.historyTitle,
                { color: colors.darkBlue, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('capital.history')}
            </Text>

            {deposits.map((tx) => {
              const isDep = tx.type === 'initial' || tx.type === 'deposit';
              return (
                <View
                  key={tx.id}
                  style={[
                    styles.txRow,
                    { borderBottomColor: colors.lightBlue, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.txIconBox, { backgroundColor: isDep ? colors.success + '15' : colors.error + '15' }]}>
                    <Ionicons
                      name={isDep ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={isDep ? colors.success : colors.error}
                    />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.txTypeLabel, { color: colors.darkBlue }]}>
                      {tx.type === 'initial'
                        ? t('capital.initialCapital')
                        : tx.type === 'deposit'
                        ? t('capital.addFundsTitle')
                        : t('capital.withdrawTitle')}
                    </Text>
                    <Text style={[styles.txDate, { color: colors.gray400 }]}>
                      {formatDateShort(tx.date)} {tx.note ? `• ${tx.note}` : ''}
                    </Text>
                  </View>
                  <AmountText
                    value={tx.amount}
                    style={[styles.txAmount, { color: isDep ? colors.success : colors.error }]}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Deactivation Button */}
        <TouchableOpacity
          style={[styles.deactivateBtn, { borderColor: colors.error + '40', backgroundColor: colors.error + '0A' }]}
          onPress={handleDeactivate}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text
            style={[
              styles.deactivateText,
              { color: colors.error },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
            ]}
          >
            {t('capital.deactivateBtn')}
          </Text>
        </TouchableOpacity>
      </MotiView>

      {/* Modal: Add or Withdraw Funds */}
      <Modal
        visible={adjModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAdjModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.white }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons
                name={adjType === 'deposit' ? 'add-circle' : 'remove-circle'}
                size={24}
                color={adjType === 'deposit' ? colors.primary : colors.error}
              />
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.darkBlue },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {adjType === 'deposit' ? t('capital.addFundsTitle') : t('capital.withdrawTitle')}
              </Text>
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.gray50,
                  borderColor: colors.gray200,
                  color: colors.darkBlue,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              keyboardType="numeric"
              value={adjAmountInput}
              onChangeText={setAdjAmountInput}
              placeholder={t('capital.amountPlaceholder')}
              placeholderTextColor={colors.gray400}
              autoFocus
            />

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.gray50,
                  borderColor: colors.gray200,
                  color: colors.darkBlue,
                  textAlign: isRTL ? 'right' : 'left',
                  marginTop: 10,
                },
              ]}
              value={adjNoteInput}
              onChangeText={setAdjNoteInput}
              placeholder={t('capital.notePlaceholder')}
              placeholderTextColor={colors.gray400}
            />

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => setAdjModalOpen(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.gray200 }]}
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    { color: colors.gray500 },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmAdjustment}
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: adjType === 'deposit' ? colors.primary : colors.error },
                ]}
              >
                <Text
                  style={[
                    styles.modalConfirmText,
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('capital.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    marginBottom: 18,
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  pointCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  pointHeader: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  pointBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  pointDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  agreeRow: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreeText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  chipsRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chipInner: {
    alignItems: 'center',
    gap: 5,
  },
  chipNum: {
    fontSize: 13.5,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  chipUnit: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalActions: {
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  balanceCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
  },
  balanceCardTop: {
    alignItems: 'center',
    gap: 14,
  },
  balanceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceAmtRow: {
    alignItems: 'baseline',
  },
  balanceBigAmt: {
    fontSize: 26,
    fontWeight: '800',
  },
  balanceCurrency: {
    fontSize: 14,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  gridCell: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  gridCellTop: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  miniIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  gridCellAmt: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionBtnRow: {
    gap: 10,
    marginBottom: 16,
  },
  fundActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    minHeight: 48,
    overflow: 'hidden',
  },
  fundActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  txRow: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  deactivateText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
