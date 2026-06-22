import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SettingSwitch } from '@/components/settings/SettingSwitch';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import { useOnlineStoreSubscriptionStore } from '@/store/onlineStoreSubscriptionStore';
import { useInventoryStore } from '@/store/inventoryStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Inventory-header entry point for bulk-publishing/unpublishing every product at once.
// Reuses the existing offline-first sync pipeline (lib/sqlite.ts + syncEngine.ts) via
// the onlineStoreStore action — this component only owns the confirm dialogs and the
// progress bar shown while that action runs.
export function BulkSyncModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();

  const { bulkPublishEnabled, isBulkPublishing, setBulkPublishEnabled } = useOnlineStoreStore();
  const hasActiveSubscription = useOnlineStoreSubscriptionStore((s) => s.isActive);
  const totalProducts = useInventoryStore((s) => s.stats?.totalProducts ?? 0);

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const runBulkToggle = async (enabled: boolean) => {
    setProgress({ done: 0, total: totalProducts });
    try {
      const result = await setBulkPublishEnabled(enabled, (done, total) => setProgress({ done, total }));
      if (result.status === 'locked') {
        Alert.alert(t('inventory.bulkSync.title'), t('dashboard.onlineStore.subscriptionRequired'));
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
          { text: t('inventory.bulkSync.confirmPublishAction'), onPress: () => runBulkToggle(true) },
        ]
      );
    } else {
      Alert.alert(
        t('inventory.bulkSync.confirmRemoveTitle'),
        t('inventory.bulkSync.confirmRemoveMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('inventory.bulkSync.confirmRemoveAction'), style: 'destructive', onPress: () => runBulkToggle(false) },
        ]
      );
    }
  };

  const pct = progress && progress.total > 0 ? Math.min(1, progress.done / progress.total) : 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.white }]}>
          <View style={[styles.modalHeader, { flexDirection }]}>
            <Text style={[styles.modalTitle, { color: colors.black, textAlign }]}>
              {t('inventory.bulkSync.title')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.gray500} />
            </TouchableOpacity>
          </View>

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

          {progress && (
            <View style={styles.progressWrap}>
              <Text style={[styles.progressLabel, { color: colors.gray500, textAlign }]}>
                {t('inventory.bulkSync.progressLabel', { done: progress.done, total: progress.total })}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: colors.gray200 }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(pct * 100)}%` as any, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>
          )}

          <Text style={[styles.note, { color: colors.gray400, textAlign }]}>
            {t('inventory.bulkSync.note')}
          </Text>
          <Text style={[styles.note, { color: colors.gray400, textAlign, marginTop: isRTL ? 6 : 6 }]}>
            {t('inventory.bulkSync.perProductNote')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:   { borderRadius: 24, padding: 20, width: '88%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 17, fontWeight: '800' },
  progressWrap:  { marginTop: 16 },
  progressLabel: { fontSize: 12, marginBottom: 6 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 6, borderRadius: 3 },
  note: { fontSize: 12, marginTop: 14, lineHeight: 17 },
});
