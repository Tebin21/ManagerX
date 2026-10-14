import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
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
import { useVideoPlayer, VideoView } from 'expo-video';
import { HeaderTypewriterText } from '@/components/dashboard/HeaderTypewriterText';
import { AppSheet, AppSheetHeader } from '@/components/ui/AppSheet';
import { hexToRgba } from '@/lib/colorUtils';

const STORAGE_KEY_BANNER_IMAGES = '@froshiar_banner_bg_images';
const STORAGE_KEY_BANNER_VIDEO = '@froshiar_banner_bg_video';
const STORAGE_KEY_BUSINESS_IMAGES = '@froshiar_business_bg_images';
const STORAGE_KEY_BUSINESS_VIDEO = '@froshiar_business_bg_video';
const LEGACY_STORAGE_KEY_IMAGES = '@froshiar_business_header_bg_images';
const LEGACY_STORAGE_KEY_VIDEO = '@froshiar_business_header_bg_video';

const MAX_BG_IMAGES = 3;
const DEFAULT_BANNER_IMAGE = require('@/assets/images/dashboard-hero-default.png');

function HeaderBackgroundVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      style={StyleSheet.absoluteFillObject}
      player={player}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
    />
  );
}

function resolveType(type: string, isKurdish = false): { emoji: string; label: string } | null {
  if (!type?.trim()) return null;
  const match = BUSINESS_TYPES.find((t) => t.id === type);
  if (match) return { emoji: match.emoji, label: isKurdish ? (match.labelKu ?? match.label) : match.label };
  return { emoji: '', label: type.trim() };
}

