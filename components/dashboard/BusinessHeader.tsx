import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
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

const STORAGE_KEY_BG_IMAGES = '@froshiar_business_header_bg_images';
const STORAGE_KEY_BG_VIDEO = '@froshiar_business_header_bg_video';
const MAX_BG_IMAGES = 3;
const DEFAULT_BANNER_IMAGE = require('@/assets/images/dashboard-hero-default.png');
const FROSHIAR_LOGO = require('@/assets/images/logo-icon.png');

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

function resolveType(type: string): { emoji: string; label: string } | null {
  if (!type?.trim()) return null;
  const match = BUSINESS_TYPES.find((t) => t.id === type);
  if (match) return { emoji: match.emoji, label: match.label };
  return { emoji: '', label: type.trim() };
}

export function BusinessHeader() {
  const { t } = useTranslation();
  const { name, type, phone, address, logoUri, showOnDashboard = true } = useBusinessStore();
  const { colors: themeColors, isDark } = useAppTheme();
  const { isTablet, headerMaxWidth } = useResponsive();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  // Background images state (up to 3 images)
  const [bgImages, setBgImages] = useState<string[]>([]);

  // Background video state (1 video, max 10 seconds)
  const [bgVideo, setBgVideo] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // Dual-slot buffer state for 100% flicker-free & silky-smooth transitions
  const [slotUris, setSlotUris] = useState<[string, string]>(['', '']);
  const activeSlotRef = useRef<0 | 1>(0);
  const activeImgIdxRef = useRef<number>(0);
  const slot0X = useRef(new Animated.Value(0)).current;
  const slot1X = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const cardWidthRef = useRef(Dimensions.get('window').width);
  const isSlidingRef = useRef(false);
  const slideDirectionRef = useRef<'left' | 'right'>('left');

  // Modal & picking state
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  // Load saved header background images and video on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_BG_IMAGES)
      .then((rawImages) => {
        if (rawImages) {
          try {
            const parsed = JSON.parse(rawImages);
            if (Array.isArray(parsed)) {
              setBgImages(parsed.slice(0, MAX_BG_IMAGES));
            }
          } catch {}
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(STORAGE_KEY_BG_VIDEO)
      .then((savedVideo) => {
        if (savedVideo) setBgVideo(savedVideo);
      })
      .catch(() => {});
  }, []);

  // Sync dual-slot buffer whenever bgImages array changes
  useEffect(() => {
    slot0X.stopAnimation();
    slot1X.stopAnimation();
    isSlidingRef.current = false;
    const width = cardWidthRef.current || Dimensions.get('window').width;

    if (bgImages.length === 0) {
      setSlotUris(['', '']);
      activeSlotRef.current = 0;
      activeImgIdxRef.current = 0;
    } else if (bgImages.length === 1) {
      setSlotUris([bgImages[0], '']);
      slot0X.setValue(0);
      slot1X.setValue(width);
      activeSlotRef.current = 0;
      activeImgIdxRef.current = 0;
    } else {
      setSlotUris([bgImages[0], bgImages[1]]);
      slot0X.setValue(0);
      slot1X.setValue(width);
      activeSlotRef.current = 0;
      activeImgIdxRef.current = 0;
    }
  }, [bgImages, slot0X, slot1X]);

  // Persist background images
  const saveBgImages = useCallback(async (newImages: string[]) => {
    slot0X.stopAnimation();
    slot1X.stopAnimation();
    isSlidingRef.current = false;
    setBgImages(newImages);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_BG_IMAGES, JSON.stringify(newImages));
    } catch (e) {
      console.warn('[BusinessHeader] Failed to save bg images:', e);
    }
  }, [slot0X, slot1X]);

  // Persist background video
  const saveBgVideo = useCallback(async (newVideoUri: string | null) => {
    setBgVideo(newVideoUri);
    try {
      if (newVideoUri) {
        await AsyncStorage.setItem(STORAGE_KEY_BG_VIDEO, newVideoUri);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_BG_VIDEO);
      }
    } catch (e) {
      console.warn('[BusinessHeader] Failed to save bg video:', e);
    }
  }, []);

  // Seamless 4.5-second carousel slide with zero unmount and zero flicker
  // Pauses automatically if a background video is active, modal is open, or business card is hidden!
  useEffect(() => {
    if (bgVideo || bgImages.length <= 1 || modalOpen || !showOnDashboard) return;

    const interval = setInterval(() => {
      if (isSlidingRef.current) return;
      const width = cardWidthRef.current || Dimensions.get('window').width;

      const currentSlot = activeSlotRef.current;
      const nextSlot: 0 | 1 = currentSlot === 0 ? 1 : 0;
      const currentIdx = activeImgIdxRef.current;
      const nextIdx = (currentIdx + 1) % bgImages.length;

      const direction = slideDirectionRef.current;
      const incomingStartX = direction === 'left' ? width : -width;
      const currentEndX = direction === 'left' ? -width : width;

      const currentAnim = currentSlot === 0 ? slot0X : slot1X;
      const nextAnim = nextSlot === 0 ? slot0X : slot1X;

      nextAnim.setValue(incomingStartX);
      currentAnim.setValue(0);

      isSlidingRef.current = true;

      Animated.parallel([
        Animated.timing(currentAnim, {
          toValue: currentEndX,
          duration: 850,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(nextAnim, {
          toValue: 0,
          duration: 850,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        isSlidingRef.current = false;
        if (finished) {
          activeSlotRef.current = nextSlot;
          activeImgIdxRef.current = nextIdx;
          slideDirectionRef.current = direction === 'left' ? 'right' : 'left';

          // Preload subsequent image in the hidden off-screen slot
          const futureIdx = (nextIdx + 1) % bgImages.length;
          setSlotUris((prev) => {
            const nextUris: [string, string] = [...prev];
            nextUris[currentSlot] = bgImages[futureIdx];
            return nextUris;
          });
        }
      });
    }, 4500);

    return () => {
      clearInterval(interval);
      slot0X.stopAnimation();
      slot1X.stopAnimation();
      isSlidingRef.current = false;
    };
  }, [bgImages, bgVideo, modalOpen, showOnDashboard, slot0X, slot1X]);

  // Long-press opens background settings modal
  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setModalOpen(true);
  }, []);

  // Pick image for slot
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

      const updated = [...bgImages];
      if (slotIndex < updated.length) {
        updated[slotIndex] = permUri;
      } else {
        updated.push(permUri);
      }

      await saveBgImages(updated.slice(0, MAX_BG_IMAGES));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      console.warn('[BusinessHeader] Failed to pick image:', e);
      Alert.alert(isKurdish ? 'هەڵە' : 'Error', isKurdish ? 'نەتوانرا وێنەکە دابنرێت' : 'Could not set photo');
    } finally {
      setLoadingSlot(null);
    }
  };

  // Remove image from slot
  const removeSlotImage = async (slotIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const updated = bgImages.filter((_, idx) => idx !== slotIndex);
    await saveBgImages(updated);
  };

  // Pick 1 video (strictly <= 10 seconds)
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
        Alert.alert(
          t('dashboard.videoTooLong'),
          t('dashboard.videoTooLongMsg')
        );
        return;
      }

      const tempUri = asset.uri;
      const permUri = await copyToPermanentStorage(tempUri, 'header_videos');

      await saveBgVideo(permUri);
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
    await saveBgVideo(null);
  };

  const resolved = resolveType(type);
  const typeEmoji = resolved?.emoji || '🏢';
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  return (
    <>
      <Pressable
        onLongPress={showOnDashboard ? handleLongPress : undefined}
        delayLongPress={450}
        style={styles.pressableRoot}
      >
        <LinearGradient
          colors={[themeColors.gradientStart, themeColors.gradientMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) cardWidthRef.current = w;
          }}
        >
          {/* Background Display:
              When showOnDashboard is false, display the permanent static Froshiar brand hero banner!
              When showOnDashboard is true, display custom video or dual-slot photos carousel. */}
          {!showOnDashboard ? (
            <View style={styles.bgImageContainer}>
              <Image
                source={DEFAULT_BANNER_IMAGE}
                style={styles.bgImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(15, 23, 42, 0.35)', 'rgba(15, 23, 42, 0.7)']}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          ) : bgVideo ? (
            <View style={styles.bgImageContainer}>
              <HeaderBackgroundVideo uri={bgVideo} />
              <LinearGradient
                colors={['rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.72)']}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          ) : bgImages.length > 0 ? (
            <View style={styles.bgImageContainer}>
              {/* Slot 0 */}
              {slotUris[0] ? (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    { transform: [{ translateX: slot0X }] },
                  ]}
                >
                  <Image
                    source={{ uri: slotUris[0] }}
                    style={styles.bgImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.72)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>
              ) : null}

              {/* Slot 1 */}
              {slotUris[1] ? (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    { transform: [{ translateX: slot1X }] },
                  ]}
                >
                  <Image
                    source={{ uri: slotUris[1] }}
                    style={styles.bgImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.72)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>
              ) : null}
            </View>
          ) : null}

          {/* Surface Content (Maintains full height and spacing) */}
          <View
            style={[
              styles.container,
              isTablet && { maxWidth: headerMaxWidth, alignSelf: 'center', width: '100%' },
            ]}
          >
            {showOnDashboard ? (
              <View style={styles.row}>
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
                    <Text style={styles.businessName} numberOfLines={1}>
                      {name || 'My Business'}
                    </Text>
                    {resolved ? (
                      <Text style={styles.typeText} numberOfLines={1}>
                        {resolved.label}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.contactGroup}>
                    {phone ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={isTablet ? 15 : 12} color="rgba(255,255,255,0.85)" />
                        <Text style={styles.detailText}>{phone}</Text>
                      </View>
                    ) : null}
                    {address ? (
                      <View style={styles.detailRow}>
                        <Feather name="map-pin" size={isTablet ? 15 : 12} color="rgba(255,255,255,0.85)" />
                        <Text style={[styles.detailText, styles.addressText]} numberOfLines={1}>
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

      {/* 4. Background Settings Sheet (Opened via Long-Press) */}
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
              const imgUri = bgImages[slotIdx];
              const isLoadingThis = loadingSlot === slotIdx;

              return (
                <View
                  key={`header_bg_slot_${slotIdx}`}
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
                      {/* Slot index badge matching filled slots */}
                      <View
                        style={[
                          styles.slotBadge,
                          {
                            backgroundColor: themeColors.primary + '18',
                            borderWidth: 1,
                            borderColor: themeColors.primary + '40',
                          },
                        ]}
                      >
                        <Text style={[styles.slotBadgeText, { color: themeColors.primary, writingDirection: 'ltr' }]}>
                          {toEnglishDigits(slotIdx + 1)}
                        </Text>
                      </View>

                      {isLoadingThis ? (
                        <ActivityIndicator size="small" color={themeColors.primary} />
                      ) : (
                        <>
                          <View style={[styles.plusIconWrap, { backgroundColor: themeColors.primary + '18' }]}>
                            <Ionicons name="cloud-upload-outline" size={24} color={themeColors.primary} />
                          </View>
                          <Text
                            style={[
                              styles.emptySlotText,
                              { color: themeColors.primary },
                              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                            ]}
                          >
                            {isKurdish ? `دانانی وێنەی ${toEnglishDigits(slotIdx + 1)}` : `Add Photo ${slotIdx + 1}`}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          {/* Background Video Section (Max 1 Video, Max 10 Seconds) */}
          <View style={[styles.sectionHeadingWrap, { marginTop: 8 }]}>
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[
                  styles.sectionHeading,
                  { color: themeColors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('dashboard.headerBgVideo')}
              </Text>
              {bgVideo ? (
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
          {bgVideo ? (
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
                <HeaderBackgroundVideo uri={bgVideo} />
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
                    {isKurdish ? 'تەنها یەک ڤیدیۆ تا ١٠ چرکە (وێنەکان دەوەستێنێت)' : 'Single video up to 10s (pauses photos)'}
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
    bgImageContainer: {
      ...StyleSheet.absoluteFillObject,
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
    fixedBrandContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isTablet ? 18 : 14,
    },
    fixedBrandLogoWrap: {
      width: isTablet ? 90 : 76,
      height: isTablet ? 90 : 76,
      borderRadius: isTablet ? 22 : 18,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 6,
    },
    fixedBrandLogo: {
      width: '100%',
      height: '100%',
    },
    fixedBrandTextWrap: {
      flex: 1,
      justifyContent: 'center',
      gap: 4,
    },
    fixedBrandTitle: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    fixedBrandTagline: {
      fontSize: isTablet ? 14 : 12,
      lineHeight: isTablet ? 18 : 16,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '500',
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
    brandRowCompact: {
      marginTop: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandText: {
      fontSize: isTablet ? 13 : 11,
      color: 'rgba(255,255,255,0.6)',
      fontWeight: '600',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },

    sheetInnerContent: {
      paddingHorizontal: 4,
      paddingBottom: 16,
    },
    modalSub: {
      fontSize: 12,
      marginTop: 2,
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
