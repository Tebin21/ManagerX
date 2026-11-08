import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/AppText';
import { AppHeader } from '@/components/common/AppHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuthStore } from '@/store/authStore';
import { useManagementStore } from '@/store/managementStore';
import { createEmployeeAccount } from '@/lib/management/managementService';

export default function NewEmployeeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { flexDirection, textAlign } = useRTL();
  const { isTablet, contentContainerStyle } = useResponsive();

  const currentAuthUser = useAuthStore((s) => s.user);
  const isEmployee = useManagementStore((s) => s.isEmployee);

  // Security route guard: Only store managers/owners can create staff accounts
  React.useEffect(() => {
    if (isEmployee || !currentAuthUser?.email) {
      Alert.alert(
        'دەسەڵاتت نییە',
        'تەنها بەڕێوەبەر دەتوانێت هەژماری کارمەند دروست بکات.'
      );
      router.replace('/(app)/management');
    }
  }, [isEmployee, currentAuthUser?.email]);

  // Manager email is strictly the authenticated user's email (single-tenant isolation)
  const managerEmail = (currentAuthUser?.email || '').trim().toLowerCase();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      Alert.alert(t('common.error'), 'تکایە ناوی کارمەند بنووسە.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert(t('common.error'), 'تکایە ئیمەیڵێکی دروست بنووسە.');
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      Alert.alert(t('common.error'), 'تکایە وشەی نهێنی لانیکەم ٤ پیت/ژمارە بێت.');
      return;
    }

    const cleanEmpEmail = email.trim().toLowerCase();
    const finalManagerEmail = (currentAuthUser?.email || '').trim().toLowerCase();

    if (!finalManagerEmail || !finalManagerEmail.includes('@')) {
      Alert.alert(t('common.error'), 'ئیمەیڵی بەڕێوەبەر بەردەست نییە.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createEmployeeAccount({
        displayName: displayName.trim(),
        email: cleanEmpEmail,
        password: password.trim(),
        managerEmail: finalManagerEmail,
        role: 'employee',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        t('common.success'),
        t('management.employeeCreatedSuccess'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error('[NewEmployee] Create error:', err);
      if (err?.message === 'EMPLOYEE_EMAIL_ALREADY_EXISTS') {
        Alert.alert(t('common.error'), 'ئەم ئیمەیڵە پێشتر بەکارهاتووە بۆ کارمەندێکی تر.');
      } else {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('management.addEmployee')} onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && contentContainerStyle]}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                borderColor: colors.gray200,
              },
              isTablet && { padding: 32, borderRadius: 24 },
            ]}
          >
            {/* Display Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.black }, isTablet && { fontSize: 16 }]}>
                {t('management.employeeName')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                    borderColor: colors.gray300,
                    color: colors.black,
                    textAlign,
                  },
                  isTablet && { height: 56, fontSize: 16, paddingHorizontal: 18, borderRadius: 14 },
                ]}
                placeholder="نموونە: ئارام ئەحمەد"
                placeholderTextColor={colors.gray400}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            {/* Email */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.black }, isTablet && { fontSize: 16 }]}>
                {t('management.employeeEmail')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                    borderColor: colors.gray300,
                    color: colors.black,
                    textAlign: 'left',
                  },
                  isTablet && { height: 56, fontSize: 16, paddingHorizontal: 18, borderRadius: 14 },
                ]}
                placeholder="employee@market.com"
                placeholderTextColor={colors.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.black }, isTablet && { fontSize: 16 }]}>
                {t('management.password')}
              </Text>
              <View
                style={[
                  styles.passwordContainer,
                  {
                    backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                    borderColor: colors.gray300,
                  },
                  isTablet && { height: 56, paddingHorizontal: 18, borderRadius: 14 },
                ]}
              >
                <TextInput
                  style={[
                    styles.passwordInput,
                    {
                      color: colors.black,
                      textAlign: 'left',
                    },
                    isTablet && { fontSize: 16 },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.gray400}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={isTablet ? 24 : 20}
                    color={colors.gray400}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Manager Official Email (Locked to Current Manager) */}
            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.label, { color: colors.black }, isTablet && { fontSize: 16 }]}>
                  {t('management.managerEmail')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="lock-closed" size={isTablet ? 15 : 13} color={colors.primary} />
                  <Text style={{ fontSize: isTablet ? 13 : 11, color: colors.primary, fontWeight: '600' }}>
                    تایبەت بە هەژماری خۆت
                  </Text>
                </View>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                    borderColor: colors.gray300,
                    color: colors.gray600,
                    textAlign: 'left',
                    opacity: 0.85,
                  },
                  isTablet && { height: 56, fontSize: 16, paddingHorizontal: 18, borderRadius: 14 },
                ]}
                editable={false}
                value={managerEmail}
              />
              <Text style={[styles.hint, { color: colors.gray500 }, isTablet && { fontSize: 13.5, lineHeight: 20 }]}>
                ئەم کارمەندە تەنها دەبەسترێتەوە بە کۆگاو مارکێتەکەی خۆت و هیچ بەڕێوەبەرێکی تر نایبینێت.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: isSubmitting ? 0.7 : 1,
                },
                isTablet && { height: 60, borderRadius: 18, marginTop: 18 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.submitBtnText, isTablet && { fontSize: 18 }]}>{t('management.addEmployee')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  passwordContainer: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

