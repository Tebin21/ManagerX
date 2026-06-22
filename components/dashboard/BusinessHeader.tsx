import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
            <Text style={styles.businessName} numberOfLines={1}>
              {name || 'My Business'}
            </Text>
            {resolved ? (
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {resolved.emoji ? `${resolved.emoji} ${resolved.label}` : resolved.label}
                </Text>
              </View>
            ) : null}
            {phone ? (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailText}>{phone}</Text>
              </View>
            ) : null}
            {address ? (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailText} numberOfLines={1}>{address}</Text>
              </View>
            ) : null}
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
    alignItems: 'flex-start',
    gap: 16,
  },
  logoContainer: {
    width: 94,
    height: 94,
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
    fontSize: 40,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  typeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  detailText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
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
