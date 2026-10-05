import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Platform,
  Dimensions,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useRTL } from '@/lib/rtl';

let NativeCameraView: any = null;
let useNativeCameraPermissions: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExpoCam = require('expo-camera');
  if (ExpoCam && ExpoCam.CameraView) {
    NativeCameraView = ExpoCam.CameraView;
    useNativeCameraPermissions = ExpoCam.useCameraPermissions;
  }
} catch {
  // Native ExpoCamera module not compiled into this dev client binary
}

interface BarcodeScanningResult {
  data: string;
  type: string;
}

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'single' | 'multi' | 'batch_ids';
  title?: string;
  subtitle?: string;
  initialCodes?: string[];
  // Single mode callback:
  onScanSingle?: (code: string) => void;
  // Multi mode callback: returns whether the item was matched/added
  onScanMulti?: (code: string) => Promise<{ success: boolean; title?: string; message?: string } | boolean>;
  // Batch IDs mode callback (for Purchases):
  onApplyBatchIds?: (codes: string[]) => void;
  // Called when finishing multi-scan session
  onFinishMulti?: (scannedCount: number) => void;
}

export function BarcodeScannerModal({
  visible,
  onClose,
  mode = 'single',
  title,
  subtitle,
  initialCodes,
  onScanSingle,
  onScanMulti,
  onApplyBatchIds,
  onFinishMulti,
}: BarcodeScannerModalProps) {
  const { colors } = useAppTheme();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { isTablet } = useResponsive();
  const { isRTL } = useRTL();
  const fallbackHook = () => [{ granted: true }, async () => ({ granted: true })];
  const hookToUse = useNativeCameraPermissions || fallbackHook;
  const [permission, requestPermission] = hookToUse();

  const [torch, setTorch] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{
    text: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Scanning laser animation
  const laserAnim = useRef(new Animated.Value(0)).current;
  const lastScanTimestamp = useRef<number>(0);
  const lastScannedCode = useRef<string>('');
  const feedbackTimeout = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setTorch(false);
      setScannedCount(0);
      setBatchCodes(initialCodes && initialCodes.length > 0 ? [...initialCodes] : []);
      setLastScannedFeedback(null);
      setIsProcessing(false);
      setShowManualInput(false);
      setManualCode('');
      lastScanTimestamp.current = 0;
      lastScannedCode.current = '';

      // Start laser sweep animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      laserAnim.stopAnimation();
    }
  }, [visible]);

  // Request permission automatically if modal becomes visible
  useEffect(() => {
    if (visible && (!permission || !permission.granted)) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleDeleteBatchCode = (indexToDelete: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setBatchCodes((prev) => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    const rawCode = result.data?.trim();
    if (!rawCode) return;

    const now = Date.now();
    // Debounce: prevent same code triggering within 1500ms, or different codes within 600ms
    if (
      rawCode === lastScannedCode.current &&
      now - lastScanTimestamp.current < 1500
    ) {
      return;
    }
    if (now - lastScanTimestamp.current < 600) {
      return;
    }

    lastScanTimestamp.current = now;
    lastScannedCode.current = rawCode;

    if (mode === 'single') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onScanSingle?.(rawCode);
      onClose();
      return;
    }

    // Batch IDs mode (for Purchases)
    if (mode === 'batch_ids') {
      if (batchCodes.includes(rawCode)) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
        setLastScannedFeedback({
          text: isKuLanguage ? `ئەم کۆدە پێشتر زیادکراوە: ${rawCode}` : `Already added: ${rawCode}`,
          type: 'warning',
        });
        if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
        feedbackTimeout.current = setTimeout(() => {
          setLastScannedFeedback(null);
        }, 2500);
        return;
      }

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setBatchCodes((prev) => [...prev, rawCode]);
      setScannedCount((prev) => prev + 1);
      setLastScannedFeedback({
        text: isKuLanguage ? `کۆد زیادکرا: ${rawCode}` : `Code added: ${rawCode}`,
        type: 'success',
      });
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = setTimeout(() => {
        setLastScannedFeedback(null);
      }, 2500);
      return;
    }

    // Multi-scan mode (for Sales)
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (onScanMulti) {
        const scanRes = await onScanMulti(rawCode);
        const isSuccess = typeof scanRes === 'boolean' ? scanRes : scanRes.success;
        const itemTitle = typeof scanRes === 'object' && scanRes && scanRes.title ? scanRes.title : rawCode;
        const msg =
          typeof scanRes === 'object' && scanRes && scanRes.message
            ? scanRes.message
            : isSuccess
            ? (isKuLanguage ? `زیادکرا: ${itemTitle}` : `Added: ${itemTitle}`)
            : (isKuLanguage ? `نەدۆزرایەوە: ${rawCode}` : `Not found: ${rawCode}`);

        if (isSuccess) {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          setScannedCount((prev) => prev + 1);
          setLastScannedFeedback({ text: msg, type: 'success' });
        } else {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
          setLastScannedFeedback({ text: msg, type: 'warning' });
        }

        if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
        feedbackTimeout.current = setTimeout(() => {
          setLastScannedFeedback(null);
        }, 3000);
      }
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    setShowManualInput(false);
    setManualCode('');
    if (mode === 'single') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onScanSingle?.(trimmed);
      onClose();
    } else if (mode === 'batch_ids') {
      if (batchCodes.includes(trimmed)) {
        setLastScannedFeedback({
          text: isKuLanguage ? `ئەم کۆدە پێشتر زیادکراوە: ${trimmed}` : `Already added: ${trimmed}`,
          type: 'warning',
        });
      } else {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setBatchCodes((prev) => [...prev, trimmed]);
        setScannedCount((prev) => prev + 1);
        setLastScannedFeedback({
          text: isKuLanguage ? `کۆد زیادکرا: ${trimmed}` : `Code added: ${trimmed}`,
          type: 'success',
        });
      }
    } else {
      await handleBarcodeScanned({ data: trimmed, type: 'manual' } as any);
    }
  };

  const handleFinish = () => {
    if (mode === 'multi') {
      onFinishMulti?.(scannedCount);
    } else if (mode === 'batch_ids') {
      onApplyBatchIds?.(batchCodes);
    }
    onClose();
  };

  const defaultTitle =
    mode === 'batch_ids'
      ? (isKuLanguage ? 'سکانی کۆدەکانی کڕین' : 'Purchase Barcodes Batch')
      : mode === 'multi'
      ? (isKuLanguage ? 'سکانەری فرۆشتنی خێرا' : 'Multi-Item Barcode Scanner')
      : (isKuLanguage ? 'سکانی بارکۆد یان QR' : 'Scan Barcode or QR Code');

  const defaultSubtitle =
    mode === 'batch_ids'
      ? (isKuLanguage ? 'کۆدەکان یەک لەدوای یەک سکان بکە بۆ وەسڵ' : 'Scan all item codes sequentially for this purchase')
      : mode === 'multi'
      ? (isKuLanguage ? 'کامێراکە بگرە لەسەر بارکۆدەکان بۆ زیادکردنی ڕاستەوخۆ' : 'Point camera at barcodes to auto-add items to cart')
      : (isKuLanguage ? 'کۆدەکە بخەرە نێو چوارچێوەکە' : 'Align barcode/QR code within the frame');

  const { width: winWidth, height: winHeight } = Dimensions.get('window');
  const boxSize = Math.min(isTablet ? 360 : 270, winWidth * 0.78);

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, boxSize - 6],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleFinish}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Permission Check */}
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <View style={styles.permissionCard}>
              <View style={[styles.permIconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="camera" size={48} color={colors.primary} />
              </View>
              <Text style={styles.permTitle}>
                {isKuLanguage ? 'مۆڵەتی کامێرا پێویستە' : 'Camera Permission Required'}
              </Text>
              <Text style={styles.permText}>
                {isKuLanguage
                  ? 'بۆ سکانکردنی بارکۆد و کۆدەکان بە خێرایی، تکایە ڕێگە بە دەستپێگەیشتنی کامێرا بدە.'
                  : 'To quickly scan barcodes and QR codes, please allow Froshiar to use your device camera.'}
              </Text>
              <TouchableOpacity
                style={[styles.permButton, { backgroundColor: colors.primary }]}
                onPress={requestPermission}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.permButtonText}>
                  {isKuLanguage ? 'ڕێگەپێدان بە کامێرا' : 'Grant Permission'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.permCancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.permCancelText}>
                  {isKuLanguage ? 'داخستن' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            {NativeCameraView ? (
              <NativeCameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                enableTorch={torch}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'qr',
                    'ean13',
                    'ean8',
                    'code128',
                    'code39',
                    'upc_a',
                    'upc_e',
                    'itf14',
                    'codabar',
                    'datamatrix',
                  ],
                }}
                onBarcodeScanned={handleBarcodeScanned}
              />
            ) : (
              <View style={StyleSheet.absoluteFillObject}>
                <LinearGradient
                  colors={['#0F172A', '#1E293B', '#090D16']}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
            )}

            {/* Dark Mask Overlay around scanner target */}
            <View style={styles.overlay}>
              {/* Top Bar */}
              <LinearGradient
                colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.4)', 'transparent']}
                style={styles.topBar}
              >
                <TouchableOpacity
                  style={styles.roundBtn}
                  onPress={handleFinish}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                  <Text style={styles.headerTitleText} numberOfLines={1}>
                    {title || defaultTitle}
                  </Text>
                  <Text style={styles.headerSubtitleText} numberOfLines={1}>
                    {subtitle || defaultSubtitle}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.roundBtn, torch && styles.roundBtnActive]}
                  onPress={() => setTorch((prev) => !prev)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons
                    name={torch ? 'flash' : 'flash-off'}
                    size={22}
                    color={torch ? '#FFD700' : '#FFFFFF'}
                  />
                </TouchableOpacity>
              </LinearGradient>

              {/* Floating Corner Scanned Code Card (Displays code written out + instant delete button) */}
              {mode === 'batch_ids' && batchCodes.length > 0 && (
                <View style={styles.floatingCornerCard}>
                  <View style={[styles.floatingCornerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <View style={styles.floatingCornerPulseDot} />
                      <Text style={styles.floatingCornerLabel}>
                        {isKuLanguage ? 'کۆدی سکانکراو:' : 'Scanned Code:'}
                      </Text>
                    </View>
                    <View style={styles.floatingCornerIndexPill}>
                      <Text style={styles.floatingCornerIndexText}>#{batchCodes.length}</Text>
                    </View>
                  </View>

                  <View style={[styles.floatingCodeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                      <Ionicons name="barcode-outline" size={22} color="#FFD700" />
                      <Text style={styles.floatingCodeValue} numberOfLines={1} selectable>
                        {batchCodes[batchCodes.length - 1]}
                      </Text>
                    </View>

                    {/* Instant Delete Button right here in the corner card! */}
                    <TouchableOpacity
                      style={styles.floatingDeleteBtn}
                      onPress={() => handleDeleteBatchCode(batchCodes.length - 1)}
                      activeOpacity={0.75}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.floatingDeleteText}>
                        {isKuLanguage ? 'سڕینەوە' : 'Delete'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Viewfinder Target Area */}
              <View style={styles.centerArea}>
                <View style={[styles.targetBox, { width: boxSize, height: boxSize }]}>
                  {/* Glowing corners */}
                  <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />

                  {/* Animated Laser Line */}
                  <Animated.View
                    style={[
                      styles.laserLine,
                      {
                        backgroundColor: '#FF3B30',
                        transform: [{ translateY: laserTranslateY }],
                      },
                    ]}
                  >
                    <View style={styles.laserGlow} />
                  </Animated.View>

                  {/* Scanning indicator pulse */}
                  {isProcessing && (
                    <View style={styles.processingBadge}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  )}
                </View>

                {/* Subtitle / Tip under target */}
                <View style={styles.hintPill}>
                  <Ionicons name="scan-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.hintText}>
                    {mode === 'multi'
                      ? (isKuLanguage ? 'سکان بەردەوامە — هەرچەندت دەوێ بیگرە بەرامبەری' : 'Continuous scan — scan multiple barcodes sequentially')
                      : (isKuLanguage ? 'بارکۆدەکە ڕابگرە لە ناو چوارچێوەکەدا' : 'Center barcode inside the frame')}
                  </Text>
                </View>
              </View>

              {/* Bottom Controls / Feedback */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)']}
                style={styles.bottomBar}
              >
                {/* Live Toast / Feedback */}
                {lastScannedFeedback && (
                  <View
                    style={[
                      styles.feedbackBanner,
                      lastScannedFeedback.type === 'success' && styles.feedbackSuccess,
                      lastScannedFeedback.type === 'warning' && styles.feedbackWarning,
                    ]}
                  >
                    <Ionicons
                      name={
                        lastScannedFeedback.type === 'success'
                          ? 'checkmark-circle'
                          : 'alert-circle'
                      }
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.feedbackText} numberOfLines={2}>
                      {lastScannedFeedback.text}
                    </Text>
                  </View>
                )}

                {/* Batch IDs mode bottom action (Purchases) */}
                {mode === 'batch_ids' ? (
                  <View style={styles.batchFooter}>
                    <View style={styles.batchHeaderRow}>
                      <View style={styles.countBadge}>
                        <Ionicons name="barcode" size={16} color="#FFD700" style={{ marginRight: 6 }} />
                        <Text style={styles.countBadgeText}>
                          {isKuLanguage
                            ? `${batchCodes.length} کۆد تۆمارکراوە`
                            : `${batchCodes.length} codes recorded`}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {batchCodes.length > 0 && (
                          <TouchableOpacity
                            style={styles.batchClearBtn}
                            onPress={() => setBatchCodes([])}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.batchClearText}>
                              {isKuLanguage ? 'سڕینەوەی هەمووی' : 'Clear all'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.manualCodeBtn}
                          onPress={() => setShowManualInput(true)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="keypad-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.manualCodeText}>
                            {isKuLanguage ? 'دەستی' : 'Manual'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Scanned Codes List with instant delete button right there! */}
                    {batchCodes.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.batchChipsScroll}
                        style={styles.batchChipsContainer}
                      >
                        {batchCodes.map((c, idx) => (
                          <View key={`${c}-${idx}`} style={styles.batchCodeChip}>
                            <View style={styles.batchChipBadge}>
                              <Text style={styles.batchChipBadgeText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.batchChipCodeText} numberOfLines={1}>
                              {c}
                            </Text>
                            <TouchableOpacity
                              style={styles.batchChipDeleteBtn}
                              onPress={() => handleDeleteBatchCode(idx)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close-circle" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    ) : (
                      <View style={styles.batchEmptyBox}>
                        <Text style={styles.batchEmptyText}>
                          {isKuLanguage
                            ? 'کۆدەکان لەم سووچەدا دەنووسرێن — بارکۆد بگرە بەرامبەر کامێرا'
                            : 'Scanned codes will appear here — point camera at barcodes'}
                        </Text>
                      </View>
                    )}

                    {/* Big Button: Apply All to Purchase */}
                    <TouchableOpacity
                      style={[styles.finishBtn, { backgroundColor: colors.primary, marginTop: 4 }]}
                      onPress={handleFinish}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={[colors.gradientStart || '#E5A93C', colors.gradientEnd || '#B87B19']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.finishBtnGradient}
                      >
                        <Ionicons name="checkmark-done" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.finishBtnText}>
                          {isKuLanguage
                            ? `دانانی هەموو لە وەسڵی کڕین (${batchCodes.length} کۆد)`
                            : `Apply All to Purchase (${batchCodes.length} codes)`}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : mode === 'multi' ? (
                  <View style={styles.multiFooter}>
                    <View style={styles.multiCountRow}>
                      <View style={styles.countBadge}>
                        <Ionicons name="cart" size={16} color="#FFD700" style={{ marginRight: 6 }} />
                        <Text style={styles.countBadgeText}>
                          {isKuLanguage
                            ? `${scannedCount} بەرهەم سکانکراوە`
                            : `${scannedCount} items scanned`}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.manualCodeBtn}
                        onPress={() => setShowManualInput(true)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="keypad-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.manualCodeText}>
                          {isKuLanguage ? 'کۆدی دەستی' : 'Manual Code'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Big Button: Finish & View Cart */}
                    <TouchableOpacity
                      style={[styles.finishBtn, { backgroundColor: colors.primary }]}
                      onPress={handleFinish}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={[colors.gradientStart || '#E5A93C', colors.gradientEnd || '#B87B19']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.finishBtnGradient}
                      >
                        <Ionicons name="checkmark-done" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.finishBtnText}>
                          {isKuLanguage
                            ? `تەواوکردن و سەبەتە ${scannedCount > 0 ? `(${scannedCount})` : ''}`
                            : `Finish & View Cart ${scannedCount > 0 ? `(${scannedCount})` : ''}`}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Single scan footer */
                  <View style={styles.singleFooter}>
                    <TouchableOpacity
                      style={styles.manualCodeBtnLarge}
                      onPress={() => setShowManualInput(true)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="keypad-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.manualCodeText}>
                        {isKuLanguage ? 'نووسینی دەستیی کۆد' : 'Type Code Manually'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Manual Code Input Modal */}
            {showManualInput && (
              <View style={styles.manualInputModal}>
                <View style={[styles.manualInputCard, { backgroundColor: '#1E293B' }]}>
                  <Text style={[styles.manualTitle, { color: '#FFFFFF' }]}>
                    {isKuLanguage ? 'نووسینی بارکۆد / کۆدی بەرهەم' : 'Enter Barcode / Item ID'}
                  </Text>
                  <TextInput
                    style={[
                      styles.manualTextInput,
                      {
                        color: '#FFFFFF',
                        borderColor: 'rgba(255,255,255,0.2)',
                        backgroundColor: '#0F172A',
                      },
                    ]}
                    value={manualCode}
                    onChangeText={setManualCode}
                    placeholder={isKuLanguage ? 'کۆدەکە بنووسە...' : 'Type code...'}
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={handleManualSubmit}
                  />
                  <View style={styles.manualActions}>
                    <TouchableOpacity
                      style={styles.manualCancelBtn}
                      onPress={() => setShowManualInput(false)}
                    >
                      <Text style={styles.manualCancelText}>
                        {isKuLanguage ? 'پەشیمانبوونەوە' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.manualSubmitBtn, { backgroundColor: colors.primary }]}
                      onPress={handleManualSubmit}
                    >
                      <Text style={styles.manualSubmitText}>
                        {isKuLanguage ? 'تەواوە' : 'OK'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  roundBtnActive: {
    backgroundColor: 'rgba(255,215,0,0.25)',
    borderColor: '#FFD700',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitleText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 3,
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBox: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  laserLine: {
    width: '100%',
    height: 3,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  laserGlow: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 11,
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
  },
  processingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    padding: 6,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 20,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
    alignSelf: 'center',
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  feedbackSuccess: {
    backgroundColor: '#10B981',
  },
  feedbackWarning: {
    backgroundColor: '#F59E0B',
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  multiFooter: {
    width: '100%',
  },
  multiCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  manualCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  manualCodeBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
  manualCodeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  finishBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  finishBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  singleFooter: {
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  permIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  permText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  permButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  permButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  permCancelButton: {
    paddingVertical: 10,
  },
  permCancelText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  manualInputModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 99,
  },
  manualInputCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
  },
  manualTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  manualTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  manualActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  manualCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  manualCancelText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
  },
  manualSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  batchFooter: {
    width: '100%',
  },
  batchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  batchClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  batchClearText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  batchChipsContainer: {
    maxHeight: 52,
    marginBottom: 10,
  },
  batchChipsScroll: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  batchCodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    gap: 6,
  },
  batchChipBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  batchChipBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
  batchChipCodeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 150,
  },
  batchChipDeleteBtn: {
    padding: 2,
  },
  batchEmptyBox: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  batchEmptyText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    textAlign: 'center',
  },
  floatingCornerCard: {
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCornerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  floatingCornerPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  floatingCornerLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingCornerIndexPill: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  floatingCornerIndexText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
  },
  floatingCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  floatingCodeValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  floatingDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  floatingDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
