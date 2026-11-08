import React, { useEffect, useState } from 'react';
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
import { formatDate } from '@/utils/formatters';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ModalLang = 'ku' | 'ar' | 'en';

const TRANSLATIONS: Record<ModalLang, {
  selectLangTitle: string;
  selectLangSub: string;
  screenshotBannerText: string;
  screenshotBannerSub: string;
  timerCounting: string;
  timerReady: string;
  receiptTitle: string;
  receiptSubtitle: string;
  customerName: string;
  accountEmail: string;
  packagePrice: string;
  packageDuration: string;
  startDate: string;
  expiryDate: string;
  unlimitedLifetime: string;
  notSpecified: string;
  footerSeal: string;
  dismiss: string;
  sec: string;
}> = {
  ku: {
    selectLangTitle: 'زمانێک هەڵبژێرە',
    selectLangSub: 'تکایە زمانێک دیاری بکە بۆ پیشاندانی وەسڵی فەرمی',
    screenshotBannerText: 'دەتوانن سکرینی ئەم زانیارییە بکەن',
    screenshotBannerSub: 'بۆ ئەوەی وەک بەڵگە و وەسڵی فەرمی لای خۆتان بمێنێتەوە',
    timerCounting: 'دوگمەی تێگەیشتم چالاک دەبێت دوای:',
    timerReady: 'مۆڵەتی بەشداریکردن پشتڕاستکراوەیە • دەتوانن سکرینی بکەن',
    receiptTitle: 'وەسڵی بەشداریکردن',
    receiptSubtitle: 'پیرۆزە! پاکێجەکەت بە سەرکەوتوویی کارا کرا',
    customerName: 'ناوی کڕیار / مارکێت:',
    accountEmail: 'ئیمەیڵی فەرمی:',
    packagePrice: 'بڕی پارەی پاکێج:',
    packageDuration: 'ماوەی پاکێج:',
    startDate: 'کاتی بەشداریکردن:',
    expiryDate: 'کاتی کۆتاییهاتن:',
    unlimitedLifetime: 'بێ سنوور (هەمیشەیی)',
    notSpecified: 'دیارینەکراو',
    footerSeal: 'سیستەمی فەرمی فرۆشیار (Froshiar) • مۆڵەتی پشتڕاستکراوە',
    dismiss: 'تێگەیشتم و تەواو',
    sec: 'چرکە',
  },
  ar: {
    selectLangTitle: 'اختر لغة العرض',
    selectLangSub: 'الرجاء اختيار لغة لعرض إيصال الاشتراك الرسمي',
    screenshotBannerText: 'يمكنك أخذ لقطة شاشة لهذه المعلومات',
    screenshotBannerSub: 'للاحتفاظ بها كإثبات رسمي ووصل اشتراك لديك',
    timerCounting: 'سيتم تفعيل زر التأكيد بعد:',
    timerReady: 'تم تأكيد ترخيص الاشتراك • يمكنك الاحتفاظ بلقطة الشاشة',
    receiptTitle: 'إيصال الاشتراك الرسمي',
    receiptSubtitle: 'مبروك! تم تفعيل باقتك بنجاح',
    customerName: 'اسم العميل / المتجر:',
    accountEmail: 'البريد الإلكتروني الرسمي:',
    packagePrice: 'سعر الباقة:',
    packageDuration: 'مدة الباقة:',
    startDate: 'تاريخ بدء الاشتراك:',
    expiryDate: 'تاريخ انتهاء الاشتراك:',
    unlimitedLifetime: 'غير محدود (مدى الحياة)',
    notSpecified: 'غير محدد',
    footerSeal: 'نظام فروشیار (Froshiar) الرسمي • ترخيص معتمد سحابياً',
    dismiss: 'فهمت وتم',
    sec: 'ثانية',
  },
  en: {
    selectLangTitle: 'Select Display Language',
    selectLangSub: 'Please choose a language to view your official subscription receipt',
    screenshotBannerText: 'You can screenshot this information',
    screenshotBannerSub: 'Keep this as your official subscription proof and receipt',
    timerCounting: 'Dismiss button unlocks in:',
    timerReady: 'Subscription license verified • You can take a screenshot',
    receiptTitle: 'Official Subscription Receipt',
    receiptSubtitle: 'Congratulations! Your package is successfully activated',
    customerName: 'Customer / Store Name:',
    accountEmail: 'Official Account Email:',
    packagePrice: 'Package Price:',
    packageDuration: 'Plan Duration:',
    startDate: 'Subscription Date:',
    expiryDate: 'Expiration Date:',
    unlimitedLifetime: 'Unlimited (Lifetime)',
    notSpecified: 'Custom / Not specified',
    footerSeal: 'Froshiar POS Official License • Cloud Verified',
    dismiss: 'I Understand & Complete',
    sec: 's',
  },
};

