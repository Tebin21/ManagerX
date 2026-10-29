import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Alert,
  Platform,
  Linking,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { hexToRgba } from '@/lib/colorUtils';
import { useResponsive } from '@/hooks/useResponsive';
import { copyToPermanentStorage, resolveImageUri } from '@/lib/imageStorage';
import { ensureCameraAccess, ensureGalleryAccess } from '@/lib/mediaAccess';
import {
  useSavedProductStore,
  SavedProductPreset,
} from '@/store/savedProductStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect?: (item: SavedProductPreset) => void;
}

export function SavedImagesModal({ visible, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const currentLang = useLanguageStore((s) => s.language);
  const isKurdish = currentLang === 'ku';
  const isArabic = currentLang === 'ar';
  const { isTablet, isTabletLandscape } = useResponsive();

  const { savedPresets, savePreset, deletePreset } = useSavedProductStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Add new photo states
  const [showAddDetailsModal, setShowAddDetailsModal] = useState(false);
  const [pendingNewImageUri, setPendingNewImageUri] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [savingNewPhoto, setSavingNewPhoto] = useState(false);

  // Full-screen / enlarged preview state
  const [previewPreset, setPreviewPreset] = useState<SavedProductPreset | null>(null);

  // Only include items that actually have a valid uploaded image
  const validSavedImages = useMemo(() => {
    return savedPresets.filter(
      (p) => typeof p.imageUri === 'string' && p.imageUri.trim().length > 0
    );
  }, [savedPresets]);

  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return validSavedImages;

    return validSavedImages.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q) ?? false;
      const matchCode = p.itemId?.toLowerCase().includes(q) ?? false;
      return matchName || matchDesc || matchCode;
    });
  }, [validSavedImages, searchQuery]);

  // Pick / Select action
  const handlePick = (item: SavedProductPreset) => {
    if (onSelect) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
      onSelect(item);
      onClose();
    } else {
      // Open preview if browsing in manager mode
      setPreviewPreset(item);
    }
  };

  // Delete action with confirmation
  const handleDelete = (item: SavedProductPreset) => {
    Alert.alert(
      isArabic ? 'حذف العنصر المحفوظ' : isKurdish ? 'سڕینەوەی وێنە' : 'Delete Saved Item',
      isArabic
        ? `هل أنت متأكد من حذف الصورة المحفوظة "${item.name}" من قائمة المحفوظات؟`
        : isKurdish
        ? `دڵنیایت لە سڕینەوەی وێنەی پاشەکەوتکراوی "${item.name}" لە لیستی وێنەکان؟`
        : `Are you sure you want to delete the saved item "${item.name}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deletePreset(item.id);
            if (previewPreset?.id === item.id) {
              setPreviewPreset(null);
            }
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            } catch {}
          },
        },
      ]
    );
  };

  // Handle Add Photo: Prompt Camera or Gallery
  const handlePromptAddPhoto = () => {
    Alert.alert(
      isArabic ? 'إضافة صورة جديدة' : isKurdish ? 'زیادکردنی وێنەی نوێ' : 'Add New Photo',
      isArabic
        ? 'اختر مصدر الصورة للإضافة إلى مكتبة الصور المحفوظة:'
        : isKurdish
        ? 'سەرچاوەی وێنەکە هەڵبژێرە بۆ پاشەکەوتکردن لە لیستی وێنەکان:'
        : 'Choose photo source to add to saved library:',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isArabic ? '📷 الكاميرا' : isKurdish ? '📷 کامێرا' : '📷 Camera',
          onPress: () => {
            setTimeout(() => {
              handleCaptureCamera();
            }, 120);
          },
        },
        {
          text: isArabic ? '🖼️ المعرض' : isKurdish ? '🖼️ گەلەری' : '🖼️ Gallery',
          onPress: () => {
            setTimeout(() => {
              handlePickGallery();
            }, 120);
          },
        },
      ]
    );
  };

  const handleCaptureCamera = async () => {
    try {
      const access = await ensureCameraAccess();
      if (access === 'denied-first-time') return;
      if (access === 'denied-repeat') {
        Alert.alert(
          t('inventory.cameraAccessNeededTitle'),
          t('inventory.cameraAccessNeededMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      let finalUri = result.assets[0].uri;
      try {
        finalUri = await copyToPermanentStorage(result.assets[0].uri, 'saved_presets');
      } catch (storageErr) {
        console.warn('[SavedImagesModal] Could not copy to permanent storage, using raw uri:', storageErr);
      }
      setPendingNewImageUri(finalUri);
      setNewItemName('');
      setNewItemDesc('');
      setShowAddDetailsModal(true);
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  };

  const handlePickGallery = async () => {
    try {
      const access = await ensureGalleryAccess();
      if (access === 'denied-first-time') return;
      if (access === 'denied-repeat') {
        Alert.alert(
          t('inventory.photoAccessNeededTitle'),
          t('inventory.photoAccessNeededMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      let finalUri = result.assets[0].uri;
      try {
        finalUri = await copyToPermanentStorage(result.assets[0].uri, 'saved_presets');
      } catch (storageErr) {
        console.warn('[SavedImagesModal] Could not copy to permanent storage, using raw uri:', storageErr);
      }
      setPendingNewImageUri(finalUri);
      setNewItemName('');
      setNewItemDesc('');
      setShowAddDetailsModal(true);
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  };

  // Confirm save new photo
  const handleConfirmSaveNewPhoto = async () => {
    if (!pendingNewImageUri) return;

    setSavingNewPhoto(true);
    try {
      savePreset({
        name: newItemName.trim() || undefined,
        description: newItemDesc.trim() || null,
        imageUri: pendingNewImageUri,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}

      setShowAddDetailsModal(false);
      setPendingNewImageUri(null);
      setNewItemName('');
      setNewItemDesc('');
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSavingNewPhoto(false);
    }
  };

  const numColumns = isTabletLandscape ? 4 : isTablet ? 3 : 2;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.container,
              {
                backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                borderColor: isDark ? colors.gray200 : '#E2E8F0',
                height: isTablet ? '90%' : '88%',
                maxWidth: isTabletLandscape ? 1100 : isTablet ? 900 : undefined,
                alignSelf: isTablet ? 'center' : undefined,
                width: isTablet ? '94%' : '100%',
                borderRadius: isTablet ? 28 : 24,
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.titleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.headerIconWrap, { backgroundColor: colors.softBlue }]}>
                    <Ionicons name="images" size={isTablet ? 22 : 18} color={colors.primary} />
                  </View>
                  <Text
                    style={[
                      styles.title,
                      isTablet && { fontSize: 20 },
                      { color: colors.black, textAlign },
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                    numberOfLines={1}
                  >
                    {isArabic ? 'الصور المحفوظة' : isKurdish ? 'وێنە پاشەکەوتکراوەکان' : 'Saved Photos & Items'}
                  </Text>
                  <View style={[styles.countBadge, { backgroundColor: hexToRgba(colors.primary, 0.15) }]}>
                    <Text
                      style={[
                        styles.countBadgeText,
                        { color: colors.primary },
                        (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isArabic ? `${validSavedImages.length} صور` : isKurdish ? `${validSavedImages.length} وێنە` : `${validSavedImages.length} photos`}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.subtitle,
                    isTablet && { fontSize: 13.5 },
                    { color: colors.gray400, textAlign },
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                  numberOfLines={1}
                >
                  {isArabic
                    ? (validSavedImages.length > 0
                        ? `إجمالي (${validSavedImages.length}) صور محفوظة — اضغط للاختيار`
                        : 'لا توجد صور محفوظة')
                    : isKurdish
                    ? (validSavedImages.length > 0
                        ? `کۆی گشتی (${validSavedImages.length}) وێنەی پاشەکەوتکراو هەیە — کرتە لە یەکێکیان بکە بۆ دیاریکردن`
                        : 'هیچ وێنەیەکی پاشەکەوتکراو نییە')
                    : (validSavedImages.length > 0
                        ? `Total of (${validSavedImages.length}) saved photos available — tap to select`
                        : 'No saved photos available')}
                </Text>
              </View>

              <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Add New Photo Button */}
                <TouchableOpacity
                  onPress={handlePromptAddPhoto}
                  activeOpacity={0.8}
                  style={[
                    styles.addBtn,
                    {
                      backgroundColor: colors.primary,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="add" size={17} color="#FFFFFF" />
                  <Text
                    style={[
                      styles.addBtnText,
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isArabic ? 'إضافة صورة +' : isKurdish ? 'وێنەی نوێ +' : 'Add Photo +'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={colors.gray500} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search bar */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: isDark ? colors.white : '#F8FAFC',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  height: isTablet ? 50 : 44,
                },
              ]}
            >
              <Ionicons name="search" size={20} color={colors.gray400} />
              <TextInput
                style={[
                  styles.searchInput,
                  isTablet && { fontSize: 15.5 },
                  {
                    color: colors.black,
                    textAlign,
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                  (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
                placeholder={
                  isArabic
                    ? 'ابحث باسم المادة أو الرمز...'
                    : isKurdish
                    ? 'گەڕان بەپێی ناوی ئایتم یان کۆد...'
                    : 'Search by product name or code...'
                }
                placeholderTextColor={colors.gray400}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {Boolean(searchQuery) && Platform.OS !== 'ios' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>

            {/* Gallery Content */}
            <FlatList
              key={`grid_${numColumns}_${isRTL ? 'rtl' : 'ltr'}`}
              data={filteredPresets}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={[
                styles.columnWrapper,
                { gap: isTablet ? 16 : 12, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View
                    style={[
                      styles.emptyIconCircle,
                      { backgroundColor: isDark ? hexToRgba(colors.primary, 0.12) : '#FEF3C7' },
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={46}
                      color={isDark ? colors.primary : '#D97706'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: colors.black },
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isArabic
                      ? 'لم يتم العثور على صور محفوظة'
                      : isKurdish
                      ? 'هیچ وێنەیەکی پاشەکەوتکراو نییە'
                      : 'No Saved Photos Found'}
                  </Text>
                  <Text
                    style={[
                      styles.emptySub,
                      { color: colors.gray400 },
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isArabic
                      ? 'الصور والمواد المسجلة في المشتريات تُحفظ هنا، أو يمكنك إضافة صور جديدة مباشرة.'
                      : isKurdish
                      ? 'هەر کاتێک لە کاتی کڕین وێنە و ناوی ئایتمێک تۆمار بکەیت، لێرە پاشەکەوت دەکرێت بۆ کڕینەکانی داهاتوو، یان ئێستا دەتوانی وێنەی نوێ زیاد بکەیت.'
                      : 'Photos recorded in purchases are saved here, or you can add new photos directly.'}
                  </Text>

                  {/* Empty state Add Button */}
                  <TouchableOpacity
                    onPress={handlePromptAddPhoto}
                    activeOpacity={0.85}
                    style={[
                      styles.emptyAddBtn,
                      {
                        backgroundColor: colors.primary,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                    <Text
                      style={[
                        styles.emptyAddBtnText,
                        (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isArabic ? 'إضافة أول صورة' : isKurdish ? 'زیادکردنی یەکەم وێنە' : 'Add First Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDark ? colors.white : '#FFFFFF',
                      borderColor: isDark ? colors.gray200 : '#E2E8F0',
                    },
                  ]}
                >
                  {/* Image Wrap */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setPreviewPreset(item)}
                    style={styles.imageWrap}
                  >
                    {item.imageUri ? (
                      <Image
                        source={{ uri: resolveImageUri(item.imageUri) || item.imageUri }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.image, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="cube-outline" size={32} color={colors.primary} />
                      </View>
                    )}

                    {/* Delete button (کەمی بکەین) */}
                    <TouchableOpacity
                      style={[styles.cardDeleteBtn, { backgroundColor: '#FEE2E2EE' }]}
                      onPress={() => handleDelete(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash" size={14} color="#EF4444" />
                    </TouchableOpacity>

                    {/* Full Preview expand icon badge */}
                    <View style={styles.expandBadge}>
                      <Ionicons name="expand" size={12} color="#FFFFFF" />
                    </View>

                    {/* Code pill if available */}
                    {Boolean(item.itemId) && (
                      <View style={[styles.codePill, { backgroundColor: '#0F172ACC' }]}>
                        <Ionicons name="barcode-outline" size={11} color="#38BDF8" />
                        <Text style={styles.codePillText} numberOfLines={1}>
                          {item.itemId}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Details */}
                  <View style={styles.cardDetails}>
                    <Text
                      style={[
                        styles.cardName,
                        { color: colors.black, textAlign },
                        (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    {Boolean(item.description) ? (
                      <Text
                        style={[
                          styles.cardDesc,
                          { color: colors.gray400, textAlign },
                          (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
                        ]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : (
                      <Text
                        style={[styles.cardDescEmpty, { color: colors.gray300, textAlign }]}
                        numberOfLines={1}
                      >
                        {isArabic ? 'لا يوجد وصف' : isKurdish ? 'بێ وەسف' : 'No description'}
                      </Text>
                    )}

                    {/* Action Pill: Select if onSelect is present, else View Details */}
                    {onSelect ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handlePick(item)}
                        style={[
                          styles.pickPill,
                          {
                            backgroundColor: hexToRgba(colors.primary, 0.12),
                            borderColor: hexToRgba(colors.primary, 0.35),
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                      >
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                        <Text
                          style={[
                            styles.pickPillText,
                            { color: colors.primary },
                            (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {isArabic ? 'اختيار' : isKurdish ? 'هەڵبژاردن' : 'Select'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setPreviewPreset(item)}
                        style={[
                          styles.pickPill,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                      >
                        <Ionicons name="eye-outline" size={14} color={colors.gray500} />
                        <Text
                          style={[
                            styles.pickPillText,
                            { color: colors.gray600 },
                            (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {isArabic ? 'عرض' : isKurdish ? 'پیشاندان' : 'View'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            />
          </View>

          {/* ── In-Modal Overlay: Add Photo Details (Zero native modal collisions) ── */}
          {showAddDetailsModal && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.detailsModalBackdrop,
                StyleSheet.absoluteFillObject,
                { zIndex: 999 },
              ]}
            >
          <View
            style={[
              styles.detailsModalCard,
              {
                backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                borderColor: isDark ? colors.gray200 : '#E2E8F0',
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.detailsHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={[
                    styles.detailsTitle,
                    { color: colors.black },
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isArabic ? 'حفظ صورة جديدة' : isKurdish ? 'پاشەکەوتکردنی وێنەی نوێ' : 'Save New Photo'}
                </Text>
                <Text
                  style={[
                    styles.detailsSub,
                    { color: colors.gray400 },
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isArabic
                    ? 'الاسم والوصف اختياريان، يمكنك الحفظ مباشرة'
                    : isKurdish
                    ? 'ناو و وەسف ئارەزوومەندانەن، دەتوانی بەتاڵی پاشەکەوتی بکەیت'
                    : 'Name and description are optional'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddDetailsModal(false)}
                style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]}
              >
                <Ionicons name="close" size={20} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            {/* Photo Thumbnail Preview */}
            {Boolean(pendingNewImageUri) && (
              <View style={styles.thumbnailWrap}>
                <Image
                  source={{ uri: pendingNewImageUri! }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Inputs */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <View style={styles.formGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.gray600, textAlign },
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isArabic ? 'اسم المادة أو الصورة (اختياري)' : isKurdish ? 'ناوی ئایتم یان وێنە (ئارەزوومەندانە)' : 'Item Name (Optional)'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? colors.white : '#F8FAFC',
                      borderColor: isDark ? colors.gray200 : '#E2E8F0',
                      color: colors.black,
                      textAlign,
                    },
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                  placeholder={
                    isArabic
                      ? 'مثال: سترة، ساعة، عدسة...'
                      : isKurdish
                      ? 'بۆ نموونە: کۆت، کاتژمێر، عەدەسە...'
                      : 'e.g. Jacket, Watch, Lens...'
                  }
                  placeholderTextColor={colors.gray400}
                  value={newItemName}
                  onChangeText={setNewItemName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.gray600, textAlign },
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isArabic ? 'الوصف أو الملاحظات (اختياري)' : isKurdish ? 'وەسف یان تێبینی (ئارەزوومەندانە)' : 'Description (Optional)'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    {
                      backgroundColor: isDark ? colors.white : '#F8FAFC',
                      borderColor: isDark ? colors.gray200 : '#E2E8F0',
                      color: colors.black,
                      textAlign,
                    },
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                  placeholder={
                    isArabic
                      ? 'وصف قصير، الموديل، اللون، أو ملاحظات...'
                      : isKurdish
                      ? 'وەسفی کورت، مۆدێل، ڕەنگ یان تێبینی...'
                      : 'Short description, model, color...'
                  }
                  placeholderTextColor={colors.gray400}
                  value={newItemDesc}
                  onChangeText={setNewItemDesc}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => setShowAddDetailsModal(false)}
                style={[
                  styles.cancelModalBtn,
                  { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' },
                ]}
              >
                <Text
                  style={[
                    styles.cancelModalBtnText,
                    { color: colors.gray600 },
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmSaveNewPhoto}
                disabled={savingNewPhoto}
                style={[
                  styles.saveModalBtn,
                  { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text
                  style={[
                    styles.saveModalBtnText,
                    (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isArabic ? 'حفظ' : isKurdish ? 'پاشەکەوتکردن' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── In-Modal Overlay: Full Photo Preview (Zero native modal collisions) ── */}
      {previewPreset !== null && (
        <View
          style={[
            styles.previewBackdrop,
            StyleSheet.absoluteFillObject,
            { zIndex: 999 },
          ]}
        >
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                },
              ]}
            >
              {/* Image */}
              <View style={styles.previewImageWrap}>
                {previewPreset.imageUri ? (
                  <Image
                    source={{ uri: resolveImageUri(previewPreset.imageUri) || previewPreset.imageUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.previewImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]}>
                    <Ionicons name="cube-outline" size={60} color={colors.primary} />
                  </View>
                )}
              </View>

              {/* Title & Desc */}
              <View style={styles.previewDetails}>
                <Text
                  style={[
                    styles.previewTitle,
                    { color: colors.black, textAlign },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {previewPreset.name}
                </Text>
                {Boolean(previewPreset.description) && (
                  <Text
                    style={[
                      styles.previewDesc,
                      { color: colors.gray400, textAlign },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {previewPreset.description}
                  </Text>
                )}
              </View>

              {/* Actions */}
              <View style={[styles.previewActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={() => handleDelete(previewPreset)}
                  style={styles.previewDeleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text
                    style={[
                      styles.previewDeleteText,
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isArabic ? 'حذف' : isKurdish ? 'سڕینەوە' : 'Delete'}
                  </Text>
                </TouchableOpacity>

                {onSelect && (
                  <TouchableOpacity
                    onPress={() => {
                      handlePick(previewPreset);
                      setPreviewPreset(null);
                    }}
                    style={[styles.previewSelectBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text
                      style={[
                        styles.previewSelectText,
                        (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isArabic ? 'اختيار' : isKurdish ? 'هەڵبژاردن' : 'Select'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setPreviewPreset(null)}
                  style={[
                    styles.previewCloseBtn,
                    { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' },
                  ]}
                >
                  <Text
                    style={[
                      styles.previewCloseText,
                      { color: colors.gray600 },
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isArabic ? 'إغلاق' : isKurdish ? 'داخستن' : 'Close'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleRow: {
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexShrink: 0,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11.5,
  },
  headerActions: {
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  addBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    maxWidth: '50%',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1.05,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cardDeleteBtn: {
    position: 'absolute',
    top: 6,
    start: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    zIndex: 10,
  },
  expandBadge: {
    position: 'absolute',
    top: 6,
    end: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F172AB2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codePill: {
    position: 'absolute',
    bottom: 6,
    end: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '85%',
  },
  codePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cardDetails: {
    padding: 10,
    gap: 4,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  cardDescEmpty: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  pickPill: {
    marginTop: 4,
    alignSelf: 'stretch',
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pickPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 400,
  },
  emptyAddBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Details Modal styles
  detailsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsModalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  detailsHeader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsSub: {
    fontSize: 12,
    marginTop: 2,
  },
  thumbnailWrap: {
    width: 110,
    height: 110,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D4AF37',
    marginBottom: 16,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  formGroup: {
    width: '100%',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: {
    height: 76,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  modalActions: {
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  cancelModalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveModalBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Preview Modal styles
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  previewImageWrap: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewDetails: {
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  previewActions: {
    gap: 10,
  },
  previewDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  previewDeleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  previewSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  previewSelectText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  previewCloseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
