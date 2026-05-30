import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { ModuleDefinition } from '@/constants/config';

interface Props {
  module: ModuleDefinition;
  enabled: boolean;
  label: string;
}

export function ModuleCard({ module, enabled, label }: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();

  const handlePress = () => {
    if (!enabled) return;
    router.push(module.route as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={!enabled}
      style={styles.touchable}
    >
      <MotiView
        animate={{ opacity: enabled ? 1 : 0.45, scale: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        style={[
          styles.card,
          {
            backgroundColor: enabled ? colors.white : colors.gray100,
            borderColor:     enabled ? colors.lightBlue : colors.gray200,
          },
          Theme.shadow.card,
        ]}
      >
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: enabled ? colors.softBlue : colors.gray100 },
          ]}
        >
          <Ionicons
            name={module.icon as ComponentProps<typeof Ionicons>['name']}
            size={32}
            color={enabled ? colors.primary : colors.gray400}
          />
        </View>

        <Text
          style={[
            styles.label,
            { color: enabled ? colors.darkBlue : colors.gray400 },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>

        {!enabled && (
          <View style={[styles.lockBadge, { backgroundColor: colors.gray100 }]}>
            <Ionicons name="lock-closed" size={10} color={colors.gray400} />
          </View>
        )}
      </MotiView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: { flex: 1, margin: 6 },
  card: {
    borderRadius:    Theme.radius.card,
    padding:         20,
    alignItems:      'center',
    justifyContent:  'center',
    minHeight:       140,
    borderWidth:     1,
    position:        'relative',
  },
  iconWrapper: {
    width:          64,
    height:         64,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   12,
  },
  label: {
    fontSize:   13,
    fontWeight: '600',
    textAlign:  'center',
    lineHeight: 18,
  },
  lockBadge: {
    position:       'absolute',
    top:            10,
    right:          10,
    width:          20,
    height:         20,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
