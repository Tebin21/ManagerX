import React, { useState, useRef } from 'react';
import {
  View, TouchableOpacity, Animated, Alert, StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { SettingSwitch } from '@/components/settings/SettingSwitch';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { savePin, verifyPin, clearPin } from '@/lib/pinUtils';
import { Colors } from '@/constants/colors';

type Mode = 'main' | 'setup' | 'confirm' | 'verify';
type PendingAction = 'enable' | 'change' | 'disable';

const PIN_LENGTH = 4;
const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['',  '0', '⌫'],
];

export default function SecurityScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const pinEnabled    = useSettingsStore((s) => s.pinEnabled);
  const setPinEnabled = useSettingsStore((s) => s.setPinEnabled);

  const [mode, setMode]                 = useState<Mode>('main');
  const [pendingAction, setPendingAction] = useState<PendingAction>('enable');
  const [pin, setPin]                   = useState('');
  const [newPin, setNewPin]             = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const modeHints: Record<Mode, string> = {
    main:    '',
    setup:   t('settings.securityScreen.enterNewPin'),
    confirm: t('settings.securityScreen.reEnterPin'),
    verify:  t('settings.securityScreen.enterCurrent'),
  };

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function startFlow(action: PendingAction) {
    setPendingAction(action);
    setPin('');
    setNewPin('');
    setMode(action === 'enable' ? 'setup' : 'verify');
  }

  function cancelFlow() {
    setMode('main');
    setPin('');
    setNewPin('');
  }

  async function handleKey(key: string) {
    if (key === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    if (mode === 'setup') {
      setNewPin(next);
      setPin('');
      setMode('confirm');

    } else if (mode === 'confirm') {
      if (next === newPin) {
        await savePin(next);
        setPinEnabled(true);
        cancelFlow();
        Alert.alert(t('settings.securityScreen.pinSet'), t('settings.securityScreen.pinSetMsg'));
      } else {
        shake();
        setPin('');
        setNewPin('');
        setMode('setup');
        Alert.alert(t('common.error'), t('settings.securityScreen.mismatch'));
      }

    } else if (mode === 'verify') {
      const ok = await verifyPin(next);
      if (!ok) {
        shake();
        setPin('');
        Alert.alert(t('settings.securityScreen.incorrectPin'), t('settings.securityScreen.incorrectPinMsg'));
        return;
      }
      if (pendingAction === 'disable') {
        await clearPin();
        setPinEnabled(false);
        cancelFlow();
      } else if (pendingAction === 'change') {
        setPin('');
        setNewPin('');
        setMode('setup');
      }
    }
  }

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length);

  if (mode !== 'main') {
    const headerTitle =
      mode === 'setup'   ? (pendingAction === 'change' ? t('settings.securityScreen.newPin') : t('settings.securityScreen.setPin')) :
      mode === 'confirm' ? t('settings.securityScreen.confirmPin') :
      t('settings.securityScreen.verifyPin');

    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={headerTitle} showBack={false} />

        <View style={styles.pinContainer}>
          <Text style={[styles.pinHint, { color: colors.gray500 }]}>
            {modeHints[mode]}
          </Text>

          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {dots.map((filled, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  filled
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.gray300 },
                ]}
              />
            ))}
          </Animated.View>

          <View style={styles.keypad}>
            {KEYPAD.map((row, ri) => (
              <View key={ri} style={styles.keypadRow}>
                {row.map((key, ki) => {
                  if (key === '') return <View key={ki} style={styles.keyEmpty} />;
                  return (
                    <TouchableOpacity
                      key={ki}
                      style={[styles.key, { backgroundColor: colors.gray100, borderColor: colors.gray200 }]}
                      onPress={() => handleKey(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.keyText, { color: colors.black }]}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={cancelFlow} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.gray400 }]}>{t('settings.securityScreen.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.securityScreen.title')} showBack />

      <View style={styles.body}>
        <SettingSection title={t('settings.securityScreen.pinLock')}>
          <SettingSwitch
            icon="lock-closed"
            label={t('settings.securityScreen.enablePin')}
            sub={t(pinEnabled ? 'settings.securityScreen.enablePinSub' : 'settings.securityScreen.disablePinSub')}
            value={pinEnabled}
            onToggle={(v) => startFlow(v ? 'enable' : 'disable')}
          />
        </SettingSection>

        {pinEnabled && (
          <SettingSection title={t('settings.securityScreen.actions')}>
            <SettingRow
              icon="key"
              label={t('settings.securityScreen.changePin')}
              sub={t('settings.securityScreen.changePinSub')}
              onPress={() => startFlow('change')}
            />
            <SettingRow
              icon="trash"
              label={t('settings.securityScreen.removePin')}
              sub={t('settings.securityScreen.removePinSub')}
              destructive
              onPress={() => startFlow('disable')}
            />
          </SettingSection>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  gradHeader:   { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  body:         { padding: 16, paddingTop: 8 },

  pinContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 36 },
  pinHint:      { fontSize: 16, fontWeight: '500' },

  dotsRow: { flexDirection: 'row', gap: 20 },
  dot:     { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },

  keypad:    { width: '72%', gap: 14 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between' },
  key:       {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  keyEmpty:  { width: 72, height: 72 },
  keyText:   { fontSize: 22, fontWeight: '600' },

  cancelBtn:  { paddingVertical: 12 },
  cancelText: { fontSize: 14 },
});
