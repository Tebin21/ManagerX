import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
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
          if (timerRef.current) clearInterval(timerRef.current);
          AsyncStorage.setItem(`@seen_upgrade_receipt_${receipt.receiptId}`, 'true').catch(() => {});
          setVisible(false);
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

  if (!visible || !receipt) return null;

  // Format date and time
  const upgradedDateObj = receipt.upgradedAt ? new Date(receipt.upgradedAt) : new Date();
  const formattedDate = upgradedDateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = upgradedDateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const expiresDateStr = receipt.expiresAt
    ? new Date(receipt.expiresAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : isKu ? 'بێ سنوور (هەمیشەیی)' : 'Unlimited (Lifetime)';

  const formatLimitVal = (val: any) => {
    if (!val || val === 'unlimited') return isKu ? 'بێ سنوور' : 'Unlimited';
    return String(val);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        // Non-dismissible by user — strict requirement!
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

          {/* Countdown Timer Strip */}
          <View style={styles.timerStrip}>
            <View style={styles.timerPulseDot} />
            <Text style={styles.timerText}>
              {isKu
                ? `داخرانی خۆکارانە لە ماوەی: ${countdown} چرکە`
                : `Auto-dismissing in: ${countdown}s`}
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
                  {isKu ? 'وەسڵی فەرمی بەرزکردنەوەی ئەکاونت' : 'Official Account Upgrade Receipt'}
                </Text>
                <Text style={styles.receiptSubtitle}>
                  {isKu
                    ? 'پیرۆزە! ئەکاونتەکەت بە سەرکەوتوویی بەرزکرایەوە'
                    : 'Congratulations! Your account plan is successfully upgraded'}
                </Text>
              </View>
            </View>

            {/* Receipt Number & Date */}
            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>{isKu ? 'ژمارەی وەسڵ:' : 'Receipt No:'}</Text>
                <Text style={styles.metaValue}>{receipt.receiptId}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>{isKu ? 'کات و ساتی بەرزکردنەوە:' : 'Date & Time:'}</Text>
                <Text style={styles.metaValue}>{formattedDate} • {formattedTime}</Text>
              </View>
            </View>

            {/* User & Store Details */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{isKu ? 'ناوی کڕیار / مارکێت:' : 'Client / Store:'}</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{receipt.customerName || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{isKu ? 'ئیمەیڵی فەرمی:' : 'Account Email:'}</Text>
                <Text style={[styles.infoValue, { fontSize: 12.5 }]} numberOfLines={1}>{receipt.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{isKu ? 'ماوەی بەشداریکردن:' : 'Plan Duration:'}</Text>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{receipt.planDuration || (isKu ? 'بێ سنوور' : 'Unlimited')}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{isKu ? 'کاتی بەسەرچوون:' : 'Expires At:'}</Text>
                <Text style={[styles.infoValue, { color: '#34D399' }]}>{expiresDateStr}</Text>
              </View>
            </View>

            {/* Usage Limits Section */}
            {receipt.limits && (
              <View style={styles.limitsCard}>
                <View style={styles.limitsHeaderRow}>
                  <Ionicons name="options-outline" size={16} color="#38BDF8" />
                  <Text style={styles.limitsHeaderTitle}>
                    {isKu ? 'سنوورەکانی بەکارهێنان (Usage Limits):' : 'Plan Usage Limits:'}
                  </Text>
                </View>
                <View style={styles.limitsGrid}>
                  <View style={styles.limitTile}>
                    <Text style={styles.limitTileLabel}>{isKu ? 'کاڵا (ئایتم)' : 'Items'}</Text>
                    <Text style={styles.limitTileValue}>{formatLimitVal(receipt.limits.maxItems)}</Text>
                  </View>
                  <View style={styles.limitTile}>
                    <Text style={styles.limitTileLabel}>{isKu ? 'زۆرترین بڕ' : 'Max Qty'}</Text>
                    <Text style={styles.limitTileValue}>{formatLimitVal(receipt.limits.maxQuantity)}</Text>
                  </View>
                  <View style={styles.limitTile}>
                    <Text style={styles.limitTileLabel}>{isKu ? 'فرۆشتن' : 'Sales'}</Text>
                    <Text style={styles.limitTileValue}>{formatLimitVal(receipt.limits.maxSales)}</Text>
                  </View>
                  <View style={styles.limitTile}>
                    <Text style={styles.limitTileLabel}>{isKu ? 'وەسڵی چاپ' : 'Invoices'}</Text>
                    <Text style={styles.limitTileValue}>{formatLimitVal(receipt.limits.maxInvoices)}</Text>
                  </View>
                  <View style={styles.limitTile}>
                    <Text style={styles.limitTileLabel}>{isKu ? 'عەرز و ئۆفەر' : 'Quotations'}</Text>
                    <Text style={styles.limitTileValue}>{formatLimitVal(receipt.limits.maxQuotations)}</Text>
                  </View>
                  <View style={styles.limitTile}>
                    <Text style={styles.limitTileLabel}>{isKu ? 'ستۆری ئۆنلاین' : 'Online Store'}</Text>
                    <Text style={[styles.limitTileValue, { color: '#34D399' }]}>
                      {receipt.storeEnabled ? (isKu ? 'چالاککراوە' : 'Active') : (isKu ? 'سەرەکی' : 'Base')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Verification Seal Footer */}
            <View style={styles.footerNote}>
              <Ionicons name="checkmark-done-circle" size={18} color="#D4AF37" />
              <Text style={styles.footerNoteText}>
                {isKu
                  ? 'سیستەمی فەرمی فرۆشیار (Froshiar) • بەستراوە بە سێرڤەری هەور'
                  : 'Froshiar POS Official License • Cloud Verified'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  containerCard: {
    width: '100%',
    maxWidth: Math.min(SCREEN_WIDTH - 28, 480),
    maxHeight: '90%',
    backgroundColor: '#0F172A',
    borderColor: '#D4AF37',
    borderWidth: 1.5,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 20,
  },
  screenshotBanner: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.4)',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  cameraIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotBannerText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FBBF24',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    textAlign: 'right',
  },
  screenshotBannerSub: {
    fontSize: 11,
    color: '#E2E8F0',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    textAlign: 'right',
    marginTop: 2,
  },
  timerStrip: {
    backgroundColor: '#1E293B',
    paddingVertical: 7,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  timerPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 22,
    gap: 14,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#D4AF37',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    textAlign: 'center',
  },
  receiptSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    textAlign: 'center',
    marginTop: 3,
  },
  metaRow: {
    backgroundColor: '#131D31',
    borderColor: '#203152',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metaCol: {
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#203152',
  },
  metaLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  infoCard: {
    backgroundColor: '#131D31',
    borderColor: '#203152',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  planBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  planBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FBBF24',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  limitsCard: {
    backgroundColor: '#131D31',
    borderColor: '#203152',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  limitsHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  limitsHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#38BDF8',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  limitsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  limitTile: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: '#172338',
    borderColor: '#203152',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  limitTileLabel: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginBottom: 2,
    textAlign: 'center',
  },
  limitTileValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  footerNote: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
  },
});
