import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Modal,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { copyToPermanentStorage } from '@/lib/imageStorage';
import { ensureGalleryAccess } from '@/lib/mediaAccess';
import { toEnglishDigits } from '@/utils/formatters';

const DEFAULT_BANNER_IMAGE = require('@/assets/images/dashboard-hero-default.png');
const CUSTOM_STORAGE_KEY = '@froshiar_dashboard_custom_banners_v2';
const HINT_DISMISSED_KEY = '@froshiar_banner_hint_dismissed_v2';
const MAX_CUSTOM_IMAGES = 2; // User can add up to 2 custom images (Total 3 with default)
const SLIDE_INTERVAL = 5000; // 5 seconds sliding interval
const HINT_INTERVAL = 10000; // 10 seconds reminder cycle

interface BannerSlide {
  id: string;
  isDefault: boolean;
  source: any;
}

export function DashboardHeroSlider() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const [customImages, setCustomImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  // Periodic reminder hint states (10-second pulse)
  const [hintDismissed, setHintDismissed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintTranslateY = useRef(new Animated.Value(8)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatListRef = useRef<FlatList<BannerSlide>>(null);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 32);

  // 1. Slides composition: Slot 1 is ALWAYS the permanent Froshiar default banner
  const slides = useMemo<BannerSlide[]>(() => {
    const list: BannerSlide[] = [
      { id: 'default_banner_fixed', isDefault: true, source: DEFAULT_BANNER_IMAGE },
    ];
    customImages.forEach((uri, idx) => {
      list.push({ id: `custom_${idx}_${uri}`, isDefault: false, source: { uri } });
    });
    return list;
  }, [customImages]);

  // 2. Load custom images and hint dismissed status from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setCustomImages(parsed.slice(0, MAX_CUSTOM_IMAGES));
            }
          } catch {}
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(HINT_DISMISSED_KEY)
      .then((val) => {
        if (val === 'true') {
          setHintDismissed(true);
        }
      })
      .catch(() => {});
  }, []);

  const saveCustomImages = useCallback(async (newCustom: string[]) => {
    setCustomImages(newCustom);
    try {
      await AsyncStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(newCustom));
      if (newCustom.length > 0) {
        // Once the user modifies/adds a custom image, never show the hint again
        setHintDismissed(true);
        setHintVisible(false);
        await AsyncStorage.setItem(HINT_DISMISSED_KEY, 'true');
      }
    } catch (e) {
      console.warn('[DashboardHeroSlider] failed to persist custom banners:', e);
    }
  }, []);

  // 3. Periodic reminder hint (Shows every 10 seconds while no custom images are added)
  useEffect(() => {
    if (hintDismissed || customImages.length > 0) {
      setHintVisible(false);
      return;
    }

    const showTooltip = () => {
      setHintVisible(true);
      Animated.parallel([
        Animated.timing(hintOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(hintTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(hintOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(hintTranslateY, { toValue: 8, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          setHintVisible(false);
        });
      }, 3800);
    };

    // First appearance shortly after opening dashboard (2.5s)
    const initialTimer = setTimeout(showTooltip, 2500);

    // Periodic reminder every 10 seconds
    const interval = setInterval(showTooltip, HINT_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [hintDismissed, customImages.length, hintOpacity, hintTranslateY]);

  const dismissHintForever = () => {
    setHintDismissed(true);
    setHintVisible(false);
    AsyncStorage.setItem(HINT_DISMISSED_KEY, 'true').catch(() => {});
  };

  // 4. 5-second automatic sliding animation when more than 1 image is present
  useEffect(() => {
    if (slides.length <= 1) return;

    if (slideTimerRef.current) clearInterval(slideTimerRef.current);

    slideTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length;
        flatListRef.current?.scrollToIndex({
          index: next,
          animated: true,
        });
        return next;
      });
    }, SLIDE_INTERVAL);

    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [slides.length]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth <= 0) return;
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / containerWidth);
    if (index >= 0 && index < slides.length) {
      setActiveIndex(index);
    }
  };

  const handleOpenManager = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setModalOpen(true);
  };

  const pickImageForCustomSlot = async (customSlotIndex: number) => {
    try {
      setLoadingSlot(customSlotIndex + 1);
      const access = await ensureGalleryAccess();
      if (access === 'denied-first-time' || access === 'denied-repeat') {
        Alert.alert(
          isKurdish ? 'ڕێگەپێدانی وێنە پێویستە' : 'Photo Access Needed',
          isKurdish
            ? 'تکایە لە ڕێکخستنەکان ڕێگە بدە بۆ هەڵبژاردنی وێنە.'
            : 'Please allow photos access in device settings.'
        );
        return;
      }

      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const tempUri = result.assets[0].uri;
      const permUri = await copyToPermanentStorage(tempUri, 'dashboard_banners');

      const updated = [...customImages];
      if (customSlotIndex < updated.length) {
        updated[customSlotIndex] = permUri;
      } else {
        updated.push(permUri);
      }

      await saveCustomImages(updated.slice(0, MAX_CUSTOM_IMAGES));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      console.warn('[DashboardHeroSlider] image pick error:', err);
    } finally {
      setLoadingSlot(null);
    }
  };

  const removeCustomSlot = async (customSlotIndex: number) => {
    const updated = customImages.filter((_, i) => i !== customSlotIndex);
    await saveCustomImages(updated);
    if (activeIndex >= updated.length + 1) {
      setActiveIndex(0);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
      {/* Banner Container with long-press management */}
      <TouchableOpacity
        activeOpacity={0.96}
        onLongPress={handleOpenManager}
        style={[styles.sliderContainer, { backgroundColor: isDark ? colors.gray100 : colors.gray200 }]}
      >
        <FlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: containerWidth,
            offset: containerWidth * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={[styles.slideItem, { width: containerWidth }]}>
              <Image source={item.source} style={styles.slideImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.42)']}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
        />

        {/* Periodic Reminder Hint (Floating Glassmorphism Tooltip) */}
        {hintVisible && !hintDismissed && customImages.length === 0 && (
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.hintPillContainer,
              {
                opacity: hintOpacity,
                transform: [{ translateY: hintTranslateY }],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleOpenManager}
              style={[styles.hintPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text
                style={[
                  styles.hintText,
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('dashboard.hintAddImages')}
              </Text>
              <TouchableOpacity
                onPress={dismissHintForever}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.hintCloseBtn}
              >
                <Ionicons name="close" size={12} color="rgba(255, 255, 255, 0.65)" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Pagination Dots (Displayed when there are 2 or 3 images) */}
        {slides.length > 1 && (
          <View style={styles.dotsRow}>
            {slides.map((_, i) => (
              <View
                key={`dot_${i}`}
                style={[
                  styles.dot,
                  i === activeIndex
                    ? [styles.activeDot, { backgroundColor: colors.primary }]
                    : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* Image Manager Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? colors.gray100 : colors.white }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.modalTitleGroup}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.darkBlue, textAlign },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('dashboard.manageImages')}
                </Text>
                <Text style={[styles.modalSub, { color: colors.gray400, textAlign }]}>
                  {t('dashboard.manageImagesSub')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
              >
                <Ionicons name="close" size={20} color={colors.darkBlue} />
              </TouchableOpacity>
            </View>

            {/* Slots Grid: Slot 1 is Fixed Default, Slots 2 & 3 are Customizable */}
            <View style={styles.slotsContainer}>
              {/* Slot 1: Locked Permanent Froshiar Banner */}
              <View
                style={[
                  styles.slotCard,
                  {
                    backgroundColor: isDark ? colors.white : colors.gray50,
                    borderColor: colors.primary + '55',
                  },
                ]}
              >
                <View style={styles.slotImageWrap}>
                  <Image source={DEFAULT_BANNER_IMAGE} style={styles.slotPreview} />
                  <View style={[styles.slotBadge, styles.lockedBadge]}>
                    <Ionicons name="lock-closed" size={10} color={colors.primary} />
                    <Text style={[styles.slotBadgeText, { color: colors.primary }]}>
                      {t('dashboard.defaultBannerLocked')}
                    </Text>
                  </View>

                  <View style={[styles.lockedBannerNotice, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                    <Text
                      style={[
                        styles.lockedBannerNoticeText,
                        { color: '#FFFFFF' },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                      ]}
                    >
                      {t('dashboard.defaultBannerFixed')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Slots 2 & 3: Custom User Images */}
              {[0, 1].map((customIdx) => {
                const slotNumber = customIdx + 2;
                const customUri = customImages[customIdx];
                const isLoadingThis = loadingSlot === customIdx + 1;

                return (
                  <View
                    key={`custom_slot_${customIdx}`}
                    style={[
                      styles.slotCard,
                      {
                        backgroundColor: isDark ? colors.white : colors.gray50,
                        borderColor: customUri ? colors.primary + '50' : colors.gray200,
                      },
                    ]}
                  >
                    {customUri ? (
                      <View style={styles.slotImageWrap}>
                        <Image source={{ uri: customUri }} style={styles.slotPreview} />
                        <View style={styles.slotBadge}>
                          <Text style={[styles.slotBadgeText, { writingDirection: 'ltr' }]}>
                            {toEnglishDigits(slotNumber)}
                          </Text>
                        </View>
                        <View style={[styles.slotActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <TouchableOpacity
                            style={[styles.slotBtn, { backgroundColor: colors.primary }]}
                            onPress={() => pickImageForCustomSlot(customIdx)}
                            disabled={isLoadingThis}
                          >
                            <Ionicons name="repeat" size={14} color="#FFF" />
                            <Text style={styles.slotBtnText}>{t('dashboard.replaceImage')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.slotBtn, { backgroundColor: colors.error }]}
                            onPress={() => removeCustomSlot(customIdx)}
                            disabled={isLoadingThis}
                          >
                            <Ionicons name="trash-outline" size={14} color="#FFF" />
                            <Text style={styles.slotBtnText}>{t('dashboard.deleteImage')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.emptySlotPressable}
                        onPress={() => pickImageForCustomSlot(customIdx)}
                        disabled={isLoadingThis}
                      >
                        <View
                          style={[
                            styles.slotBadge,
                            {
                              backgroundColor: colors.primary + '18',
                              borderWidth: 1,
                              borderColor: colors.primary + '40',
                            },
                          ]}
                        >
                          <Text style={[styles.slotBadgeText, { color: colors.primary, writingDirection: 'ltr' }]}>
                            {toEnglishDigits(slotNumber)}
                          </Text>
                        </View>

                        {isLoadingThis ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <View style={[styles.plusIconWrap, { backgroundColor: colors.primary + '18' }]}>
                              <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                            </View>
                            <Text
                              style={[
                                styles.emptySlotText,
                                { color: colors.primary },
                                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                              ]}
                            >
                              {isKurdish
                                ? `دانانی وێنەی ${toEnglishDigits(slotNumber)}`
                                : `Add Image ${slotNumber}`}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Bottom Done Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalOpen(false)}
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.doneBtnText,
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('common.done')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  sliderContainer: {
    height: 150,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  slideItem: {
    height: 150,
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  hintPillContainer: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    zIndex: 20,
  },
  hintPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderColor: 'rgba(212, 175, 55, 0.55)',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
    gap: 7,
  },
  hintText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hintCloseBtn: {
    padding: 2,
    marginLeft: 2,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitleGroup: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  slotCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    height: 100,
  },
  slotImageWrap: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  slotPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  slotBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBadge: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(212, 175, 55, 0.5)',
    borderWidth: 1,
  },
  slotBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  lockedBannerNotice: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  lockedBannerNoticeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  slotActions: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    gap: 8,
  },
  slotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  slotBtnText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  emptySlotPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderStyle: 'dashed',
  },
  plusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  doneButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
