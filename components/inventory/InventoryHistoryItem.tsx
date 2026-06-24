import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import type { InventoryHistoryItem as HistoryItem } from '@/types/inventory';

interface Props {
  item: HistoryItem;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}

export function InventoryHistoryItem({ item, onRestore, onPermanentDelete }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useRTL();

  const isSoldOut = item.status === 'sold_out';
  const statusBg   = isSoldOut ? '#FEE2E2' : colors.gray100;
  const statusText = isSoldOut ? '#DC2626'  : colors.gray500;
  const statusLabel = isSoldOut
    ? t('inventoryHistory.statusSoldOut')
    : t('inventoryHistory.statusRemoved');

  return (
    <View style={[styles.card, { backgroundColor: colors.white }]}>
      {/* Top row: thumbnail + name + status badge */}
      <View style={[styles.topRow, { flexDirection, padding: isRTL ? RTL_SPACING.gap : 12, gap: isRTL ? RTL_SPACING.gap : 10 }]}>
        <View style={[styles.thumb, { backgroundColor: colors.gray100 }]}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.thumbImage} resizeMode="cover" fadeDuration={0} />
          ) : (
            <Ionicons name="cube-outline" size={22} color={colors.gray400} />
          )}
        </View>

        <View style={[styles.nameBlock, { gap: isRTL ? RTL_SPACING.gapSm : 5 }]}>
          <Text style={[styles.productName, { color: colors.black, textAlign }]} numberOfLines={1}>
            {item.productName}
          </Text>
          <View style={[styles.metaRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 6 }]}>
            <View style={[styles.chip, { backgroundColor: colors.softBlue }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>{item.category}</Text>
            </View>
            {item.itemId ? (
              <View style={[styles.chip, { backgroundColor: colors.gray100 }]}>
                <IdText style={[styles.chipText, { color: colors.gray500 }]} numberOfLines={1}>
                  {item.itemId}
                </IdText>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusText }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: colors.gray50, flexDirection, paddingVertical: isRTL ? RTL_SPACING.gapSm : 8 }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.black }]}>{item.quantitySold}</Text>
          <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('inventoryHistory.quantitySold')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
        <View style={styles.statItem}>
          <AmountText value={item.purchasePrice} currency="IQD" style={[styles.statValue, { color: colors.black }]} />
          <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('inventoryHistory.buyPrice')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
        <View style={styles.statItem}>
          <AmountText value={item.sellingPrice} currency="IQD" style={[styles.statValue, { color: colors.black }]} />
          <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('inventoryHistory.sellPrice')}</Text>
        </View>
      </View>

      {/* Date footer */}
      <View style={[styles.footer, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 5 }]}>
        <Ionicons name="calendar-outline" size={12} color={colors.gray400} />
        {item.archivedAt ? (
          <DateText value={item.archivedAt} size="small" style={[styles.footerText, { color: colors.gray400, textAlign }]} />
        ) : null}
      </View>

      {/* Action buttons */}
      {(onRestore || onPermanentDelete) && (
        <View style={[styles.actionsRow, { borderTopColor: colors.gray100, flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
          {onRestore && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.restoreBtn, { borderColor: colors.success, flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 5 }]}
              onPress={onRestore}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={14} color={colors.success} />
              <Text style={[styles.actionBtnText, { color: colors.success }]}>
                {t('inventoryHistory.restore')}
              </Text>
            </TouchableOpacity>
          )}
          {onPermanentDelete && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn, { borderColor: colors.error, flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 5 }]}
              onPress={onPermanentDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>
                {t('inventoryHistory.permanentDelete')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.radius.card,
    marginBottom: 10,
    overflow: 'hidden',
    ...Theme.shadow.soft,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Theme.radius.full,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.full,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  footerText: {},
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
  },
  restoreBtn: {},
  deleteBtn:  {},
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
