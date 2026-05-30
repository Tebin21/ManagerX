import React, { useState, useEffect, useCallback } from 'react';
import {
  View, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useReportStore } from '@/store/reportStore';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { EXPENSE_CATEGORIES } from '@/types/reports';
import type { Expense } from '@/types/reports';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const CATEGORY_ICONS: Record<string, string> = {
  Rent:      '🏢',
  Utilities: '💡',
  Internet:  '🌐',
  Transport: '🚗',
  Salaries:  '👤',
  Other:     '📌',
};

// ─── Add Expense Modal ─────────────────────────────────────────────────────────

function AddExpenseModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { amount: number; category: string; note?: string; date?: string }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [amount, setAmount]     = useState('');
  const [category, setCategory] = useState('Other');
  const [note, setNote]         = useState('');
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving]     = useState(false);

  const reset = () => {
    setAmount('');
    setCategory('Other');
    setNote('');
    setDate(new Date().toISOString().slice(0, 10));
  };

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert(t('common.error'), t('reports.amountRequired'));
      return;
    }
    setSaving(true);
    try {
      await onSave({ amount: amt, category, note: note.trim() || undefined, date });
      reset();
      onClose();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('reports.addExpense')}</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.gray600} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Amount */}
          <Text style={styles.fieldLabel}>{t('reports.amount')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500000"
            placeholderTextColor={Colors.gray400}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />

          {/* Category */}
          <Text style={styles.fieldLabel}>{t('reports.category')}</Text>
          <View style={styles.categoryGrid}>
            {EXPENSE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  category === cat && styles.categoryPillActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={styles.categoryIcon}>{CATEGORY_ICONS[cat] ?? '📌'}</Text>
                <Text style={[
                  styles.categoryLabel,
                  category === cat && styles.categoryLabelActive,
                ]}>
                  {t(`reports.expenseCategories.${cat}`, { defaultValue: cat })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note */}
          <Text style={styles.fieldLabel}>{t('reports.note')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Monthly rent"
            placeholderTextColor={Colors.gray400}
            value={note}
            onChangeText={setNote}
          />

          {/* Date */}
          <Text style={styles.fieldLabel}>{t('reports.date')}</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.gray400}
            value={date}
            onChangeText={setDate}
          />

          <PrimaryButton
            label={t('reports.save')}
            onPress={handleSave}
            loading={saving}
          />
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Expense Row ───────────────────────────────────────────────────────────────

function ExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 200 }}
    >
      <TouchableOpacity
        style={styles.expenseRow}
        activeOpacity={0.85}
        onLongPress={onDelete}
        delayLongPress={500}
      >
        <View style={styles.expenseIcon}>
          <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[expense.category] ?? '📌'}</Text>
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseCategory}>{t(`reports.expenseCategories.${expense.category}`, { defaultValue: expense.category })}</Text>
          {expense.note ? (
            <Text style={styles.expenseNote} numberOfLines={1}>{expense.note}</Text>
          ) : null}
          <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
        </View>
        <Text style={styles.expenseAmount}>{fmt(expense.amount)} IQD</Text>
      </TouchableOpacity>
    </MotiView>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const { expenses, plData, reload, loadExpenses } = useReportStore();
  const { colors } = useAppTheme();
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { loadExpenses(); }, []);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown for the summary bars
  const byCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  });
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  async function handleSave(data: { amount: number; category: string; note?: string; date?: string }) {
    const { createExpense } = await import('@/lib/sqlite');
    await createExpense(data);
    await reload();
  }

  function handleDelete(id: number) {
    Alert.alert(t('reports.deleteExpense'), t('reports.deleteExpenseConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { deleteExpense } = await import('@/lib/sqlite');
          await deleteExpense(id);
          await reload();
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('reports.expensesTitle')}
        showBack
        rightAction={<HeaderActionButton icon="add-circle-outline" onPress={() => setAddOpen(true)} />}
      />

      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ExpenseRow expense={item} onDelete={() => handleDelete(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Summary card */}
            {expenses.length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300 }}
              >
                <PremiumCard style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>{t('reports.totalExpenses')}</Text>
                  <Text style={styles.summaryTotal}>{fmt(totalExpenses)} IQD</Text>

                  <View style={styles.divider} />

                  {categoryEntries.map(([cat, total]) => {
                    const pct = totalExpenses > 0 ? (total / totalExpenses) : 0;
                    return (
                      <View key={cat} style={styles.catRow}>
                        <View style={styles.catLabelRow}>
                          <Text style={styles.catIcon}>{CATEGORY_ICONS[cat] ?? '📌'}</Text>
                          <Text style={styles.catName}>{t(`reports.expenseCategories.${cat}`, { defaultValue: cat })}</Text>
                          <Text style={styles.catAmount}>{fmt(total)} IQD</Text>
                        </View>
                        <View style={styles.catTrack}>
                          <View style={[styles.catFill, { width: `${Math.round(pct * 100)}%` as any }]} />
                        </View>
                      </View>
                    );
                  })}
                </PremiumCard>
              </MotiView>
            )}

            <Text style={styles.listTitle}>
              {expenses.length > 0 ? `${t('reports.expenses')} (${expenses.length})` : t('reports.noExpenses')}
            </Text>
            {expenses.length > 0 && (
              <Text style={styles.listHint}>{t('reports.longPressToDelete')}</Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={56} color={Colors.gray300} />
            <Text style={styles.emptyTitle}>{t('reports.noExpenses')}</Text>
            <Text style={styles.emptySub}>{t('reports.tapToAddExpense')}</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setAddOpen(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddExpenseModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },

  listContent: { padding: 16, paddingBottom: 100 },

  summaryCard: { marginBottom: 16 },
  summaryLabel: { fontSize: 12, color: Colors.gray400, marginBottom: 4 },
  summaryTotal: { fontSize: 24, fontWeight: '800', color: Colors.error, marginBottom: 12 },
  divider: { height: 1, backgroundColor: Colors.gray100, marginBottom: 12 },

  catRow: { marginBottom: 10 },
  catLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  catIcon: { fontSize: 14, marginRight: 6 },
  catName: { flex: 1, fontSize: 13, color: Colors.gray600, fontWeight: '600' },
  catAmount: { fontSize: 13, fontWeight: '700', color: Colors.black },
  catTrack: { height: 5, backgroundColor: Colors.gray100, borderRadius: 3, overflow: 'hidden' },
  catFill: { height: '100%', backgroundColor: Colors.error, borderRadius: 3 },

  listTitle: { fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 4 },
  listHint:  { fontSize: 12, color: Colors.gray400, marginBottom: 12 },

  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Theme.radius.md,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FEF3F2',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  expenseInfo: { flex: 1 },
  expenseCategory: { fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 1 },
  expenseNote:     { fontSize: 12, color: Colors.gray400, marginBottom: 1 },
  expenseDate:     { fontSize: 11, color: Colors.gray400 },
  expenseAmount:   { fontSize: 15, fontWeight: '800', color: Colors.error },

  empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray500, marginTop: 8 },
  emptySub:   { fontSize: 13, color: Colors.gray400 },

  fab: {
    position: 'absolute',
    bottom: 24, right: 20,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.black },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray600, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.black,
    marginBottom: 4,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.gray200,
    backgroundColor: '#fff',
  },
  categoryPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryIcon: { fontSize: 14 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray600 },
  categoryLabelActive: { color: '#fff' },
});
