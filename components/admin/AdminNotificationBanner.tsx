import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import {
  isAdminEmail,
  subscribeToAdminPaymentRequests,
  type PaymentRequestData,
} from '@/lib/adminNotificationService';

const ADMIN_PORTAL_URL = 'https://froshiar.store/ckb/admin';

export function AdminNotificationBanner() {
  const user = useAuthStore((s) => s.user);
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [activeRequest, setActiveRequest] = useState<PaymentRequestData | null>(null);
  const translateY = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (!isAdminEmail(user?.email)) {
      setActiveRequest(null);
      return;
    }

    const unsub = subscribeToAdminPaymentRequests(user?.email, (req) => {
      setActiveRequest(req);

      // Slide in from top
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 9,
      }).start();
    });

    return () => unsub();
  }, [user?.email]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveRequest(null);
    });
  };

  const handleOpenAdminPanel = () => {
    Linking.openURL(ADMIN_PORTAL_URL).catch(() => {});
    handleDismiss();
  };

  if (!activeRequest) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 12),
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.banner,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: colors.primary,
          },
        ]}
      >
        {/* Header with Icon and Close */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              داواکارییەکی نوێی سەبسکرایب گەیشت! 🔔
            </Text>
            <View style={[styles.iconBadge, { backgroundColor: colors.primary + '25' }]}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Request Details */}
        <View style={styles.body}>
          <Text style={[styles.customerInfo, { color: isDark ? '#CBD5E1' : '#334155' }]}>
            کڕیار: <Text style={styles.boldText}>{activeRequest.customerName}</Text>
            {activeRequest.businessName ? ` (${activeRequest.businessName})` : ''}
          </Text>

          <View style={styles.badgeRow}>
            <View style={[styles.tag, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>
                {activeRequest.planLabel}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Text style={[styles.tagText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                {activeRequest.amount}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Text style={[styles.tagText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                {activeRequest.paymentMethod}
              </Text>
            </View>
          </View>

          <Text style={[styles.emailText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            ئیمەیڵ: {activeRequest.email}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleOpenAdminPanel}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Ionicons name="open-outline" size={16} color="#0F172A" />
            <Text style={styles.actionBtnText}>سەردانی ئەدمین پانێڵ بۆ پەسەندکردن</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 10,
  },
  banner: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  customerInfo: {
    fontSize: 13,
  },
  boldText: {
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emailText: {
    fontSize: 11,
    marginTop: 4,
  },
  actionRow: {
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
});
