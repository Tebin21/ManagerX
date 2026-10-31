import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useManagementStore } from '@/store/managementStore';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AccountUpgradeReceiptModal() {
  const currentUserAccount = useManagementStore((s) => s.currentUserAccount);
  const isKu = useLanguageStore((s) => s.language === 'ku');

  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(25);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const receipt = currentUserAccount?.upgradeReceipt;

  useEffect(() => {
    if (!receipt || !receipt.receiptId) return;

    let isMounted = true;
    const checkSeen = async () => {
      try {
        const seen = await AsyncStorage.getItem(`@seen_upgrade_receipt_${receipt.receiptId}`);
        if (!seen && isMounted) {
          setVisible(true);
          setCountdown(25);
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          } catch {}
        }
      } catch (err) {
        console.warn('[UpgradeReceiptModal] Check seen error:', err);
      }
    };

    checkSeen();

    return () => {
      isMounted = false;
    };
  }, [receipt?.receiptId]);

  useEffect(() => {
    if (!visible || !receipt?.receiptId) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Do NOT auto-dismiss! The user requested they must explicitly press the button
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, receipt?.receiptId]);

  const handleDismiss = async () => {
    if (countdown > 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (receipt?.receiptId) {
        await AsyncStorage.setItem(`@seen_upgrade_receipt_${receipt.receiptId}`, 'true');
      }
    } catch (err) {
      console.warn('[UpgradeReceiptModal] Save seen error:', err);
    }
    setVisible(false);
  };

  if (!visible || !receipt) return null;

  // Format Dates
  const startDateObj = receipt.startDate
    ? new Date(receipt.startDate)
    : receipt.upgradedAt
    ? new Date(receipt.upgradedAt)
    : new Date();

  const formattedStartDate = startDateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const expiresDateStr = receipt.expiresAt
    ? new Date(receipt.expiresAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : isKu ? 'بێ سنوور (هەمیشەیی)' : 'Unlimited (Lifetime)';

  const customerName =
    receipt.customerName ||
    currentUserAccount?.displayName ||
    receipt.email?.split('@')[0] ||
    '—';

  const priceAmount =
    receipt.priceAmount ||
    currentUserAccount?.priceAmount ||
    (isKu ? 'دیارینەکراو' : 'Custom');

  const planDuration =
    receipt.planDuration ||
    (isKu ? 'بێ سنوور (هەمیشەیی)' : 'Unlimited (Lifetime)');

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        // Non-dismissible by user during the 25 seconds as strictly required!
      }}
      statusBarTranslucent
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <View style={styles.overlay}>
        <View style={styles.containerCard}>
          {/* Top Banner: EXACT text requested by user */}
          <View style={styles.screenshotBanner}>
            <View style={styles.cameraIconBox}>
              <Ionicons name="camera" size={18} color="#D4AF37" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenshotBannerText}>
                {isKu ? 'دەتوانن سکرینی ئەم زانیارییە بکەن' : 'You can screenshot this information'}
              </Text>
              <Text style={styles.screenshotBannerSub}>
                {isKu ? 'بۆ ئەوەی وەک بەڵگە و وەسڵی فەرمی لای خۆتان بمێنێتەوە' : 'Keep as your official upgrade receipt and proof'}
              </Text>
            </View>
          </View>

          {/* Countdown / Status Strip */}
          <View style={[styles.timerStrip, countdown === 0 && styles.timerStripReady]}>
            <View style={[styles.timerPulseDot, countdown === 0 && styles.timerPulseDotReady]} />
            <Text style={[styles.timerText, countdown === 0 && styles.timerTextReady]}>
              {countdown > 0
                ? (isKu
                    ? `دوگمەی تێگەیشتم چالاک دەبێت دوای: ${countdown} چرکە`
                    : `Dismiss button unlocks in: ${countdown}s`)
                : (isKu
                    ? 'کاتی ٢٥ چرکە تەواو بوو • تکایە دوگمەی خوارەوە دابگرە'
                    : 'Time completed • Please press the button below')}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Header Badge */}
            <View style={styles.headerRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="shield-checkmark" size={26} color="#D4AF37" />
              </View>
              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <Text style={styles.receiptTitle}>
                  {isKu ? 'وەسڵی بەشداریکردن' : 'Subscription Receipt'}
                </Text>
                <Text style={styles.receiptSubtitle}>
                  {isKu
                    ? 'پیرۆزە! پاکێجەکەت بە سەرکەوتوویی کارا کرا'
                    : 'Congratulations! Your package is successfully activated'}
                </Text>
                <View style={styles.receiptIdBadge}>
                  <Text style={styles.receiptIdText}>#{receipt.receiptId}</Text>
                </View>
              </View>
            </View>

            {/* Simple Table (تەبلێ زۆر زۆر سادە و ڕێک) */}
            <View style={styles.tableCard}>
              {/* Row 1: Customer Name */}
              <View style={styles.tableRow}>
                <View style={styles.colLabel}>
                  <Text style={styles.labelTitle}>{isKu ? 'ناوی کڕیار / مارکێت:' : 'Customer Name:'}</Text>
                </View>
                <View style={styles.colValue}>
                  <Text style={styles.valStrong} numberOfLines={1}>{customerName}</Text>
                </View>
              </View>

              <View style={styles.tableDivider} />

              {/* Row 2: Account Email */}
              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <View style={styles.colLabel}>
                  <Text style={styles.labelTitle}>{isKu ? 'ئیمەیڵی فەرمی:' : 'Account Email:'}</Text>
                </View>
                <View style={styles.colValue}>
                  <Text style={[styles.valText, { fontSize: 12.5 }]} numberOfLines={1}>{receipt.email}</Text>
                </View>
              </View>

              <View style={styles.tableDivider} />

              {/* Row 3: Package Price (بڕی پارەی پاکێج) */}
              <View style={styles.tableRow}>
                <View style={styles.colLabel}>
                  <Text style={styles.labelTitle}>{isKu ? 'بڕی پارەی پاکێج:' : 'Package Price:'}</Text>
                </View>
                <View style={styles.colValue}>
                  <View style={styles.priceHighlightBadge}>
                    <Text style={styles.priceHighlightText}>{priceAmount}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tableDivider} />

              {/* Row 4: Package Duration (ماوەی پاکێج) */}
              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <View style={styles.colLabel}>
                  <Text style={styles.labelTitle}>{isKu ? 'ماوەی پاکێج:' : 'Plan Duration:'}</Text>
                </View>
                <View style={styles.colValue}>
                  <Text style={styles.valText}>{planDuration}</Text>
                </View>
              </View>

              <View style={styles.tableDivider} />

              {/* Row 5: Start Date (کاتی بەشداریکردن) */}
              <View style={styles.tableRow}>
                <View style={styles.colLabel}>
                  <Text style={styles.labelTitle}>{isKu ? 'کاتی بەشداریکردن:' : 'Start Date:'}</Text>
                </View>
                <View style={styles.colValue}>
                  <Text style={styles.valText}>{formattedStartDate}</Text>
                </View>
              </View>

              <View style={styles.tableDivider} />

              {/* Row 6: Expiry Date (کاتی کۆتاییهاتن) */}
              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <View style={styles.colLabel}>
                  <Text style={styles.labelTitle}>{isKu ? 'کاتی کۆتاییهاتن:' : 'Expiration Date:'}</Text>
                </View>
                <View style={styles.colValue}>
                  <Text style={[styles.valStrong, { color: '#34D399' }]}>{expiresDateStr}</Text>
                </View>
              </View>
            </View>

            {/* Official Verification Footer Seal */}
            <View style={styles.footerSeal}>
              <Ionicons name="checkmark-done-circle" size={17} color="#D4AF37" />
              <Text style={styles.footerSealText}>
                {isKu
                  ? 'سیستەمی فەرمی فرۆشیار (Froshiar) • مۆڵەتی پشتڕاستکراوە'
                  : 'Froshiar POS Official License • Cloud Verified'}
              </Text>
            </View>
          </ScrollView>

          {/* Pinned Bottom Action Button (تێگەیشتم و تەواو) */}
          <View style={styles.bottomActionContainer}>
            {countdown > 0 ? (
              <View style={[styles.dismissBtn, styles.dismissBtnDisabled]}>
                <Ionicons name="time-outline" size={20} color="#94A3B8" />
                <Text style={styles.dismissBtnTextDisabled}>
                  {isKu
                    ? `تێگەیشتم و تەواو (${countdown} چرکە)`
                    : `I Understand & Complete (${countdown}s)`}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.dismissBtn, styles.dismissBtnActive]}
                onPress={handleDismiss}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={22} color="#0F172A" />
                <Text style={styles.dismissBtnTextActive}>
                  {isKu ? 'تێگەیشتم و تەواو' : 'I Understand & Complete'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  containerCard: {
    width: Math.min(SCREEN_WIDTH - 24, 430),
    maxHeight: '90%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  screenshotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  cameraIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenshotBannerText: {
    color: '#FDE047',
    fontSize: 13.5,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  screenshotBannerSub: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    marginTop: 2,
  },
  timerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  timerPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 8,
  },
  timerText: {
    fontSize: 12,
    color: '#34D399',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 22,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptTitle: {
    fontSize: 17,
    color: '#FFFFFF',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  receiptSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    marginTop: 3,
  },
  receiptIdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  receiptIdText: {
    fontSize: 11,
    color: '#D4AF37',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  tableDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  colLabel: {
    flex: 1,
  },
  colValue: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  labelTitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
  },
  valText: {
    fontSize: 13,
    color: '#F1F5F9',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
  },
  valStrong: {
    fontSize: 13.5,
    color: '#FFFFFF',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  priceHighlightBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  priceHighlightText: {
    fontSize: 13.5,
    color: '#D4AF37',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  footerSeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  footerSealText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
  },
  timerStripReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderBottomColor: 'rgba(34, 197, 94, 0.25)',
  },
  timerPulseDotReady: {
    backgroundColor: '#22C55E',
  },
  timerTextReady: {
    color: '#4ADE80',
  },
  bottomActionContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 14 : 16,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.25)',
  },
  dismissBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dismissBtnDisabled: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dismissBtnActive: {
    backgroundColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  dismissBtnTextDisabled: {
    color: '#94A3B8',
    fontSize: 14.5,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  dismissBtnTextActive: {
    color: '#0F172A',
    fontSize: 15.5,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
});
