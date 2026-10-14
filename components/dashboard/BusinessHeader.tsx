import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Text } from '@/components/ui/AppText';
import { useBusinessStore } from '@/store/businessStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BUSINESS_TYPES } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { copyToPermanentStorage } from '@/lib/imageStorage';
import { ensureGalleryAccess } from '@/lib/mediaAccess';
import { toEnglishDigits } from '@/utils/formatters';
import { HeaderTypewriterText } from '@/components/dashboard/HeaderTypewriterText';
import { hexToRgba } from '@/lib/colorUtils';

const DEFAULT_BANNER_IMAGE = require('@/assets/images/dashboard-hero-default.png');

// Storage keys
const BANNER_STORAGE_KEY = '@froshiar_dashboard_custom_banners_v2';
const BUSINESS_BG_STORAGE_KEY = '@froshiar_business_card_custom_banners_v2';
const BANNER_VIDEO_KEY = '@froshiar_dashboard_banner_video_v1';
const BUSINESS_VIDEO_KEY = '@froshiar_business_card_video_v1';

const MAX_CUSTOM_BANNER_IMAGES = 2; // Slots 1 & 2 for custom banners
const MAX_CUSTOM_BIZ_IMAGES = 3;    // Up to 3 custom background images for Business Card
const SLIDE_INTERVAL = 5000;         // 5 seconds auto-scroll interval

interface BannerSlide {
  id: string;
  source: any;
}

function resolveType(type: string, isKurdish = false): { emoji: string; label: string } | null {
  if (!type?.trim()) return null;
  const match = BUSINESS_TYPES.find((t) => t.id === type);
  if (match) return { emoji: match.emoji, label: isKurdish ? (match.labelKu ?? match.label) : match.label };
  return { emoji: '', label: type.trim() };
}

/**
 * Looping background video component powered by expo-video
 */
function HeaderVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      style={StyleSheet.absoluteFillObject}
      player={player}
      allowsFullscreen={false}
      nativeControls={false}
      contentFit="cover"
    />
  );
}

