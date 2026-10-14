import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import {
  useSavedProductStore,
  SavedProductPreset,
} from '@/store/savedProductStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: SavedProductPreset) => void;
}

export function SavedImagesModal({ visible, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const { savedPresets, deletePreset } = useSavedProductStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return savedPresets;

    return savedPresets.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q) ?? false;
      const matchCode = p.itemId?.toLowerCase().includes(q) ?? false;
      return matchName || matchDesc || matchCode;
    });
  }, [savedPresets, searchQuery]);

  const handlePick = (item: SavedProductPreset) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    onSelect(item);
    onClose();
  };

  const handleDelete = (item: SavedProductPreset) => {
    Alert.alert(
      isKurdish ? 'سڕینەوەی وێنە' : 'Delete Saved Item',
      isKurdish
        ? `دڵنیایت لە سڕینەوەی وێنەی پاشەکەوتکراوی "${item.name}"؟`
        : `Are you sure you want to delete the saved item "${item.name}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deletePreset(item.id);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor: isDark ? colors.gray200 : '#E2E8F0',
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.titleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.headerIconWrap, { backgroundColor: colors.softBlue }]}>
                  <Ionicons name="images" size={18} color={colors.primary} />
                </View>
                <Text
                  style={[
                    styles.title,
                    { color: colors.black, textAlign },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKurdish ? 'وێنە پاشەکەوتکراوەکان' : 'Saved Photos & Items'}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: hexToRgba(colors.primary, 0.15) }]}>
                  <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                    {savedPresets.length}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: colors.gray400, textAlign }]}>
                {isKurdish
                  ? 'هەڵبژاردنی وێنە و پڕکردنەوەی خۆکارانەی ناو و وەسف'
                  : 'Select photo to auto-fill product name & description'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? colors.white : '#F8FAFC',
                borderColor: isDark ? colors.gray200 : '#E2E8F0',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.gray400} />
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: colors.black,
                  textAlign,
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
              placeholder={
                isKurdish
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
            data={filteredPresets}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
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
                    size={42}
                    color={isDark ? colors.primary : '#D97706'}
                  />
                </View>
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.black },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKurdish
                    ? 'هیچ وێنەیەکی پاشەکەوتکراو نییە'
                    : 'No Saved Photos Found'}
                </Text>
                <Text
                  style={[
                    styles.emptySub,
                    { color: colors.gray400 },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKurdish
                    ? 'هەر کاتێک لە کاتی کڕین وێنە و ناوی ئایتمێک تۆمار بکەیت، لێرە پاشەکەوت دەکرێت بۆ کڕینەکانی داهاتوو بۆ ئەوەی دووبارە وێنە نەگریتەوە.'
                    : 'Whenever you register an item with a photo, it will be automatically saved here for future purchases so you never have to retake it.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? colors.white : '#FFFFFF',
                    borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => handlePick(item)}
              >
                {/* Image */}
                <View style={styles.imageWrap}>
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  {/* Delete button */}
                  <TouchableOpacity
                    style={[styles.cardDeleteBtn, { backgroundColor: '#FEE2E2E6' }]}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash" size={13} color="#EF4444" />
                  </TouchableOpacity>

                  {/* Code pill if available */}
                  {Boolean(item.itemId) && (
                    <View style={[styles.codePill, { backgroundColor: '#0F172ACC' }]}>
                      <Ionicons name="barcode-outline" size={11} color="#38BDF8" />
                      <Text style={styles.codePillText} numberOfLines={1}>
                        {item.itemId}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Details */}
                <View style={styles.cardDetails}>
                  <Text
                    style={[
                      styles.cardName,
                      { color: colors.black, textAlign },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
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
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
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
                      {isKurdish ? 'بێ وەسف' : 'No description'}
                    </Text>
                  )}

                  {/* Pick Action Pill */}
                  <View
                    style={[
                      styles.pickPill,
                      {
                        backgroundColor: hexToRgba(colors.primary, 0.12),
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                    <Text
                      style={[
                        styles.pickPillText,
                        { color: colors.primary },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isKurdish ? 'هەڵبژاردن' : 'Select'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
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
  },
  titleContainer: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    height: 44,
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
    justifyContent: 'space-between',
    gap: 12,
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
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1.1,
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
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codePill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
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
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pickPillText: {
    fontSize: 11,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },
});
