import React, { useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/settings/SettingsText';
import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import { THEME_PRESETS } from '@/constants/themes';
import { darken, lighten } from '@/lib/colorUtils';
import { useRTL } from '@/lib/rtl';

const COLS        = 2;
const GAP         = 12;
const PADDING     = 16;
const CARD_HEIGHT = 96;
const RADIUS      = 16;

export default function ThemeScreen() {
  const { t }               = useTranslation();
  const { colors }          = useAppTheme();
  const { isRTL }           = useRTL();
  const { width: screenW }  = useWindowDimensions();
  const accentColor         = useSettingsStore((s) => s.accentColor);
  const setAccentColor      = useSettingsStore((s) => s.setAccentColor);
  const notifyAccentColorChanged = useOnlineStoreStore((s) => s.notifyAccentColorChanged);

  const cardWidth = (screenW - PADDING * 2 - GAP * (COLS - 1)) / COLS;

  const activeKey = useMemo(() => {
    if (!accentColor) return 'default';
    const match = THEME_PRESETS.find(
      (p) => p.primary.toLowerCase() === accentColor.toLowerCase()
    );
    return match?.key ?? null;
  }, [accentColor]);

  const listHeader = (
    <Text style={[st.sectionHeader, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
      {t('settings.themeScreen.presets').toUpperCase()}
    </Text>
  );

  const listFooter = (
    <View>
      <TouchableOpacity
        activeOpacity={0.80}
        onPress={() => { setAccentColor(null); notifyAccentColorChanged(); }}
        style={[
          st.resetCard,
          {
            backgroundColor: colors.white,
            borderColor:     colors.gray200,
            flexDirection:   'row',
          },
        ]}
      >
        <View style={[st.resetIcon, { backgroundColor: colors.gray100 }]}>
          <Ionicons name="refresh" size={18} color={colors.gray500} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.resetLabel, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('settings.themeScreen.reset')}
          </Text>
          <Text style={[st.resetSub, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('settings.themeScreen.resetSub')}
          </Text>
        </View>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={16}
          color={colors.gray300}
        />
      </TouchableOpacity>
      <View style={{ height: 48 }} />
    </View>
  );

  return (
    <View style={[st.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.themeScreen.title')} showBack />

      <FlatList
        data={THEME_PRESETS}
        keyExtractor={(item) => item.key}
        numColumns={COLS}
        columnWrapperStyle={st.row}
        contentContainerStyle={st.body}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        renderItem={({ item: preset }) => {
          const isActive = activeKey === preset.key;
          return (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => { setAccentColor(preset.primary); notifyAccentColorChanged(); }}
              style={[
                st.card,
                { width: cardWidth },
                isActive
                  ? { borderColor: preset.primary }
                  : { borderColor: 'transparent' },
              ]}
            >
              <LinearGradient
                colors={[
                  darken(preset.primary, 0.25),
                  preset.primary,
                  lighten(preset.primary, 0.18),
                ] as [string, string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.cardGrad}
              >
                {isActive && (
                  <View style={[st.checkBadge, isRTL ? { left: 10 } : { right: 10 }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
                <Text
                  style={[
                    st.cardName,
                    { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                  ]}
                  numberOfLines={1}
                >
                  {t(`settings.themeScreen.colors.${preset.key}`)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  body:      { padding: PADDING, paddingTop: 12 },

  sectionHeader: {
    fontSize:          11,
    fontWeight:        '700',
    letterSpacing:     0.8,
    marginBottom:      12,
    paddingHorizontal: 2,
  },

  row: { flexDirection: 'row' },

  card: {
    borderRadius:  RADIUS,
    overflow:      'hidden',
    borderWidth:   2.5,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius:  10,
    elevation:     5,
  },
  cardGrad: {
    height:         CARD_HEIGHT,
    padding:        12,
    justifyContent: 'flex-end',
  },
  checkBadge: {
    position:        'absolute',
    top:             10,
    width:           24,
    height:          24,
    borderRadius:    12,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  cardName: {
    fontSize:         12,
    fontWeight:       '700',
    color:            '#fff',
    textShadowColor:  'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  resetCard: {
    marginTop:     20,
    borderRadius:  16,
    borderWidth:   1,
    alignItems:    'center',
    padding:       16,
    gap:           12,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius:  3,
    elevation:     1,
  },
  resetIcon: {
    width:          36,
    height:         36,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  resetLabel: { fontSize: 15, fontWeight: '600' },
  resetSub:   { fontSize: 12, marginTop: 2 },
});
