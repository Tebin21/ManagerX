import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useBusinessStore } from '@/store/businessStore';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BUSINESS_TYPES } from '@/constants/config';

function resolveType(type: string): { emoji: string; label: string } | null {
  if (!type?.trim()) return null;
  // Only predefined chip IDs get an emoji. Free-form typed text gets none.
  const match = BUSINESS_TYPES.find((t) => t.id === type);
  if (match) return { emoji: match.emoji, label: match.label };
  return { emoji: '', label: type.trim() };
}

export function BusinessHeader() {
  const { name, type, phone, address, logoUri } = useBusinessStore();
  const { colors: themeColors } = useAppTheme();

  const resolved = resolveType(type);
  // Logo placeholder shows the predefined emoji when available, otherwise a generic building.
  const typeEmoji = resolved?.emoji || '🏢';

  return (
    <LinearGradient
      colors={[themeColors.gradientStart, themeColors.gradientMid]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.logoContainer}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoEmoji}>{typeEmoji}</Text>
              </View>
            )}
          </View>

          <View style={styles.info}>
            <View style={styles.nameGroup}>
              <Text style={styles.businessName} numberOfLines={1}>
                {name || 'My Business'}
              </Text>
              {resolved ? (
                <Text style={styles.typeText} numberOfLines={1}>{resolved.label}</Text>
              ) : null}
            </View>

            <View style={styles.contactGroup}>
              {phone ? (
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.detailText}>{phone}</Text>
                </View>
              ) : null}
              {address ? (
                <View style={styles.detailRow}>
                  <Feather name="map-pin" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={[styles.detailText, styles.addressText]} numberOfLines={1}>{address}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.brandRow}>
          <Text style={styles.brandText}>ManagerX</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 4,
  },
  container: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 50,
  },
  info: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    marginTop: 4,
  },
  nameGroup: {
    gap: 2,
  },
  contactGroup: {
    gap: 4,
  },
  businessName: {
    fontSize: 17,
    lineHeight: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  typeText: {
    fontSize: 13,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    lineHeight: 13,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
  addressText: {
    // The map-pin glyph's visual weight (circle) sits above its own bounding-box
    // center, same as every pin-shaped icon — nudge the text down to optically
    // meet it. translateY is paint-only so it can't affect row height/spacing.
    transform: [{ translateY: 1 }],
  },
  brandRow: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  brandText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
