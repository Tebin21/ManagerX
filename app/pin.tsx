import React, { useState, useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  Alert, Image, Animated,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { verifyPin, clearPin } from '@/lib/pinUtils';
import { markPinUnlocked } from './index';
import { Colors } from '@/constants/colors';

const MAX_ATTEMPTS = 5;
const PIN_LENGTH   = 4;

const KEYPAD = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['', '0','⌫'],
];

export default function PinScreen() {
  const { t } = useTranslation();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const business = useBusinessStore();
  const setPinEnabled = useSettingsStore((s) => s.setPinEnabled);

  const [pin, setPin]           = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked]     = useState(false);
  const shakeAnim               = useRef(new Animated.Value(0)).current;

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length);

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleKey(key: string) {
    if (locked || pin.length >= PIN_LENGTH) return;

    if (key === '⌫') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      const ok = await verifyPin(newPin);
      if (ok) {
        markPinUnlocked();
        router.replace('/(app)/dashboard');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        shake();
        setPin('');
        if (newAttempts >= MAX_ATTEMPTS) {
          setLocked(true);
        }
      }
    }
  }

  function handleForgot() {
    Alert.alert(
      t('pin.forgotTitle'),
      t('pin.forgotMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('pin.resetApp'),
          style: 'destructive',
          onPress: async () => {
            await clearPin();
            setPinEnabled(false);
            markPinUnlocked();
            router.replace('/');
          },
        },
      ]
    );
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      {/* Logo / business name */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.header}
      >
        {business.logoUri ? (
          <Image source={{ uri: business.logoUri }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Ionicons name="business" size={32} color={Colors.primary} />
          </View>
        )}
        <Text style={styles.bizName}>{business.name || 'ManagerX'}</Text>
        <Text style={styles.subtitle}>
          {locked ? t('pin.tooManyAttempts') : t('pin.enterPin')}
        </Text>
      </MotiView>

      {/* PIN dots */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {dots.map((filled, i) => (
          <MotiView
            key={i}
            animate={{ scale: filled ? 1.2 : 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={[styles.dot, filled ? styles.dotFilled : styles.dotEmpty]}
          />
        ))}
      </Animated.View>

      {/* Error / attempts feedback */}
      {attempts > 0 && !locked && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.errorRow}
        >
          <Ionicons name="alert-circle" size={14} color="#FEF3C7" />
          <Text style={styles.errorText}>
            {t('pin.attemptsLeft', { count: MAX_ATTEMPTS - attempts })}
          </Text>
        </MotiView>
      )}

      {/* Keypad */}
      {!locked && (
        <View style={styles.keypad}>
          {KEYPAD.map((row, ri) => (
            <View key={ri} style={styles.keypadRow}>
              {row.map((key, ki) => {
                if (key === '') return <View key={ki} style={styles.keyEmpty} />;
                return (
                  <TouchableOpacity
                    key={ki}
                    style={[styles.key, key === '⌫' ? styles.keyDelete : null]}
                    onPress={() => handleKey(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.keyText, key === '⌫' && styles.keyTextDelete]}>
                      {key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* Forgot PIN */}
      <TouchableOpacity style={styles.forgotBtn} onPress={handleForgot}>
        <Text style={styles.forgotText}>{t('pin.forgotPin')}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly' },

  header:        { alignItems: 'center', gap: 8 },
  logo:          { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  logoPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  bizName:  { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  dotsRow:  { flexDirection: 'row', gap: 20 },
  dot:      { width: 18, height: 18, borderRadius: 9 },
  dotEmpty: { backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  dotFilled:{ backgroundColor: '#fff' },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontSize: 13, color: '#FEF3C7', fontWeight: '600' },

  keypad:    { width: '72%', gap: 14 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between' },
  key:       {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  keyDelete: { backgroundColor: 'rgba(255,255,255,0.08)' },
  keyEmpty:  { width: 72, height: 72 },
  keyText:       { fontSize: 24, fontWeight: '600', color: '#fff' },
  keyTextDelete: { fontSize: 22 },

  forgotBtn:  { paddingVertical: 12 },
  forgotText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textDecorationLine: 'underline' },
});
