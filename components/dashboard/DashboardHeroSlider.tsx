import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { copyToPermanentStorage } from '@/lib/imageStorage';
import { ensureGalleryAccess } from '@/lib/mediaAccess';
import { toEnglishDigits } from '@/utils/formatters';

const STORAGE_KEY = '@froshiar_dashboard_banner_images';
const MAX_IMAGES = 3;
const SLIDE_INTERVAL = 5000; // 5 seconds as requested

export function DashboardHeroSlider() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const [images, setImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  const flatListRef = useRef<FlatList<string>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 32);

  // Load saved images from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setImages(parsed.slice(0, MAX_IMAGES));
            }
          } catch {
            // Ignore parse error
          }
        }
      })
      .catch(() => {});
  }, []);

  const saveImages = useCallback(async (newImages: string[]) => {
    setImages(newImages);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newImages));
    } catch (e) {
      console.warn('[DashboardHeroSlider] failed to persist images:', e);
    }
  }, []);

  // 5-second automatic sliding animation
  useEffect(() => {
    if (images.length <= 1) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % images.length;
        flatListRef.current?.scrollToIndex({
          index: next,
          animated: true,
        });
        return next;
      });
    }, SLIDE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images.length]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth <= 0) return;
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / containerWidth);
    if (index >= 0 && index < images.length) {
      setActiveIndex(index);
    }
  };

  const handleOpenManager = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setModalOpen(true);
  };

  const pickImageForSlot = async (slotIndex: number) => {
    try {
      setLoadingSlot(slotIndex);
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

      const updated = [...images];
      if (slotIndex < updated.length) {
        updated[slotIndex] = permUri;
      } else {
        updated.push(permUri);
      }

      await saveImages(updated.slice(0, MAX_IMAGES));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      console.warn('[DashboardHeroSlider] image pick error:', err);
    } finally {
      setLoadingSlot(null);
    }
  };

  const removeSlotImage = async (slotIndex: number) => {
    const updated = images.filter((_, i) => i !== slotIndex);
    await saveImages(updated);
    if (activeIndex >= updated.length && updated.length > 0) {
      setActiveIndex(updated.length - 1);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const renderBanner = () => {
    if (images.length === 0) {
      // Default empty placeholder banner with rich gold aesthetic
      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onLongPress={handleOpenManager}
          onPress={handleOpenManager}
          style={[styles.emptyBanner, { backgroundColor: isDark ? colors.gray100 : '#18191C' }]}
        >
          <LinearGradient
            colors={isDark ? ['#1E293B', '#0F172A'] : ['#2A2722', '#141416']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <View style={styles.emptyGlow} />

          <View style={[styles.emptyContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '50' }]}>
              <Ionicons name="images-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.emptyTextGroup}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: '#FFFFFF', textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('dashboard.manageImages')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.gray400, textAlign }]}>
                {t('dashboard.bannerHoldHint')}
              </Text>
            </View>
          </View>

          <View style={[styles.emptyActionPill, { backgroundColor: colors.primary + '25', borderColor: colors.primary + '60' }]}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text
              style={[
                styles.emptyActionText,
                { color: colors.primary },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('dashboard.addImage')}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onLongPress={handleOpenManager}
        style={[styles.sliderContainer, { backgroundColor: isDark ? colors.gray100 : colors.gray200 }]}
      >
        <FlatList
          ref={flatListRef}
          data={images}
          keyExtractor={(_, idx) => `banner_${idx}`}
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
              <Image source={{ uri: item }} style={styles.slideImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.45)']}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
        />


        {/* Pagination Dots */}
        {images.length > 1 && (
          <View style={styles.dotsRow}>
            {images.map((_, i) => (
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
    );
  };

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
      {renderBanner()}

      {/* Image Manager Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
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
                  {t('dashboard.maxImagesHint')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
              >
                <Ionicons name="close" size={20} color={colors.darkBlue} />
              </TouchableOpacity>
            </View>

            {/* Slots Grid */}
            <View style={styles.slotsContainer}>
              {[0, 1, 2].map((slotIdx) => {
                const imgUri = images[slotIdx];
                const isLoadingThis = loadingSlot === slotIdx;

                return (
                  <View
                    key={`slot_${slotIdx}`}
                    style={[
                      styles.slotCard,
                      {
                        backgroundColor: isDark ? colors.white : colors.gray50,
                        borderColor: imgUri ? colors.primary + '50' : colors.gray200,
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
                            style={[styles.slotBtn, { backgroundColor: colors.primary }]}
                            onPress={() => pickImageForSlot(slotIdx)}
                            disabled={isLoadingThis}
                          >
                            <Ionicons name="repeat" size={14} color="#FFF" />
                            <Text style={styles.slotBtnText}>{t('dashboard.replaceImage')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.slotBtn, { backgroundColor: colors.error }]}
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
                              backgroundColor: colors.primary + '18',
                              borderWidth: 1,
                              borderColor: colors.primary + '40',
                            },
                          ]}
                        >
                          <Text style={[styles.slotBadgeText, { color: colors.primary, writingDirection: 'ltr' }]}>
                            {toEnglishDigits(slotIdx + 1)}
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
                              {isKurdish ? `دانانی وێنەی ${toEnglishDigits(slotIdx + 1)}` : `Add Image ${slotIdx + 1}`}
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
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
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
  holdChip: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  holdChipText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '600',
  },
  emptyBanner: {
    height: 135,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  emptyContent: {
    alignItems: 'center',
    gap: 12,
  },
  emptyIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextGroup: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  emptySubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  emptyActionPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: '700',
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
  emptySlotTextRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
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
