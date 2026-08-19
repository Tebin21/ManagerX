import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useBusinessStore } from '@/store/businessStore';
import { Colors } from '@/constants/colors';

// Shown when a sign-in detects that BOTH this device's local SQLite data AND the
// signed-in account's Firestore cloud data are non-empty — the one case
// store/authStore.ts's adoptSignedInUser can't safely auto-resolve. Blocked from
// being bypassed by the routing guards in app/index.tsx, app/(app)/_layout.tsx,
// and app/(onboarding)/_layout.tsx, all of which check businessStore's
// pendingCloudConflict.
export default function CloudDataConflictScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const uid = useBusinessStore((s) => s.pendingCloudConflict);
  const [processing, setProcessing] = useState<'merge' | 'local' | 'cloud' | null>(null);

  const finish = async (uidToAdopt: string) => {
    const { useBusinessStore: store } = await import('@/store/businessStore');
    const { startCloudSync } = await import('@/lib/cloudSync');
    store.getState().setOwnerUserId(uidToAdopt);
    store.getState().setPendingCloudConflict(null);
    startCloudSync(uidToAdopt);
    router.replace('/');
  };

  const handleMerge = async () => {
    if (!uid) return;
    setProcessing('merge');
    try {
      const { restoreFromCloudBulk, pushFullLocalSnapshot } = await import('@/lib/cloudSync');
      // Pull cloud data in first (uuid-matched merge — never overwrites this
      // device's own newer edits, per lib/backup.ts's LWW rule), then push
      // whatever's still local-only up, so both sides converge.
      await restoreFromCloudBulk(uid);
      await pushFullLocalSnapshot(uid);
      await finish(uid);
    } catch (e) {
      console.error('[Froshiar] Cloud data merge failed:', e);
      Alert.alert(t('common.error'), t('common.tryAgain'));
      setProcessing(null);
    }
  };

  const handleKeepLocal = () => {
    if (!uid) return;
    Alert.alert(
      t('cloudConflict.keepLocalTitle'),
      t('cloudConflict.keepLocalConfirm'),
      [
        { text: t('cloudConflict.cancel'), style: 'cancel' },
        {
          text: t('cloudConflict.continueBtn'),
          style: 'destructive',
          onPress: async () => {
            setProcessing('local');
            try {
              const { deleteAllCloudData, pushFullLocalSnapshot } = await import('@/lib/cloudSync');
              await deleteAllCloudData(uid);
              await pushFullLocalSnapshot(uid);
              await finish(uid);
            } catch (e) {
              console.error('[Froshiar] Keep-local-data resolution failed:', e);
              Alert.alert(t('common.error'), t('common.tryAgain'));
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleKeepCloud = () => {
    if (!uid) return;
    Alert.alert(
      t('cloudConflict.keepCloudTitle'),
      t('cloudConflict.keepCloudConfirm'),
      [
        { text: t('cloudConflict.cancel'), style: 'cancel' },
        {
          text: t('cloudConflict.continueBtn'),
          style: 'destructive',
          onPress: async () => {
            setProcessing('cloud');
            try {
              const { wipeAllBusinessData } = await import('@/lib/sqlite');
              const { restoreFromCloudBulk } = await import('@/lib/cloudSync');
              await wipeAllBusinessData();
              useBusinessStore.getState().clearBusiness();
              await restoreFromCloudBulk(uid);
              await finish(uid);
            } catch (e) {
              console.error('[Froshiar] Keep-cloud-data resolution failed:', e);
              Alert.alert(t('common.error'), t('common.tryAgain'));
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="cloud-outline" size={40} color={Colors.white} style={{ marginBottom: 12 }} />
        <Text style={styles.headline}>{t('cloudConflict.title')}</Text>
        <Text style={styles.subtitle}>{t('cloudConflict.subtitle')}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {processing ? (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.gray600 }]}>{t('cloudConflict.processing')}</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.optionCard, styles.recommended, { borderColor: colors.primary, backgroundColor: colors.gray50 }]}
              onPress={handleMerge}
              activeOpacity={0.85}
            >
              <Ionicons name="git-merge-outline" size={26} color={colors.primary} />
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: colors.black }]}>{t('cloudConflict.mergeTitle')}</Text>
                <Text style={[styles.optionDesc, { color: colors.gray600 }]}>{t('cloudConflict.mergeDescription')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { borderColor: colors.gray200 }]}
              onPress={handleKeepLocal}
              activeOpacity={0.85}
            >
              <Ionicons name="phone-portrait-outline" size={26} color={colors.gray600} />
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: colors.black }]}>{t('cloudConflict.keepLocalTitle')}</Text>
                <Text style={[styles.optionDesc, { color: colors.gray600 }]}>{t('cloudConflict.keepLocalDescription')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { borderColor: colors.gray200 }]}
              onPress={handleKeepCloud}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-download-outline" size={26} color={colors.gray600} />
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: colors.black }]}>{t('cloudConflict.keepCloudTitle')}</Text>
                <Text style={[styles.optionDesc, { color: colors.gray600 }]}>{t('cloudConflict.keepCloudDescription')}</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 32,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  scroll: {
    flexGrow: 1,
    padding: 20,
    gap: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  recommended: {
    borderWidth: 2,
  },
  optionTextWrap: { flex: 1 },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  processingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  processingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
