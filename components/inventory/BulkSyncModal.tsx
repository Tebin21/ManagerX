import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SettingSwitch } from '@/components/settings/SettingSwitch';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import { useOnlineStoreSubscriptionStore } from '@/store/onlineStoreSubscriptionStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { hexToRgba } from '@/lib/colorUtils';
import {
  SETTINGS_KURDISH_FONT_BOLD,
  SETTINGS_KURDISH_FONT_REGULAR,
} from '@/lib/settingsFont';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Inventory-header entry point for bulk-publishing/unpublishing every product at once,
// configuring storefront price visibility, and out-of-stock product display.
export function BulkSyncModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const {
    bulkPublishEnabled,
    isBulkPublishing,
    setBulkPublishEnabled,
    storeInfoFields,
    saveStoreInfo,
  } = useOnlineStoreStore();

  const hasActiveSubscription = useOnlineStoreSubscriptionStore((s) => s.isActive);
  const totalProducts = useInventoryStore((s) => s.stats?.totalProducts ?? 0);

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [hideOutOfStock, setHideOutOfStock] = useState(storeInfoFields.hideOutOfStock ?? false);
  const [showPrices, setShowPrices] = useState(storeInfoFields.showPrices ?? true);

  useEffect(() => {
    if (visible) {
      // Refresh subscription and store info on open so new activations reflect instantly
      (async () => {
        try {
          await Promise.all([
            useOnlineStoreSubscriptionStore.getState().loadSubscription(),
            useOnlineStoreStore.getState().load(),
          ]);
          const currentFields = useOnlineStoreStore.getState().storeInfoFields;
          setHideOutOfStock(currentFields.hideOutOfStock ?? false);
          setShowPrices(currentFields.showPrices ?? true);
        } catch {
          // non-critical
        }
      })();
    }
  }, [visible]);

  const handleToggleHideOutOfStock = async (val: boolean) => {
    setHideOutOfStock(val);
    try {
      await saveStoreInfo({ hideOutOfStock: val });
    } catch (err) {
      console.warn('[BulkSyncModal] Failed to save hideOutOfStock:', err);
    }
  };

  const handleToggleShowPrices = async (val: boolean) => {
    setShowPrices(val);
    try {
      await saveStoreInfo({ showPrices: val });
    } catch (err) {
      console.warn('[BulkSyncModal] Failed to save showPrices:', err);
    }
  };

  const runBulkToggle = async (enabled: boolean) => {
    setProgress({ done: 0, total: totalProducts });
    try {
      const result = await setBulkPublishEnabled(enabled, (done, total) =>
        setProgress({ done, total })
      );
      if (result.status === 'locked') {
        Alert.alert(
          t('inventory.bulkSync.title'),
          t('dashboard.onlineStore.subscriptionRequired')
        );
      }
    } finally {
      setProgress(null);
    }
  };

  const handleToggle = (value: boolean) => {
    if (value) {
      Alert.alert(
        t('inventory.bulkSync.confirmPublishTitle'),
        t('inventory.bulkSync.confirmPublishMsg', { count: totalProducts }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('inventory.bulkSync.confirmPublishAction'),
            onPress: () => runBulkToggle(true),
          },
        ]
      );
    } else {
      Alert.alert(
        t('inventory.bulkSync.confirmRemoveTitle'),
        t('inventory.bulkSync.confirmRemoveMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('inventory.bulkSync.confirmRemoveAction'),
            style: 'destructive',
            onPress: () => runBulkToggle(false),
          },
        ]
      );
    }
  };

  const pct =
    progress && progress.total > 0
      ? Math.min(1, progress.done / progress.total)
      : 0;

  const modalWidth = isTablet
    ? isTabletLandscape
      ? 540
      : 480
    : '90%';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor: isDark ? colors.gray200 : hexToRgba(colors.primary, 0.25),
              width: modalWidth,
              padding: isTablet ? 24 : 18,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { flexDirection }]}>
            <View style={{ flexDirection, alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.12) },
                ]}
              >
                <Ionicons name="storefront" size={isTablet ? 22 : 18} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: colors.black,
                    textAlign,
                    fontSize: isTablet ? 18 : 16,
                  },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {t('inventory.bulkSync.title')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? colors.gray200 : colors.gray100 },
              ]}
            >
              <Ionicons name="close" size={isTablet ? 20 : 18} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 6 }}
          >
            {/* 1. Master Toggle: Bulk Publish All */}
            <View style={styles.switchWrapper}>
              <SettingSwitch
                icon="storefront-outline"
                label={t('inventory.bulkSync.masterToggleLabel')}
                sub={
                  !hasActiveSubscription
                    ? t('dashboard.onlineStore.subscriptionRequired')
                    : t('inventory.bulkSync.masterToggleSub')
                }
                value={bulkPublishEnabled}
                onToggle={handleToggle}
                disabled={!hasActiveSubscription || isBulkPublishing}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]} />

            {/* 2. Show/Hide Prices Toggle (ئۆن و ئۆفی پیشاندانی نرخەکان) */}
            <View style={styles.switchWrapper}>
              <SettingSwitch
                icon="pricetag-outline"
                color="#10B981"
                label={t('inventory.bulkSync.showPricesLabel', 'پیشاندانی نرخی بەرهەمەکان')}
                sub={t(
                  'inventory.bulkSync.showPricesSub',
                  'کاتێک ئۆن بێت هەموو نرخەکان پیشان دەدات، ئەگەر ئۆف بێت نرخەکان دەشاردرێنەوە و تەنها کاڵاکان و وەسفەکەیان پیشان دەدرێت'
                )}
                value={showPrices}
                onToggle={handleToggleShowPrices}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]} />

            {/* 3. Hide Out of Stock Toggle */}
            <View style={styles.switchWrapper}>
              <SettingSwitch
                icon="eye-off-outline"
                color="#F59E0B"
                label={t(
                  'inventory.bulkSync.hideOutOfStockLabel',
                  'شاردنەوەی بەرهەمی نەماو لە وێب ستۆر'
                )}
                sub={t(
                  'inventory.bulkSync.hideOutOfStockSub',
                  'ئەگەر بەرهەمێ بڕەکەی تەواو بوو (سفر بوو) لە وێب ستۆرەکە نیشان نادرێت تا دووبارە کڕینەوەی'
                )}
                value={hideOutOfStock}
                onToggle={handleToggleHideOutOfStock}
              />
            </View>

            {/* Progress bar during bulk sync */}
            {progress && (
              <View style={styles.progressWrap}>
                <Text
                  style={[
                    styles.progressLabel,
                    { color: colors.gray500, textAlign },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                  ]}
                >
                  {t('inventory.bulkSync.progressLabel', {
                    done: progress.done,
                    total: progress.total,
                  })}
                </Text>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: isDark ? colors.gray200 : '#E2E8F0' },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(pct * 100)}%` as any,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Helpful Informational Notes */}
            <View
              style={[
                styles.infoNoteBox,
                {
                  backgroundColor: isDark ? hexToRgba(colors.primary, 0.10) : hexToRgba(colors.primary, 0.05),
                  borderColor: isDark ? hexToRgba(colors.primary, 0.25) : hexToRgba(colors.primary, 0.15),
                },
              ]}
            >
              <Text
                style={[
                  styles.note,
                  { color: colors.gray600, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                ]}
              >
                {t('inventory.bulkSync.note')}
              </Text>
              <Text
                style={[
                  styles.note,
                  { color: colors.gray500, textAlign, marginTop: 6 },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                ]}
              >
                {t('inventory.bulkSync.perProductNote')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    borderRadius: 22,
    borderWidth: 1,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchWrapper: {
    paddingVertical: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    width: '100%',
  },
  progressWrap: {
    marginTop: 14,
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 7,
    borderRadius: 4,
  },
  infoNoteBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  note: {
    fontSize: 11.5,
    lineHeight: 18,
  },
});
