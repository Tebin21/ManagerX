import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/AppText';
import { AppHeader } from '@/components/common/AppHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';

export default function NewEmployeeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const language = useLanguageStore((s) => s.language);
  const isAr = language === 'ar';
  const isKu = language === 'ku';

  // Security route guard: Employee creation is strictly restricted to the Admin Panel
  React.useEffect(() => {
    Alert.alert(
      isAr ? 'تنبيه' : isKu ? 'ئاگاداری' : 'Notice',
      isAr
        ? 'إضافة الموظفين غير متاحة من داخل التطبيق. يتم إنشاء وتفعيل حسابات الموظفين حصرياً من خلال لوحة تحكم الأدمن (Admin Panel).'
        : isKu
        ? 'زیادکردنی کارمەند لەناو ئەپ بەردەست نییە. هەژماری کارمەند تەنها لە ڕێگەی ئەدمین پانێڵەوە لەلایەن خاوەن سیستەم دروست و چالاک دەکرێت.'
        : 'Adding employees is not available from within the app. Employee accounts are created exclusively via the Admin Panel.',
      [
        {
          text: t('common.ok'),
          onPress: () => router.replace('/(app)/management'),
        },
      ]
    );
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('management.addEmployee')} onBack={() => router.back()} />

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF', borderColor: colors.gray200 }]}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
            <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.black }]}>
            {isAr
              ? 'إنشاء الموظفين محصور بلوحة الإدارة'
              : isKu
              ? 'دروستکردنی کارمەند تەنها لە ئەدمین پانێڵەوەیە'
              : 'Admin Panel Provisioning Only'}
          </Text>

          <Text style={[styles.desc, { color: colors.gray500 }]}>
            {isAr
              ? 'لا يمكن إضافة موظفين جدد من التطبيق مباشرة. يتم تخصيص وإنشاء حسابات الموظفين وتحديد صلاحياتهم من خلال لوحة تحكم الإدارة (Admin Panel).'
              : isKu
              ? 'هیچ کەسێک لەناو ئەپەوە ناتوانێت کارمەند زیاد بکات. هەژمار و دەسەڵاتی کارمەندان بە شێوەیەکی پارێزراو تەنها لە ڕێگەی ئەدمین پانێڵەوە بەردەستە.'
              : 'Staff accounts and credentials are provisioned exclusively through the Web Admin Panel.'}
          </Text>

          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(app)/management')}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>
              {isAr ? 'العودة إلى الإدارة' : isKu ? 'گەڕانەوە بۆ مەنجمنت' : 'Back to Management'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  desc: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 22,
  },
  backBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
