import React from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import type { CartItem } from '@/types/sales';

interface Props {
  item: CartItem;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice: (price: number) => void;
  onUpdateDiscount: (discount: number) => void;
  onRemove: () => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function CartItemRow({ item, onUpdateQty, onUpdatePrice, onUpdateDiscount, onRemove }: Props) {
  return (
    <View style={[styles.card, item.hasLossWarning && styles.cardWarning]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{item.product.name}</Text>
          {item.product.itemId ? (
            <View style={styles.idBadge}>
              <Text style={styles.idText}>#{item.product.itemId}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {item.hasLossWarning && (
        <Text style={styles.warningText}>Below cost price</Text>
      )}

      <View style={styles.controls}>
        {/* Quantity stepper */}
        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() => onUpdateQty(item.quantity - 1)}
            disabled={item.quantity <= 1 || item.product.idMode === 'unique'}
            style={[styles.stepBtn, (item.quantity <= 1 || item.product.idMode === 'unique') && styles.stepBtnDisabled]}
          >
            <Ionicons name="remove" size={16} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.qty}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => onUpdateQty(item.quantity + 1)}
            disabled={item.product.idMode === 'unique'}
            style={[styles.stepBtn, item.product.idMode === 'unique' && styles.stepBtnDisabled]}
          >
            <Ionicons name="add" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Price */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Price</Text>
          <TextInput
            style={styles.fieldInput}
            value={String(item.sellingPrice)}
            onChangeText={(t) => onUpdatePrice(parseFloat(t) || 0)}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>

        {/* Discount */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Disc</Text>
          <TextInput
            style={styles.fieldInput}
            value={String(item.discount)}
            onChangeText={(t) => onUpdateDiscount(parseFloat(t) || 0)}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
      </View>

      <View style={styles.lineTotalRow}>
        <Text style={styles.lineTotalLabel}>Line Total</Text>
        <Text style={styles.lineTotal}>{fmt(item.lineTotal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.card,
    padding: 14,
    marginBottom: 10,
    ...Theme.shadow.card,
  },
  cardWarning: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '600', color: Colors.black, flexShrink: 1 },
  idBadge: {
    backgroundColor: Colors.softBlue,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  idText: { fontSize: 10, color: Colors.primary, fontWeight: '500' },
  deleteBtn: { padding: 4, marginLeft: 8 },
  warningText: { fontSize: 11, color: Colors.warning, fontWeight: '500', marginBottom: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  qty: { minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: '700', color: Colors.black },
  field: { flex: 1 },
  fieldLabel: { fontSize: 11, color: Colors.gray400, marginBottom: 3, fontWeight: '500' },
  fieldInput: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  lineTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineTotalLabel: { fontSize: 12, color: Colors.gray400 },
  lineTotal: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});