export function AccountUpgradeReceiptModal() {
  const currentUserAccount = useManagementStore((s) => s.currentUserAccount);
  const appLang = useLanguageStore((s) => s.language);

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<'lang' | 'receipt'>('lang');
  const [selectedLang, setSelectedLang] = useState<ModalLang>(
    appLang === 'en' ? 'en' : 'ku'
  );

  const receipt = currentUserAccount?.upgradeReceipt || null;
  const receiptId = receipt?.receiptId?.trim() || '';
  const accountEmail = (currentUserAccount?.email || receipt?.email || '').trim().toLowerCase();

  // Helper to mark this receipt as seen across multiple persistent keys
  const markReceiptSeen = async () => {
    if (!receiptId) return;
    try {
      const tasks: Promise<any>[] = [
        AsyncStorage.setItem(`@seen_upgrade_receipt_${receiptId}`, 'true'),
        AsyncStorage.setItem(`@seen_upgrade_receipt_shown_${receiptId}`, 'true'),
      ];
      if (accountEmail) {
        tasks.push(
          AsyncStorage.setItem(`@last_seen_upgrade_receipt_${accountEmail}`, receiptId),
          AsyncStorage.setItem(`@seen_upgrade_receipt_user_${accountEmail}_${receiptId}`, 'true')
        );
      }
      await Promise.all(tasks);
    } catch (err) {
      console.warn('[UpgradeReceiptModal] Mark seen error:', err);
    }
  };

  useEffect(() => {
    if (!receipt || !receiptId) return;

    let isMounted = true;
    const checkSeen = async () => {
      try {
        const seenStorageKey = `@seen_upgrade_receipt_${receiptId}`;
        const lastSeenAccountKey = `@last_seen_upgrade_receipt_${accountEmail}`;

        const [seen, lastSeenForAccount] = await Promise.all([
          AsyncStorage.getItem(seenStorageKey),
          accountEmail ? AsyncStorage.getItem(lastSeenAccountKey) : null,
        ]);

        // Already seen or acknowledged for this receipt ID or account
        if (seen === 'true' || (lastSeenForAccount && lastSeenForAccount === receiptId)) {
          return;
        }

        // If the upgrade is older than 14 days, don't suddenly pop up if the app wasn't opened for a long time
        if (receipt.upgradedAt || receipt.startDate) {
          const upgradeTime = new Date(receipt.upgradedAt || receipt.startDate).getTime();
          const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
          if (!isNaN(upgradeTime) && upgradeTime < fourteenDaysAgo) {
            await markReceiptSeen();
            return;
          }
        }

        if (isMounted) {
          // Immediately mark as seen so closing/killing the app never triggers repeated popups
          await markReceiptSeen();
          setVisible(true);
          setStep('lang');
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
  }, [receiptId, accountEmail]);

  const handleSelectLanguage = (lang: ModalLang) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setSelectedLang(lang);
    setStep('receipt');
    markReceiptSeen();
  };

  const handleClose = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await markReceiptSeen();
    } catch {}
    setVisible(false);
  };

  const handleDismiss = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await markReceiptSeen();
    } catch (err) {
      console.warn('[UpgradeReceiptModal] Dismiss error:', err);
    }
    setVisible(false);
  };

  if (!visible || !receipt) return null;

  const labels = TRANSLATIONS[selectedLang] || TRANSLATIONS.ku;
  const isRtl = selectedLang === 'ku' || selectedLang === 'ar';

  // Format Dates
  const startDateObj = receipt.startDate
    ? new Date(receipt.startDate)
    : receipt.upgradedAt
    ? new Date(receipt.upgradedAt)
    : new Date();

  const formattedStartDate = isNaN(startDateObj.getTime())
    ? labels.notSpecified
    : formatDate(startDateObj);

  const expiresDateStr = receipt.expiresAt
    ? formatDate(receipt.expiresAt)
    : labels.unlimitedLifetime;

  const customerName =
    receipt.customerName ||
    currentUserAccount?.displayName ||
    receipt.email?.split('@')[0] ||
    '—';

  const priceAmount =
    receipt.priceAmount ||
    currentUserAccount?.priceAmount ||
    labels.notSpecified;

  const planDuration =
    receipt.planDuration ||
    labels.unlimitedLifetime;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <View style={styles.overlay}>
        <View style={styles.containerCard}>
          {/* Top Close Button (X) */}
          <TouchableOpacity
            style={[styles.closeBtn, isRtl ? styles.closeBtnRtl : styles.closeBtnLtr]}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>

          {step === 'lang' ? (
            /* ─── STEP 1: LANGUAGE SELECTION ─── */
            <View style={styles.langPickerWrapper}>
              {/* Globe Header Badge */}
              <View style={styles.langBadgeBox}>
                <Ionicons name="globe-outline" size={32} color="#D4AF37" />
              </View>

              <Text style={styles.langMainTitle}>
                {labels.selectLangTitle}
              </Text>
              <Text style={styles.langMultiSubtitle}>
                اختر اللغة • Select Language
              </Text>
              <Text style={styles.langDescription}>
                تکایە زمانێک دیاری بکە بۆ پیشاندانی وەسڵی فەرمی و دەستپێکردن
              </Text>

              {/* 3 Language Option Cards */}
              <View style={styles.langOptionsList}>
                {/* 1. Kurdish */}
                <TouchableOpacity
                  style={[styles.langOptionCard, isRtl && styles.rowRtl, selectedLang === 'ku' && styles.langOptionCardActive]}
                  onPress={() => handleSelectLanguage('ku')}
                  activeOpacity={0.82}
                >
                  <View style={styles.langOptionIconCircle}>
                    <Text style={{ fontSize: 18 }}>☀️</Text>
                  </View>
                  <View style={[styles.langOptionTextBox, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.langOptionTitleText, { textAlign: isRtl ? 'right' : 'left' }]}>کوردی (سۆرانی)</Text>
                    <Text style={[styles.langOptionSubText, { textAlign: isRtl ? 'right' : 'left' }]}>Kurdish Sorani</Text>
                  </View>
                  <Ionicons name={isRtl ? "chevron-back" : "chevron-forward"} size={18} color="#D4AF37" />
                </TouchableOpacity>

                {/* 2. Arabic */}
                <TouchableOpacity
                  style={[styles.langOptionCard, isRtl && styles.rowRtl, selectedLang === 'ar' && styles.langOptionCardActive]}
                  onPress={() => handleSelectLanguage('ar')}
                  activeOpacity={0.82}
                >
                  <View style={styles.langOptionIconCircle}>
                    <Text style={{ fontSize: 18 }}>🌙</Text>
                  </View>
                  <View style={[styles.langOptionTextBox, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.langOptionTitleText, { textAlign: isRtl ? 'right' : 'left' }]}>العربية</Text>
                    <Text style={[styles.langOptionSubText, { textAlign: isRtl ? 'right' : 'left' }]}>Arabic</Text>
                  </View>
                  <Ionicons name={isRtl ? "chevron-back" : "chevron-forward"} size={18} color="#D4AF37" />
                </TouchableOpacity>

                {/* 3. English */}
                <TouchableOpacity
                  style={[styles.langOptionCard, isRtl && styles.rowRtl, selectedLang === 'en' && styles.langOptionCardActive]}
                  onPress={() => handleSelectLanguage('en')}
                  activeOpacity={0.82}
                >
                  <View style={styles.langOptionIconCircle}>
                    <Text style={{ fontSize: 18 }}>🌐</Text>
                  </View>
                  <View style={[styles.langOptionTextBox, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.langOptionTitleText, { textAlign: isRtl ? 'right' : 'left' }]}>English</Text>
                    <Text style={[styles.langOptionSubText, { textAlign: isRtl ? 'right' : 'left' }]}>ئینگلیزی</Text>
                  </View>
                  <Ionicons name={isRtl ? "chevron-back" : "chevron-forward"} size={18} color="#D4AF37" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ─── STEP 2: RECEIPT VIEW WITH 25s COUNTDOWN ─── */
            <>
              {/* Top Screenshot Advice Banner */}
              <View style={[styles.screenshotBanner, isRtl && styles.rowRtl]}>
                <View style={styles.cameraIconBox}>
                  <Ionicons name="camera" size={18} color="#D4AF37" />
                </View>
                <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.screenshotBannerText, { textAlign: isRtl ? 'right' : 'left' }]}>
                    {labels.screenshotBannerText}
                  </Text>
                  <Text style={[styles.screenshotBannerSub, { textAlign: isRtl ? 'right' : 'left' }]}>
                    {labels.screenshotBannerSub}
                  </Text>
                </View>
              </View>

              {/* Status Verification Strip */}
              <View style={[styles.timerStrip, styles.timerStripReady, isRtl && styles.rowRtl]}>
                <View style={[styles.timerPulseDot, styles.timerPulseDotReady]} />
                <Text style={[styles.timerText, styles.timerTextReady]}>
                  {labels.timerReady}
                </Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                {/* Header Badge & Switcher */}
                <View style={styles.headerRow}>
                  {/* Language Switch Pills */}
                  <View style={styles.langSwitchBar}>
                    {(['ku', 'ar', 'en'] as ModalLang[]).map((lang) => (
                      <TouchableOpacity
                        key={lang}
                        style={[styles.langPill, selectedLang === lang && styles.langPillActive]}
                        onPress={() => setSelectedLang(lang)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.langPillText, selectedLang === lang && styles.langPillTextActive]}>
                          {lang === 'ku' ? 'کوردی' : lang === 'ar' ? 'العربية' : 'English'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.logoBadge}>
                    <Ionicons name="shield-checkmark" size={26} color="#D4AF37" />
                  </View>
                  <View style={{ alignItems: 'center', marginTop: 8 }}>
                    <Text style={styles.receiptTitle}>
                      {labels.receiptTitle}
                    </Text>
                    <Text style={styles.receiptSubtitle}>
                      {labels.receiptSubtitle}
                    </Text>
                    <View style={styles.receiptIdBadge}>
                      <Text style={styles.receiptIdText}>#{receipt.receiptId}</Text>
                    </View>
                  </View>
                </View>

                {/* ─── RTL RESPONSIVE TABLE (ناوی کڕیار و خانەکان بە جوانی لای ڕاستەوە) ─── */}
                <View style={styles.tableCard}>
                  {/* Row 1: Customer Name */}
                  <View style={[styles.tableRow, isRtl && styles.tableRowRtl]}>
                    <View style={[styles.colLabel, isRtl && styles.colLabelRtl]}>
                      <Text style={[styles.labelTitle, isRtl && styles.labelTitleRtl]}>
                        {labels.customerName}
                      </Text>
                    </View>
                    <View style={[styles.colValue, isRtl && styles.colValueRtl]}>
                      <Text style={[styles.valStrong, isRtl && styles.valStrongRtl]} numberOfLines={1}>
                        {customerName}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tableDivider} />

                  {/* Row 2: Account Email */}
                  <View style={[styles.tableRow, styles.tableRowAlt, isRtl && styles.tableRowRtl]}>
                    <View style={[styles.colLabel, isRtl && styles.colLabelRtl]}>
                      <Text style={[styles.labelTitle, isRtl && styles.labelTitleRtl]}>
                        {labels.accountEmail}
                      </Text>
                    </View>
                    <View style={[styles.colValue, isRtl && styles.colValueRtl]}>
                      <Text style={[styles.valText, isRtl && styles.valTextRtl, { fontSize: 12.5 }]} numberOfLines={1}>
                        {receipt.email}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tableDivider} />

                  {/* Row 3: Package Price */}
                  <View style={[styles.tableRow, isRtl && styles.tableRowRtl]}>
                    <View style={[styles.colLabel, isRtl && styles.colLabelRtl]}>
                      <Text style={[styles.labelTitle, isRtl && styles.labelTitleRtl]}>
                        {labels.packagePrice}
                      </Text>
                    </View>
                    <View style={[styles.colValue, isRtl && styles.colValueRtl]}>
                      <View style={styles.priceHighlightBadge}>
                        <Text style={styles.priceHighlightText}>{priceAmount}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tableDivider} />

                  {/* Row 4: Package Duration */}
                  <View style={[styles.tableRow, styles.tableRowAlt, isRtl && styles.tableRowRtl]}>
                    <View style={[styles.colLabel, isRtl && styles.colLabelRtl]}>
                      <Text style={[styles.labelTitle, isRtl && styles.labelTitleRtl]}>
                        {labels.packageDuration}
                      </Text>
                    </View>
                    <View style={[styles.colValue, isRtl && styles.colValueRtl]}>
                      <Text style={[styles.valText, isRtl && styles.valTextRtl]}>
                        {planDuration}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tableDivider} />

                  {/* Row 5: Start Date */}
                  <View style={[styles.tableRow, isRtl && styles.tableRowRtl]}>
                    <View style={[styles.colLabel, isRtl && styles.colLabelRtl]}>
                      <Text style={[styles.labelTitle, isRtl && styles.labelTitleRtl]}>
                        {labels.startDate}
                      </Text>
                    </View>
                    <View style={[styles.colValue, isRtl && styles.colValueRtl]}>
                      <Text style={[styles.valText, isRtl && styles.valTextRtl]}>
                        {formattedStartDate}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tableDivider} />

                  {/* Row 6: Expiry Date */}
                  <View style={[styles.tableRow, styles.tableRowAlt, isRtl && styles.tableRowRtl]}>
                    <View style={[styles.colLabel, isRtl && styles.colLabelRtl]}>
                      <Text style={[styles.labelTitle, isRtl && styles.labelTitleRtl]}>
                        {labels.expiryDate}
                      </Text>
                    </View>
                    <View style={[styles.colValue, isRtl && styles.colValueRtl]}>
                      <Text style={[styles.valStrong, isRtl && styles.valStrongRtl, { color: '#34D399' }]}>
                        {expiresDateStr}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Official Verification Footer Seal */}
                <View style={[styles.footerSeal, isRtl && styles.rowRtl]}>
                  <Ionicons name="checkmark-done-circle" size={17} color="#D4AF37" />
                  <Text style={styles.footerSealText}>
                    {labels.footerSeal}
                  </Text>
                </View>
              </ScrollView>

              {/* ─── PINNED BOTTOM ACTION BUTTON ─── */}
              <View style={styles.bottomActionContainer}>
                <TouchableOpacity
                  style={[styles.dismissBtn, styles.dismissBtnActive, isRtl && styles.rowRtl]}
                  onPress={handleDismiss}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#0F172A" />
                  <Text style={styles.dismissBtnTextActive}>
                    {labels.dismiss}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    zIndex: 30,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnLtr: {
    right: 14,
  },
  closeBtnRtl: {
    left: 14,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },

  /* ─── Step 1: Language Picker Styles ─── */
  langPickerWrapper: {
    padding: 22,
    alignItems: 'center',
  },
  langBadgeBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  langMainTitle: {
    fontSize: 19,
    color: '#FFFFFF',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    textAlign: 'center',
  },
  langMultiSubtitle: {
    fontSize: 13,
    color: '#D4AF37',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    marginTop: 4,
    textAlign: 'center',
  },
  langDescription: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  langOptionsList: {
    width: '100%',
    gap: 10,
  },
  langOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  langOptionCardActive: {
    borderColor: 'rgba(212, 175, 55, 0.7)',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  langOptionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langOptionTextBox: {
    flex: 1,
  },
  langOptionTitleText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  langOptionSubText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    marginTop: 2,
  },

  /* ─── Step 2: Receipt View Styles ─── */
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
    gap: 8,
  },
  timerStripReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderBottomColor: 'rgba(34, 197, 94, 0.25)',
  },
  timerPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  timerPulseDotReady: {
    backgroundColor: '#22C55E',
  },
  timerText: {
    fontSize: 12,
    color: '#34D399',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  timerTextReady: {
    color: '#4ADE80',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 22,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  langSwitchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
  },
  langPillActive: {
    backgroundColor: '#D4AF37',
  },
  langPillText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  langPillTextActive: {
    color: '#0F172A',
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

  /* ─── Responsive Table Styles ─── */
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
  tableRowRtl: {
    flexDirection: 'row-reverse',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  tableDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  colLabel: {
    flex: 1.1,
    alignItems: 'flex-start',
  },
  colLabelRtl: {
    alignItems: 'flex-end',
  },
  colValue: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  colValueRtl: {
    alignItems: 'flex-start',
  },
  labelTitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    textAlign: 'left',
  },
  labelTitleRtl: {
    textAlign: 'right',
  },
  valText: {
    fontSize: 13,
    color: '#F1F5F9',
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    textAlign: 'right',
  },
  valTextRtl: {
    textAlign: 'left',
  },
  valStrong: {
    fontSize: 13.5,
    color: '#FFFFFF',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    textAlign: 'right',
  },
  valStrongRtl: {
    textAlign: 'left',
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

  /* ─── Bottom Action Button Styles ─── */
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
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  countdownPillText: {
    color: '#FDE047',
    fontSize: 12.5,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
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
