import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EMAIL_RE } from '@/lib/validation';

export interface EmailPasswordValues {
  name?: string;
  email: string;
  password: string;
}

interface Props {
  mode: 'signin' | 'signup';
  loading?: boolean;
  submitLabel: string;
  onSubmit: (values: EmailPasswordValues) => void;
}

// Shared field set + local validation for both the Login and Sign Up screens —
// only the fields shown and the submit label differ between modes; the actual
// Firebase call and post-submit navigation stay in the parent screen, which also
// owns the server-side error banner (invalid credentials, network, etc.) since
// that error isn't specific to any one field the way validation errors are.
export function EmailPasswordForm({ mode, loading, submitLabel, onSubmit }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (mode === 'signup' && !name.trim()) {
      next.name = t('signup.validation.nameRequired');
    }
    if (!email.trim()) {
      next.email = t('signup.validation.emailRequired');
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = t('signup.validation.emailInvalid');
    }
    if (!password) {
      next.password = t('signup.validation.passwordRequired');
    } else if (mode === 'signup' && password.length < 6) {
      next.password = t('signup.validation.passwordTooShort');
    }
    if (mode === 'signup' && password !== confirmPassword) {
      next.confirmPassword = t('signup.validation.passwordsDontMatch');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({ name: mode === 'signup' ? name.trim() : undefined, email: email.trim(), password });
  };

  return (
    <View>
      {mode === 'signup' && (
        <AppTextInput
          label={t('signup.nameLabel')}
          placeholder={t('signup.namePlaceholder')}
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
        />
      )}
      <AppTextInput
        label={t(mode === 'signup' ? 'signup.emailLabel' : 'login.emailLabel')}
        placeholder={t(mode === 'signup' ? 'signup.emailPlaceholder' : 'login.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        forceLatin
      />
      <AppTextInput
        label={t(mode === 'signup' ? 'signup.passwordLabel' : 'login.passwordLabel')}
        placeholder={t(mode === 'signup' ? 'signup.passwordPlaceholder' : 'login.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        forceLatin
      />
      {mode === 'signup' && (
        <AppTextInput
          label={t('signup.confirmPasswordLabel')}
          placeholder={t('signup.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={errors.confirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          forceLatin
        />
      )}
      <PrimaryButton label={submitLabel} onPress={handleSubmit} loading={loading} />
    </View>
  );
}