export function BusinessHeader() {
  const { t } = useTranslation();
  const { name, type, phone, address, logoUri, showOnDashboard = false } = useBusinessStore();
  const { colors: themeColors, isDark } = useAppTheme();
  const { isTablet, headerMaxWidth } = useResponsive();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  // Media states for Banner Mode (when showOnDashboard is false)
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [bannerVideo, setBannerVideo] = useState<string | null>(null);

  // Media states for Business Card Mode (when showOnDashboard is true)
  const [businessImages, setBusinessImages] = useState<string[]>([]);
  const [businessVideo, setBusinessVideo] = useState<string | null>(null);

  // Customization Sheet Modal State & Editing Tab
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'banner' | 'business'>(showOnDashboard ? 'business' : 'banner');
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // Cross-fade opacity animated values for up to 3 images (100% glitch-free & silky smooth)
  const fade0 = useRef(new Animated.Value(1)).current;
  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fades = useRef([fade0, fade1, fade2]).current;
  const activeIdxRef = useRef<number>(0);

  // Load saved media for both modes on mount
  useEffect(() => {
    async function loadMedia() {
      try {
        // 1. Load Banner Mode media
        const rawBannerImgs = await AsyncStorage.getItem(STORAGE_KEY_BANNER_IMAGES);
        if (rawBannerImgs) {
          const parsed = JSON.parse(rawBannerImgs);
          if (Array.isArray(parsed)) setBannerImages(parsed.slice(0, MAX_BG_IMAGES));
        }
        const savedBannerVid = await AsyncStorage.getItem(STORAGE_KEY_BANNER_VIDEO);
        if (savedBannerVid) setBannerVideo(savedBannerVid);

        // 2. Load Business Mode media (fallback to legacy keys if present)
        let rawBizImgs = await AsyncStorage.getItem(STORAGE_KEY_BUSINESS_IMAGES);
        if (!rawBizImgs) rawBizImgs = await AsyncStorage.getItem(LEGACY_STORAGE_KEY_IMAGES);
        if (rawBizImgs) {
          const parsed = JSON.parse(rawBizImgs);
          if (Array.isArray(parsed)) setBusinessImages(parsed.slice(0, MAX_BG_IMAGES));
        }

        let savedBizVid = await AsyncStorage.getItem(STORAGE_KEY_BUSINESS_VIDEO);
        if (!savedBizVid) savedBizVid = await AsyncStorage.getItem(LEGACY_STORAGE_KEY_VIDEO);
        if (savedBizVid) setBusinessVideo(savedBizVid);
      } catch (err) {
        console.warn('[BusinessHeader] Failed to load media from storage:', err);
      }
    }
    loadMedia();
  }, []);

  // Determine currently active media based on showOnDashboard
  const activeImages = showOnDashboard ? businessImages : bannerImages;
  const activeVideo = showOnDashboard ? businessVideo : bannerVideo;

  // Sync cross-fade opacity values whenever activeImages list changes
  useEffect(() => {
    fades.forEach((f) => f.stopAnimation());
    fades[0].setValue(1);
    fades[1].setValue(0);
    fades[2].setValue(0);
    activeIdxRef.current = 0;
  }, [activeImages, fades]);

  // Glitch-Free Native Driver Cross-Fade Carousel:
  // Smoothly dissolves between images every 5 seconds.
  // Uses pure hardware-accelerated opacity animation on pre-mounted image layers!
  useEffect(() => {
    if (activeVideo || activeImages.length <= 1 || modalOpen) return;

    const interval = setInterval(() => {
      const count = activeImages.length;
      const current = activeIdxRef.current;
      const next = (current + 1) % count;

      fades[next].setValue(0);

      Animated.parallel([
        Animated.timing(fades[next], {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fades[current], {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          activeIdxRef.current = next;
        }
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      fades.forEach((f) => f.stopAnimation());
    };
  }, [activeImages, activeVideo, modalOpen, fades]);

  // Save Banner media
  const saveBannerImages = useCallback(async (newImages: string[]) => {
    setBannerImages(newImages);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_BANNER_IMAGES, JSON.stringify(newImages));
    } catch (e) {
      console.warn('[BusinessHeader] Failed to save banner images:', e);
    }
  }, []);

  const saveBannerVideo = useCallback(async (uri: string | null) => {
    setBannerVideo(uri);
    try {
      if (uri) await AsyncStorage.setItem(STORAGE_KEY_BANNER_VIDEO, uri);
      else await AsyncStorage.removeItem(STORAGE_KEY_BANNER_VIDEO);
    } catch (e) {
      console.warn('[BusinessHeader] Failed to save banner video:', e);
    }
  }, []);

  // Save Business media
  const saveBusinessImages = useCallback(async (newImages: string[]) => {
    setBusinessImages(newImages);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_BUSINESS_IMAGES, JSON.stringify(newImages));
    } catch (e) {
      console.warn('[BusinessHeader] Failed to save business images:', e);
    }
  }, []);

  const saveBusinessVideo = useCallback(async (uri: string | null) => {
    setBusinessVideo(uri);
    try {
      if (uri) await AsyncStorage.setItem(STORAGE_KEY_BUSINESS_VIDEO, uri);
      else await AsyncStorage.removeItem(STORAGE_KEY_BUSINESS_VIDEO);
    } catch (e) {
      console.warn('[BusinessHeader] Failed to save business video:', e);
    }
  }, []);

  // Open settings sheet
  const handleOpenSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActiveTab(showOnDashboard ? 'business' : 'banner');
    setModalOpen(true);
  }, [showOnDashboard]);

  // Image picking
  const pickImageForSlot = async (slotIndex: number) => {
    try {
      setLoadingSlot(slotIndex);
      const access = await ensureGalleryAccess();
      if (access === 'denied-first-time' || access === 'denied-repeat') {
        Alert.alert(
          isKurdish ? 'ڕێگەپێدانی وێنە پێویستە' : 'Photo Access Needed',
          isKurdish
            ? 'تکایە لە ڕێکخستنەکاندا ڕێگە بدە بۆ هەڵبژاردنی وێنە.'
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
      const permUri = await copyToPermanentStorage(tempUri, 'header_backgrounds');

      if (activeTab === 'banner') {
        const updated = [...bannerImages];
        if (slotIndex < updated.length) updated[slotIndex] = permUri;
        else updated.push(permUri);
        await saveBannerImages(updated.slice(0, MAX_BG_IMAGES));
      } else {
        const updated = [...businessImages];
        if (slotIndex < updated.length) updated[slotIndex] = permUri;
        else updated.push(permUri);
        await saveBusinessImages(updated.slice(0, MAX_BG_IMAGES));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      console.warn('[BusinessHeader] Failed to pick image:', e);
      Alert.alert(isKurdish ? 'هەڵە' : 'Error', isKurdish ? 'نەتوانرا وێنەکە دابنرێت' : 'Could not set photo');
    } finally {
      setLoadingSlot(null);
    }
  };

  const removeSlotImage = async (slotIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (activeTab === 'banner') {
      const updated = bannerImages.filter((_, idx) => idx !== slotIndex);
      await saveBannerImages(updated);
    } else {
      const updated = businessImages.filter((_, idx) => idx !== slotIndex);
      await saveBusinessImages(updated);
    }
  };

  // Video picking (strictly <= 10s)
  const pickVideo = async () => {
    try {
      setLoadingVideo(true);
      const hasPermission = await ensureGalleryAccess();
      if (!hasPermission) {
        Alert.alert(
          isKurdish ? 'مۆڵەت پێویستە' : 'Permission Required',
          isKurdish
            ? 'تکایە لە ڕێکخستنەکاندا ڕێگە بدە بۆ هەڵبژاردنی ڤیدیۆ.'
            : 'Please allow gallery access in device settings.'
        );
        return;
      }

      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        videoMaxDuration: 10,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const rawDuration = asset.duration ?? 0;
      const durationSec = rawDuration > 100 ? rawDuration / 1000 : rawDuration;

      if (durationSec > 10.5) {
        Alert.alert(t('dashboard.videoTooLong'), t('dashboard.videoTooLongMsg'));
        return;
      }

      const tempUri = asset.uri;
      const permUri = await copyToPermanentStorage(tempUri, 'header_videos');

      if (activeTab === 'banner') {
        await saveBannerVideo(permUri);
      } else {
        await saveBusinessVideo(permUri);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      console.warn('[BusinessHeader] Failed to pick video:', e);
      Alert.alert(isKurdish ? 'هەڵە' : 'Error', isKurdish ? 'نەتوانرا ڤیدیۆکە دابنرێت' : 'Could not set video');
    } finally {
      setLoadingVideo(false);
    }
  };

  const removeVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (activeTab === 'banner') {
      await saveBannerVideo(null);
    } else {
      await saveBusinessVideo(null);
    }
  };

  // Reset to default
  const handleResetCurrentMode = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (activeTab === 'banner') {
      await saveBannerImages([]);
      await saveBannerVideo(null);
    } else {
      await saveBusinessImages([]);
      await saveBusinessVideo(null);
    }
  };

  const resolved = resolveType(type, isKurdish);
  const typeEmoji = resolved?.emoji || '🏢';
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  // Tab-specific current media in sheet
  const curTabImages = activeTab === 'banner' ? bannerImages : businessImages;
  const curTabVideo = activeTab === 'banner' ? bannerVideo : businessVideo;
  const hasCustomMedia = curTabImages.length > 0 || !!curTabVideo;

  return (
    <>
      <Pressable
        onLongPress={handleOpenSettings}
        delayLongPress={400}
        style={styles.pressableRoot}
      >
        <LinearGradient
          colors={[themeColors.gradientStart, themeColors.gradientMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Background Media Engine:
              1. Video: If a video is set, loops seamlessly.
              2. Custom Images: If images are set, cross-fades gently without any glitch.
              3. Default Fallback:
                 - When showOnDashboard is false (Banner mode): displays the default Froshiar hero image.
                 - When showOnDashboard is true (Business mode): displays simple clean gradient (سادە). */}
          {activeVideo ? (
            <View style={styles.bgMediaContainer}>
              <HeaderBackgroundVideo uri={activeVideo} />
              <LinearGradient
                colors={['rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.72)']}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          ) : activeImages.length > 0 ? (
            <View style={styles.bgMediaContainer}>
              {activeImages.map((imgUri, idx) => (
                <Animated.View
                  key={`bg_img_layer_${idx}_${imgUri}`}
                  style={[
                    StyleSheet.absoluteFillObject,
                    { opacity: activeImages.length === 1 ? 1 : fades[idx] },
                  ]}
                >
                  <Image
                    source={{ uri: imgUri }}
                    style={styles.bgImage}
                    resizeMode="cover"
                    fadeDuration={0}
                  />
                  <LinearGradient
                    colors={['rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.72)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>
              ))}
            </View>
          ) : !showOnDashboard ? (
            // Banner Mode Default: Froshiar Hero Image
            <View style={styles.bgMediaContainer}>
              <Image
                source={DEFAULT_BANNER_IMAGE}
                style={styles.bgImage}
                resizeMode="cover"
                fadeDuration={0}
              />
              <LinearGradient
                colors={['rgba(15, 23, 42, 0.35)', 'rgba(15, 23, 42, 0.7)']}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          ) : (
            // Business Mode Default: Simple clean gradient (سادە)
            null
          )}

          {/* Quick Customize Button (Top corner respecting RTL) */}
          <TouchableOpacity
            onPress={handleOpenSettings}
            style={[
              styles.customizeBtn,
              { [isRTL ? 'left' : 'right']: isTablet ? 24 : 18 },
            ]}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={t('dashboard.editBackground')}
          >
            <Ionicons name="image-outline" size={16} color="rgba(255, 255, 255, 0.92)" />
          </TouchableOpacity>

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
          </View>
        </LinearGradient>
      </Pressable>

      {/* Background Settings Modal Sheet */}
      <AppSheet
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <AppSheetHeader
          title={t('dashboard.headerBackgroundSettings')}
          onClose={() => setModalOpen(false)}
        />

        <View style={styles.sheetInnerContent}>
          <Text style={[styles.modalSub, { color: themeColors.gray400, textAlign, marginBottom: 14 }]}>
            {t('dashboard.headerBackgroundSub')}
          </Text>

          {/* Mode Switcher Segmented Control: Froshiar Banner vs Business Card */}
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

          {/* Current Tab Status & Mode Description */}
          <View
            style={[
              styles.tabInfoCard,
              {
                backgroundColor: isDark ? themeColors.white : themeColors.gray50,
                borderColor: isDark ? themeColors.gray100 : themeColors.gray200,
              },
            ]}
          >
            <View style={[styles.statusRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: hasCustomMedia
                      ? hexToRgba(themeColors.primary, 0.16)
                      : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : '#F1F5F9',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: hasCustomMedia ? themeColors.primary : themeColors.gray400 },
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: hasCustomMedia ? themeColors.primary : themeColors.gray400 },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {activeTab === 'banner'
                    ? hasCustomMedia
                      ? t('dashboard.customMediaActive')
                      : t('dashboard.defaultBannerActive')
                    : hasCustomMedia
                    ? t('dashboard.customMediaActive')
                    : t('dashboard.simpleModeActive')}
                </Text>
              </View>

              {hasCustomMedia && (
                <TouchableOpacity
                  onPress={handleResetCurrentMode}
                  style={[styles.resetBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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
              )}
            </View>

            <Text style={[styles.tabDescText, { color: themeColors.gray400, textAlign }]}>
              {activeTab === 'banner'
                ? t('dashboard.froshiarBannerDesc')
                : t('dashboard.businessCardDesc')}
            </Text>
          </View>

          {/* Background Photos Section (Up to 3 Photos) */}
          <View style={styles.sectionHeadingWrap}>
            <Text
              style={[
                styles.sectionHeading,
                { color: themeColors.darkBlue, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('dashboard.headerBgImages')}
            </Text>
            <Text style={[styles.sectionHeadingSub, { color: themeColors.gray400, textAlign }]}>
              {t('dashboard.headerBgImagesHint')}
            </Text>
          </View>

          {/* 3 Image Slots */}
          <View style={styles.slotsContainer}>
            {[0, 1, 2].map((slotIdx) => {
              const imgUri = curTabImages[slotIdx];
              const isLoadingThis = loadingSlot === slotIdx;

              return (
                <View
                  key={`bg_slot_${activeTab}_${slotIdx}`}
                  style={[
                    styles.slotCard,
                    {
                      backgroundColor: isDark ? themeColors.white : themeColors.gray50,
                      borderColor: imgUri ? themeColors.primary + '50' : themeColors.gray200,
                    },
                  ]}
                >
                  {imgUri ? (
                    <View style={styles.slotImageWrap}>
                      <Image source={{ uri: imgUri }} style={styles.slotPreview} />
                      <View style={styles.slotBadge}>
                        <Text style={[styles.slotBadgeText, { writingDirection: 'ltr' }]}>
                          {toEnglishDigits(slotIdx + 1)}
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
                          {toEnglishDigits(slotIdx + 1)}
                        </Text>
                      </View>

                      {isLoadingThis ? (
                        <ActivityIndicator size="small" color={themeColors.primary} />
                      ) : (
                        <>
                          <View style={[styles.plusIconWrap, { backgroundColor: themeColors.primary + '18' }]}>
                            <Feather name="plus" size={16} color={themeColors.primary} />
                          </View>
                          <Text
                            style={[
                              styles.emptySlotText,
                              { color: themeColors.primary },
                              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                            ]}
                          >
                            {t('dashboard.addImage')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          {/* Background Video Section (1 Video <= 10s) */}
          <View style={[styles.sectionHeadingWrap, { marginTop: 8 }]}>
            <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text
                style={[
                  styles.sectionHeading,
                  { color: themeColors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('dashboard.headerBgVideo')}
              </Text>
              {curTabVideo ? (
                <View style={[styles.activePill, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
                  <Text style={[styles.activePillText, { color: '#16A34A' }]}>
                    {t('dashboard.videoActive')}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.sectionHeadingSub, { color: themeColors.gray400, textAlign }]}>
              {t('dashboard.headerBgVideoHint')}
            </Text>
          </View>

          {/* Video Slot Card */}
          {curTabVideo ? (
            <View
              style={[
                styles.videoCard,
                {
                  backgroundColor: isDark ? themeColors.white : themeColors.gray50,
                  borderColor: isDark ? themeColors.gray100 : themeColors.gray200,
                },
              ]}
            >
              <View style={styles.videoPreviewWrap}>
                <HeaderBackgroundVideo uri={curTabVideo} />
                <View style={styles.videoBadge}>
                  <Feather name="video" size={12} color="#FFFFFF" />
                  <Text style={styles.videoBadgeText}>10s</Text>
                </View>

                <View style={[styles.videoActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    onPress={pickVideo}
                    disabled={loadingVideo}
                    style={[styles.slotBtn, { backgroundColor: themeColors.primary }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="repeat" size={14} color="#FFF" />
                    <Text style={styles.slotBtnText}>{t('dashboard.changeVideo')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={removeVideo}
                    disabled={loadingVideo}
                    style={[styles.slotBtn, { backgroundColor: themeColors.error }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={14} color="#FFF" />
                    <Text style={styles.slotBtnText}>{t('dashboard.deleteVideo')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickVideo}
              disabled={loadingVideo}
              style={[
                styles.videoEmptyCard,
                {
                  backgroundColor: isDark ? themeColors.white : themeColors.gray50,
                  borderColor: isDark ? themeColors.primary + '50' : themeColors.primary + '40',
                },
              ]}
              activeOpacity={0.75}
            >
              {loadingVideo ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <>
                  <View style={[styles.plusIconWrap, { backgroundColor: themeColors.primary + '18' }]}>
                    <Ionicons name="videocam-outline" size={24} color={themeColors.primary} />
                  </View>
                  <Text
                    style={[
                      styles.emptySlotText,
                      { color: themeColors.primary },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {t('dashboard.addVideo')}
                  </Text>
                  <Text style={[styles.videoEmptySub, { color: themeColors.gray400 }]}>
                    {isKurdish ? 'تەنها یەک ڤیدیۆ تا ١٠ چرکە' : 'Single video up to 10s'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Done Button */}
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
      </AppSheet>
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
    bgMediaContainer: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    bgImage: {
      width: '100%',
      height: '100%',
    },
    customizeBtn: {
      position: 'absolute',
      top: isTablet ? 48 : 64,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
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

    sheetInnerContent: {
      paddingHorizontal: 4,
      paddingBottom: 16,
    },
    modalSub: {
      fontSize: 12,
      marginTop: 2,
    },

    /* Segmented Control */
    segmentContainer: {
      flexDirection: 'row',
      borderRadius: 14,
      backgroundColor: 'rgba(150, 150, 150, 0.12)',
      padding: 4,
      gap: 6,
      marginBottom: 12,
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

    /* Info card under segment */
    tabInfoCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      marginBottom: 16,
      gap: 8,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    statusBadgeText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    resetBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    tabDescText: {
      fontSize: 11.5,
      lineHeight: 16,
    },

    /* Heading in modal */
    sectionHeadingWrap: {
      marginBottom: 10,
    },
    sectionHeading: {
      fontSize: 13.5,
      fontWeight: '700',
    },
    sectionHeadingSub: {
      fontSize: 11,
      marginTop: 2,
    },

    /* Slots */
    slotsContainer: {
      gap: 10,
      marginBottom: 16,
    },
    slotCard: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
      height: 86,
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
      width: 22,
      height: 22,
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
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    activePill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    activePillText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    videoCard: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
      height: 120,
      marginBottom: 16,
    },
    videoPreviewWrap: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    videoBadge: {
      position: 'absolute',
      top: 8,
      start: 8,
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      zIndex: 2,
    },
    videoBadgeText: {
      color: '#FFF',
      fontSize: 10.5,
      fontWeight: '700',
    },
    videoActions: {
      position: 'absolute',
      bottom: 8,
      end: 8,
      gap: 8,
      zIndex: 2,
    },
    videoEmptyCard: {
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginBottom: 16,
    },
    videoEmptySub: {
      fontSize: 10.5,
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
}