export function BusinessHeader() {
  const { t } = useTranslation();
  const { name, type, phone, address, logoUri, showOnDashboard = false } = useBusinessStore();
  const { colors: themeColors, isDark } = useAppTheme();
  const { isTablet, headerMaxWidth } = useResponsive();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  // Video backgrounds
  const [bannerVideo, setBannerVideo] = useState<string | null>(null);
  const [bizVideo, setBizVideo] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // Custom banner images
  const [customBannerImages, setCustomBannerImages] = useState<string[]>([]);

  // Custom business card background images
  const [customBizImages, setCustomBizImages] = useState<string[]>([]);

  // Active index & container width for FlatList paging
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);

  // Modal & picking states
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'banner' | 'business'>(showOnDashboard ? 'business' : 'banner');
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  const flatListRef = useRef<FlatList<BannerSlide>>(null);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active media resolution
  const activeVideo = showOnDashboard ? bizVideo : bannerVideo;

  // 1. Banner Slides Composition:
  // If user uploaded custom banner images, slide between them.
  // Otherwise, fallback to the default Froshiar hero image.
  const bannerSlides = useMemo<BannerSlide[]>(() => {
    if (customBannerImages.length > 0) {
      return customBannerImages.map((uri, idx) => ({
        id: `banner_${idx}_${uri}`,
        source: { uri },
      }));
    }
    return [{ id: 'froshiar_default', source: DEFAULT_BANNER_IMAGE }];
  }, [customBannerImages]);

  // 2. Business Card Slides Composition:
  // By default clean & simple (empty = gradient only), or user's custom images.
  const businessSlides = useMemo<BannerSlide[]>(() => {
    return customBizImages.map((uri, idx) => ({
      id: `biz_${idx}_${uri}`,
      source: { uri },
    }));
  }, [customBizImages]);

  // Current active slides for the background FlatList
  const currentSlides = showOnDashboard ? businessSlides : bannerSlides;

  // 3. Load saved custom media on mount
  useEffect(() => {
    // Banner images
    AsyncStorage.getItem(BANNER_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setCustomBannerImages(parsed.slice(0, MAX_CUSTOM_BANNER_IMAGES));
            }
          } catch {}
        }
      })
      .catch(() => {});

    // Business images
    AsyncStorage.getItem(BUSINESS_BG_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setCustomBizImages(parsed.slice(0, MAX_CUSTOM_BIZ_IMAGES));
            }
          } catch {}
        }
      })
      .catch(() => {});

    // Banner video
    AsyncStorage.getItem(BANNER_VIDEO_KEY)
      .then((val) => {
        if (val) setBannerVideo(val);
      })
      .catch(() => {});

    // Business video
    AsyncStorage.getItem(BUSINESS_VIDEO_KEY)
      .then((val) => {
        if (val) setBizVideo(val);
      })
      .catch(() => {});
  }, []);

  // 4. Smooth 5-Second Auto-Sliding Engine
  useEffect(() => {
    if (activeVideo || currentSlides.length <= 1) {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
      return;
    }

    if (slideTimerRef.current) clearInterval(slideTimerRef.current);

    slideTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % currentSlides.length;
        try {
          flatListRef.current?.scrollToIndex({
            index: next,
            animated: true,
          });
        } catch {}
        return next;
      });
    }, SLIDE_INTERVAL);

    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [currentSlides.length, activeVideo]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth <= 0) return;
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / containerWidth);
    if (index >= 0 && index < currentSlides.length) {
      setActiveIndex(index);
    }
  };

  // 5. Save Handlers
  const saveBannerImages = useCallback(async (newImages: string[]) => {
    setCustomBannerImages(newImages);
    try {
      await AsyncStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(newImages));
    } catch (e) {
      console.warn('[BusinessHeader] Failed to persist banner images:', e);
    }
  }, []);

  const saveBusinessImages = useCallback(async (newImages: string[]) => {
    setCustomBizImages(newImages);
    try {
      await AsyncStorage.setItem(BUSINESS_BG_STORAGE_KEY, JSON.stringify(newImages));
    } catch (e) {
      console.warn('[BusinessHeader] Failed to persist business images:', e);
    }
  }, []);

  const saveBannerVideo = useCallback(async (uri: string | null) => {
    setBannerVideo(uri);
    try {
      if (uri) {
        await AsyncStorage.setItem(BANNER_VIDEO_KEY, uri);
      } else {
        await AsyncStorage.removeItem(BANNER_VIDEO_KEY);
      }
    } catch (e) {
      console.warn('[BusinessHeader] Failed to persist banner video:', e);
    }
  }, []);

  const saveBizVideo = useCallback(async (uri: string | null) => {
    setBizVideo(uri);
    try {
      if (uri) {
        await AsyncStorage.setItem(BUSINESS_VIDEO_KEY, uri);
      } else {
        await AsyncStorage.removeItem(BUSINESS_VIDEO_KEY);
      }
    } catch (e) {
      console.warn('[BusinessHeader] Failed to persist biz video:', e);
    }
  }, []);

  // 6. Open Manager Modal
  const handleOpenManager = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActiveTab(showOnDashboard ? 'business' : 'banner');
    setModalOpen(true);
  }, [showOnDashboard]);

  // 7. Video Picker with Strict 10-Second Validation
  const pickVideo = async () => {
    try {
      setLoadingVideo(true);
      const access = await ensureGalleryAccess();
      if (access === 'denied-first-time' || access === 'denied-repeat') {
        Alert.alert(
          isKurdish ? 'ڕێگەپێدانی میدیا پێویستە' : 'Media Access Needed',
          isKurdish
            ? 'تکایە لە ڕێکخستنەکان ڕێگە بدە بۆ هەڵبژاردنی ڤیدیۆ.'
            : 'Please allow media access in device settings.'
        );
        return;
      }

      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        videoMaxDuration: 10,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const rawDuration = asset.duration ?? 0;
      const durationSec = rawDuration > 100 ? rawDuration / 1000 : rawDuration;

      // Reject if video is longer than 10 seconds
      if (durationSec > 10.5) {
        Alert.alert(
          isKurdish ? 'ئاگاداری' : 'Warning',
          isKurdish
            ? 'نابێت ڤیدیۆکە لە ١٠ چرکە زیاتر بێت'
            : 'The video must not exceed 10 seconds'
        );
        return;
      }

      const tempUri = asset.uri;
      const permUri = await copyToPermanentStorage(tempUri, 'header_videos', 'mp4');

      if (activeTab === 'banner') {
        await saveBannerVideo(permUri);
      } else {
        await saveBizVideo(permUri);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      console.warn('[BusinessHeader] video pick error:', err);
    } finally {
      setLoadingVideo(false);
    }
  };

  const removeVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (activeTab === 'banner') {
      await saveBannerVideo(null);
    } else {
      await saveBizVideo(null);
    }
  };

  // 8. Pick Image for Slot
  const pickImageForSlot = async (slotIdx: number) => {
    try {
      setLoadingSlot(slotIdx);
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

      if (activeTab === 'banner') {
        const updated = [...customBannerImages];
        if (slotIdx < updated.length) updated[slotIdx] = permUri;
        else updated.push(permUri);
        await saveBannerImages(updated.slice(0, MAX_CUSTOM_BANNER_IMAGES));
      } else {
        const updated = [...customBizImages];
        if (slotIdx < updated.length) updated[slotIdx] = permUri;
        else updated.push(permUri);
        await saveBusinessImages(updated.slice(0, MAX_CUSTOM_BIZ_IMAGES));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      console.warn('[BusinessHeader] image pick error:', err);
    } finally {
      setLoadingSlot(null);
    }
  };

  // 9. Remove Slot Image
  const removeSlotImage = async (slotIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (activeTab === 'banner') {
      const updated = customBannerImages.filter((_, i) => i !== slotIdx);
      await saveBannerImages(updated);
    } else {
      const updated = customBizImages.filter((_, i) => i !== slotIdx);
      await saveBusinessImages(updated);
    }
    setActiveIndex(0);
  };

  // 10. Reset Current Tab (Clear custom images and video)
  const handleResetCurrentTab = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (activeTab === 'banner') {
      await saveBannerImages([]);
      await saveBannerVideo(null);
    } else {
      await saveBusinessImages([]);
      await saveBizVideo(null);
    }
    setActiveIndex(0);
  };

  const resolved = resolveType(type, isKurdish);
  const typeEmoji = resolved?.emoji || '🏢';
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  // Current tab media for modal UI
  const currentTabVideo = activeTab === 'banner' ? bannerVideo : bizVideo;
  const currentTabImages = activeTab === 'banner' ? customBannerImages : customBizImages;
  const maxSlots = activeTab === 'banner' ? MAX_CUSTOM_BANNER_IMAGES : MAX_CUSTOM_BIZ_IMAGES;
  const hasCustomMedia = !!currentTabVideo || currentTabImages.length > 0;

  return (
    <>
      <Pressable
        onLongPress={handleOpenManager}
        delayLongPress={400}
        style={styles.pressableRoot}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setContainerWidth(w);
        }}
      >
        <LinearGradient
          colors={[themeColors.gradientStart, themeColors.gradientMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Priority 1: Background Video (Plays on loop) */}
          {activeVideo ? (
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <HeaderVideo key={activeVideo} uri={activeVideo} />
              <LinearGradient
                colors={
                  showOnDashboard
                    ? ['rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.80)']
                    : ['rgba(15, 23, 42, 0.35)', 'rgba(15, 23, 42, 0.72)']
                }
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          ) : currentSlides.length > 0 ? (
            /* Priority 2: Background FlatList Slider */
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <FlatList
                ref={flatListRef}
                data={currentSlides}
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
                  <View style={{ width: containerWidth, height: '100%' }}>
                    <Image source={item.source} style={styles.bgImage} resizeMode="cover" />
                    <LinearGradient
                      colors={
                        showOnDashboard
                          ? ['rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.78)']
                          : ['rgba(15, 23, 42, 0.35)', 'rgba(15, 23, 42, 0.70)']
                      }
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>
                )}
              />
            </View>
          ) : null}


          {/* Surface Content */}
          <View
            style={[
              styles.container,
              isTablet && { maxWidth: headerMaxWidth, alignSelf: 'center', width: '100%' },
            ]}
          >
            {showOnDashboard ? (
              <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.logoContainer}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={styles.logo} />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Text style={[styles.logoEmoji, isTablet && { fontSize: 44 }]}>{typeEmoji}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.info}>
                  <View style={styles.nameGroup}>
                    <Text style={[styles.businessName, { textAlign }]} numberOfLines={1}>
                      {name || 'My Business'}
                    </Text>
                    {resolved ? (
                      <Text style={[styles.typeText, { textAlign }]} numberOfLines={1}>
                        {resolved.label}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.contactGroup}>
                    {phone ? (
                      <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="call-outline" size={isTablet ? 15 : 12} color="rgba(255,255,255,0.85)" />
                        <Text style={[styles.detailText, { textAlign }]}>{phone}</Text>
                      </View>
                    ) : null}
                    {address ? (
                      <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Feather name="map-pin" size={isTablet ? 15 : 12} color="rgba(255,255,255,0.85)" />
                        <Text style={[styles.detailText, styles.addressText, { textAlign }]} numberOfLines={1}>
                          {address}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <View style={styles.brandRow}>
              <HeaderTypewriterText isKurdish={isKurdish} />
            </View>

            {/* Pagination Dots (Only when there is no video and multiple images) */}
            {!activeVideo && currentSlides.length > 1 && (
              <View style={styles.dotsRow}>
                {currentSlides.map((_, i) => (
                  <View
                    key={`dot_${i}`}
                    style={[
                      styles.dot,
                      i === activeIndex
                        ? [styles.activeDot, { backgroundColor: themeColors.primary }]
                        : styles.inactiveDot,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>

      {/* Clean Minimalist Background Manager Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? themeColors.gray100 : themeColors.white }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.modalTitleGroup}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: themeColors.darkBlue, textAlign },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('dashboard.headerBackgroundSettings')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: isDark ? themeColors.gray200 : themeColors.gray100 }]}
              >
                <Ionicons name="close" size={20} color={themeColors.darkBlue} />
              </TouchableOpacity>
            </View>

            {/* Segmented Mode Switcher: Froshiar Banner vs Business Card */}
            <View style={[styles.segmentContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveTab('banner')}
                style={[
                  styles.segmentBtn,
                  activeTab === 'banner' && {
                    backgroundColor: themeColors.primary,
                    borderColor: themeColors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={15}
                  color={activeTab === 'banner' ? '#FFFFFF' : themeColors.gray400}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: activeTab === 'banner' ? '#FFFFFF' : themeColors.darkBlue },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {t('dashboard.tabFroshiarBanner')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveTab('business')}
                style={[
                  styles.segmentBtn,
                  activeTab === 'business' && {
                    backgroundColor: themeColors.primary,
                    borderColor: themeColors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={15}
                  color={activeTab === 'business' ? '#FFFFFF' : themeColors.gray400}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: activeTab === 'business' ? '#FFFFFF' : themeColors.darkBlue },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {t('dashboard.tabBusinessCard')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Reset Pill (Only shown if custom media is set) */}
            {hasCustomMedia && (
              <View style={[styles.resetBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={handleResetCurrentTab}
                  style={[
                    styles.resetBtn,
                    {
                      backgroundColor: hexToRgba(themeColors.error, 0.1),
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  hitSlop={8}
                >
                  <Ionicons name="refresh-outline" size={13} color={themeColors.error} />
                  <Text
                    style={[
                      styles.resetBtnText,
                      { color: themeColors.error },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {activeTab === 'banner'
                      ? t('dashboard.restoreDefaultBanner')
                      : t('dashboard.resetToSimple')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scrollable Media Settings */}
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* SECTION 1: VIDEO UPLOAD (≤ 10 Seconds) */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="videocam-outline" size={17} color={themeColors.primary} />
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: themeColors.darkBlue },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {t('dashboard.headerBgVideo')}
                  </Text>
                </View>
                {/* Exact Kurdish requirement: نابێت ڤیدیۆکە لە 10 چرکە زیاتر بێت */}
                <Text style={[styles.sectionSubtitle, { color: themeColors.gray400, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('dashboard.video10SecNote')}
                </Text>
              </View>

              {currentTabVideo ? (
                /* Video Active Preview Card */
                <View
                  style={[
                    styles.videoCard,
                    {
                      backgroundColor: isDark ? themeColors.white : themeColors.gray50,
                      borderColor: themeColors.primary + '60',
                    },
                  ]}
                >
                  <HeaderVideo uri={currentTabVideo} />
                  <LinearGradient
                    colors={['transparent', 'rgba(15, 23, 42, 0.82)']}
                    style={StyleSheet.absoluteFillObject}
                  />

                  <View style={[styles.videoBadge, { [isRTL ? 'right' : 'left']: 10 }]}>
                    <Ionicons name="videocam" size={11} color="#FFFFFF" />
                    <Text style={styles.videoBadgeText}>10s</Text>
                  </View>

                  <View style={[styles.slotActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      style={[styles.slotBtn, { backgroundColor: themeColors.primary }]}
                      onPress={pickVideo}
                      disabled={loadingVideo}
                    >
                      <Ionicons name="repeat" size={14} color="#FFF" />
                      <Text style={styles.slotBtnText}>{t('dashboard.changeVideo')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.slotBtn, { backgroundColor: themeColors.error }]}
                      onPress={removeVideo}
                      disabled={loadingVideo}
                    >
                      <Ionicons name="trash-outline" size={14} color="#FFF" />
                      <Text style={styles.slotBtnText}>{t('dashboard.deleteVideo')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Empty Video Upload Box */
                <TouchableOpacity
                  style={[
                    styles.emptyVideoBox,
                    {
                      borderColor: isDark ? themeColors.gray200 : '#CBD5E1',
                      backgroundColor: isDark ? themeColors.white : themeColors.gray50,
                    },
                  ]}
                  onPress={pickVideo}
                  disabled={loadingVideo}
                  activeOpacity={0.75}
                >
                  {loadingVideo ? (
                    <ActivityIndicator size="small" color={themeColors.primary} />
                  ) : (
                    <View style={[styles.emptyVideoInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.plusIconWrap, { backgroundColor: themeColors.primary + '18' }]}>
                        <Ionicons name="videocam-outline" size={22} color={themeColors.primary} />
                      </View>
                      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text
                          style={[
                            styles.emptySlotTitle,
                            { color: themeColors.primary },
                            isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {t('dashboard.addVideo')}
                        </Text>
                        <Text style={[styles.emptySlotSub, { color: themeColors.gray400, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                          {t('dashboard.video10SecNote')}
                        </Text>
                      </View>
                      <Ionicons
                        name={isRTL ? 'chevron-back' : 'chevron-forward'}
                        size={18}
                        color={themeColors.gray400}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* SECTION 2: CUSTOM PHOTOS (Clean slots with no locked slot) */}
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="images-outline" size={17} color={themeColors.primary} />
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: themeColors.darkBlue },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {t('dashboard.headerBgImages')}
                  </Text>
                </View>
              </View>

              <View style={styles.slotsContainer}>
                {Array.from({ length: maxSlots }).map((_, slotIdx) => {
                  const slotNumber = slotIdx + 1;
                  const customUri = currentTabImages[slotIdx];
                  const isLoadingThis = loadingSlot === slotIdx;

                  return (
                    <View
                      key={`slot_${activeTab}_${slotIdx}`}
                      style={[
                        styles.slotCard,
                        {
                          backgroundColor: isDark ? themeColors.white : themeColors.gray50,
                          borderColor: customUri ? themeColors.primary + '50' : themeColors.gray200,
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
                              style={[styles.slotBtn, { backgroundColor: themeColors.primary }]}
                              onPress={() => pickImageForSlot(slotIdx)}
                              disabled={isLoadingThis}
                            >
                              <Ionicons name="repeat" size={14} color="#FFF" />
                              <Text style={styles.slotBtnText}>{t('dashboard.replaceImage')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.slotBtn, { backgroundColor: themeColors.error }]}
                              onPress={() => removeSlotImage(slotIdx)}
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
                          onPress={() => pickImageForSlot(slotIdx)}
                          disabled={isLoadingThis}
                        >
                          <View
                            style={[
                              styles.slotBadge,
                              {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.slotBadgeText,
                                {
                                  color: isDark ? themeColors.gray400 : themeColors.gray500,
                                  writingDirection: 'ltr',
                                },
                              ]}
                            >
                              {toEnglishDigits(slotNumber)}
                            </Text>
                          </View>

                          {isLoadingThis ? (
                            <ActivityIndicator size="small" color={themeColors.primary} />
                          ) : (
                            <>
                              <View style={[styles.plusIconWrap, { backgroundColor: themeColors.primary + '18' }]}>
                                <Ionicons name="cloud-upload-outline" size={22} color={themeColors.primary} />
                              </View>
                              <Text
                                style={[
                                  styles.emptySlotText,
                                  { color: themeColors.primary },
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
            </ScrollView>

            {/* Bottom Done Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalOpen(false)}
              style={[styles.doneButton, { backgroundColor: themeColors.primary }]}
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
    </>
  );
}

function getStyles(isTablet: boolean) {
  return StyleSheet.create({
    pressableRoot: {
      overflow: 'hidden',
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      marginBottom: 6,
    },
    gradient: {
      position: 'relative',
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      overflow: 'hidden',
    },
    bgImage: {
      width: '100%',
      height: '100%',
    },
    container: {
      paddingTop: isTablet ? 50 : 70,
      paddingBottom: isTablet ? 36 : 34,
      paddingHorizontal: isTablet ? 28 : 22,
      minHeight: isTablet ? 260 : 230,
      justifyContent: 'space-between',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isTablet ? 18 : 14,
    },
    logoContainer: {
      width: isTablet ? 104 : 88,
      height: isTablet ? 104 : 88,
      borderRadius: isTablet ? 22 : 18,
      overflow: 'hidden',
      borderWidth: 2,
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
      fontSize: 38,
    },
    info: {
      flex: 1,
      gap: isTablet ? 6 : 4,
      justifyContent: 'center',
      marginTop: 4,
    },
    nameGroup: {
      gap: 2,
    },
    contactGroup: {
      gap: isTablet ? 6 : 4,
    },
    businessName: {
      fontSize: isTablet ? 23 : 17,
      lineHeight: isTablet ? 27 : 19,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    typeText: {
      fontSize: isTablet ? 15 : 13,
      lineHeight: isTablet ? 18 : 14,
      color: 'rgba(255,255,255,0.95)',
      fontWeight: '600',
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isTablet ? 6 : 4,
    },
    detailText: {
      fontSize: isTablet ? 14 : 12,
      lineHeight: isTablet ? 16 : 13,
      color: 'rgba(255,255,255,0.85)',
      flex: 1,
    },
    addressText: {
      transform: [{ translateY: 1 }],
    },
    brandRow: {
      marginTop: isTablet ? 20 : 16,
      alignItems: 'flex-end',
    },
    dotsRow: {
      position: 'absolute',
      bottom: 8,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      zIndex: 10,
    },
    dot: {
      height: 5,
      borderRadius: 2.5,
    },
    activeDot: {
      width: 16,
    },
    inactiveDot: {
      width: 5,
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
    },

    /* Modal Styles */
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      padding: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    modalTitleGroup: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Segmented Control */
    segmentContainer: {
      flexDirection: 'row',
      borderRadius: 14,
      backgroundColor: 'rgba(150, 150, 150, 0.12)',
      padding: 4,
      gap: 6,
      marginBottom: 10,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    segmentBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },

    /* Reset Bar */
    resetBar: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginBottom: 10,
    },
    resetBtn: {
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    resetBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
    },

    /* Scroll View inside Modal */
    modalScroll: {
      maxHeight: 460,
    },
    modalScrollContent: {
      paddingBottom: 12,
    },

    /* Section Headers */
    sectionHeader: {
      marginBottom: 8,
      gap: 2,
    },
    sectionTitleRow: {
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontSize: 13.5,
      fontWeight: '700',
    },
    sectionSubtitle: {
      fontSize: 11.5,
      fontWeight: '500',
      marginTop: 2,
    },

    /* Video Card */
    videoCard: {
      height: 98,
      borderRadius: 14,
      borderWidth: 1.5,
      overflow: 'hidden',
      position: 'relative',
    },
    videoBadge: {
      position: 'absolute',
      top: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      zIndex: 2,
    },
    videoBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    emptyVideoBox: {
      borderWidth: 1.2,
      borderStyle: 'dashed',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      justifyContent: 'center',
    },
    emptyVideoInner: {
      alignItems: 'center',
      gap: 12,
    },
    emptySlotTitle: {
      fontSize: 13,
      fontWeight: '700',
    },
    emptySlotSub: {
      fontSize: 11,
      marginTop: 1,
    },

    /* Image Slots */
    slotsContainer: {
      gap: 9,
    },
    slotCard: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
      height: 84,
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
      zIndex: 2,
    },
    slotBadgeText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '700',
    },
    slotActions: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      gap: 8,
      zIndex: 2,
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
      gap: 4,
      borderStyle: 'dashed',
    },
    plusIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptySlotText: {
      fontSize: 12,
      fontWeight: '700',
    },

    /* Done Button */
    doneButton: {
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    doneBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
