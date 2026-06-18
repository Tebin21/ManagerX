import React, { useState, useCallback, useMemo } from 'react';
import {
  View, FlatList, TouchableOpacity, Modal, TextInput,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useReportStore } from '@/store/reportStore';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
// EXPENSE_CATEGORIES no longer used in form — examples replace the picker
import type { Expense } from '@/types/reports';
import { fmtIQD, toDateOnly, formatDate, formatTime } from '@/utils/formatters';
import { roundToNearest250 } from '@/utils/rounding';
import { DateTimePicker } from '@/components/shared/DateTimePicker';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  Transport: '🚗',
  Food:      '🍽️',
  Utilities: '💡',
};

const CATEGORY_COLORS: Record<string, string> = {
  Transport: '#DBEAFE',
  Food:      '#DCFCE7',
  Utilities: '#FEF9C3',
  Other:     '#F1F5F9',
};

// Quick-fill example reasons (Kurdish). Tapping one pre-fills the reason field.
const EXPENSE_EXAMPLES: { text: string; category: string }[] = [
  { text: 'کرێی کارەبا',    category: 'Utilities' },
  { text: 'خواردن',          category: 'Food'      },
  { text: 'مووچەی کارمەند', category: 'Other'     },
  { text: 'کرێی دووکان',    category: 'Other'     },
  { text: 'مەسروف',         category: 'Other'     },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────


// ─── Expense Date Filter ──────────────────────────────────────────────────────

type ExpenseFilterKey = 'today' | 'week' | 'month' | 'year' | 'custom';

function applyExpenseFilter(
  list: Expense[],
  filter: ExpenseFilterKey,
  range: { from: string; to: string } | null,
): Expense[] {
  const now = new Date();
  const today = toDateOnly(now);
  switch (filter) {
    case 'today':
      return list.filter((e) => e.date === today);
    case 'week': {
      const d = new Date(now);
      const dow = d.getDay();
      d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      const weekStart = toDateOnly(d);
      return list.filter((e) => e.date >= weekStart && e.date <= today);
    }
    case 'month': {
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return list.filter((e) => e.date.startsWith(prefix));
    }
    case 'year':
      return list.filter((e) => e.date.startsWith(String(now.getFullYear())));
    case 'custom':
      if (!range) return list;
      return list.filter((e) => e.date >= range.from && e.date <= range.to);
    default:
      return list;
  }
}

// ─── Expense Filter Bar ───────────────────────────────────────────────────────

function ExpenseFilterBar({
  filter,
  appliedRange,
  onChange,
}: {
  filter: ExpenseFilterKey;
  appliedRange: { from: string; to: string } | null;
  onChange: (key: ExpenseFilterKey, range?: { from: string; to: string }) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL } = useRTL();

  const [customOpen, setCustomOpen] = useState(false);
  const [fromVal, setFromVal]       = useState('');
  const [toVal, setToVal]           = useState('');

  const keys: ExpenseFilterKey[] = ['today', 'week', 'month', 'year', 'custom'];
  const labels: Record<ExpenseFilterKey, string> = {
    today:  t('common.today'),
    week:   t('common.thisWeek'),
    month:  t('common.thisMonth'),
    year:   t('reports.year'),
    custom: t('reports.custom'),
  };

  return (
    <>
      <View style={[efbStyles.wrapper, { backgroundColor: colors.white, borderBottomColor: colors.gray100 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[efbStyles.row, isRTL && { flexDirection: 'row-reverse' }]}
        >
          {keys.map((key) => {
            const active = filter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  efbStyles.pill,
                  { backgroundColor: active ? Colors.error : colors.gray100, borderColor: active ? Colors.error : colors.gray200 },
                ]}
                onPress={() => {
                  if (key === 'custom') { setFromVal(''); setToVal(''); setCustomOpen(true); }
                  else { onChange(key); }
                }}
              >
                <Text style={[efbStyles.pillText, { color: active ? '#fff' : colors.gray600 }]}>
                  {labels[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {filter === 'custom' && appliedRange && (
          <Text style={[efbStyles.rangeLabel, { color: colors.gray500 }]}>
            {formatDate(appliedRange.from)} {'→'} {formatDate(appliedRange.to)}
          </Text>
        )}
      </View>

      <Modal visible={customOpen} animationType="fade" transparent>
        <View style={efbStyles.overlay}>
          <View style={[efbStyles.modal, { backgroundColor: colors.white }]}>
            <Text style={[efbStyles.modalTitle, { color: colors.black }]}>
              {t('reports.customRange')}
            </Text>
            <Text style={[efbStyles.dateLabel, { color: colors.gray600 }]}>
              {t('reports.fromDate')} (YYYY-MM-DD)
            </Text>
            <TextInput
              style={[efbStyles.dateInput, { borderColor: colors.gray200, color: colors.black }]}
              placeholder="2026-01-01"
              placeholderTextColor={Colors.gray400}
              value={fromVal}
              onChangeText={setFromVal}
            />
            <Text style={[efbStyles.dateLabel, { color: colors.gray600 }]}>
              {t('reports.toDate')} (YYYY-MM-DD)
            </Text>
            <TextInput
              style={[efbStyles.dateInput, { borderColor: colors.gray200, color: colors.black }]}
              placeholder="2026-12-31"
              placeholderTextColor={Colors.gray400}
              value={toVal}
              onChangeText={setToVal}
            />
            <View style={efbStyles.modalActions}>
              <TouchableOpacity
                style={[efbStyles.cancelBtn, { borderColor: colors.gray200 }]}
                onPress={() => setCustomOpen(false)}
              >
                <Text style={[efbStyles.cancelText, { color: colors.gray500 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[efbStyles.applyBtn, { backgroundColor: Colors.error }]}
                onPress={() => {
                  if (!fromVal || !toVal) {
                    Alert.alert(t('common.required'), t('purchases.validationDate'));
                    return;
                  }
                  if (fromVal > toVal) {
                    Alert.alert(t('common.error'), t('reports.invalidDateRange'));
                    return;
                  }
                  onChange('custom', { from: fromVal, to: toVal });
                  setCustomOpen(false);
                }}
              >
                <Text style={efbStyles.applyText}>{t('reports.apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const efbStyles = StyleSheet.create({
  wrapper:    { borderBottomWidth: 1 },
  row:        { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  pill:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  pillText:   { fontSize: 13, fontWeight: '600' },
  rangeLabel: { fontSize: 11, fontWeight: '500', paddingHorizontal: 16, paddingBottom: 8 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modal:      { borderRadius: 20, padding: 24, width: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 16 },
  dateLabel:  { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  dateInput:  { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  applyBtn:   { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  applyText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Expense Form Modal (Add + Edit) ──────────────────────────────────────────

function ExpenseFormModal({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial?: Expense;
  onClose: () => void;
  onSave: (data: { amount: number; category: string; reason: string; note?: string; date?: string }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();

  const [amount, setAmount]           = useState(() => initial ? String(initial.amount) : '');
  const [rounded, setRounded]         = useState<number | null>(() => initial ? initial.amount : null);
  // reason: primary required description (maps to expenses.reason column)
  // For old records that only have .note, fall back to that value
  const [reason, setReason]           = useState(() => initial?.reason ?? initial?.note ?? '');
  const [note, setNote]               = useState(() => initial?.reason != null ? (initial.note ?? '') : '');
  const [selectedExample, setExample] = useState<number | null>(() => {
    const text = initial?.reason ?? initial?.note ?? '';
    if (!text) return null;
    const idx = EXPENSE_EXAMPLES.findIndex(e => e.text === text);
    return idx >= 0 ? idx : null;
  });
  const [expenseDate, setDate]        = useState(() => initial ? new Date(initial.date) : new Date());
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<{ amount?: string; reason?: string }>({});

  // Sync state when the modal is opened for a different expense
  React.useEffect(() => {
    if (visible) {
      setAmount(initial ? String(initial.amount) : '');
      setRounded(initial ? initial.amount : null);
      const reasonText = initial?.reason ?? initial?.note ?? '';
      setReason(reasonText);
      setNote(initial?.reason != null ? (initial.note ?? '') : '');
      const exIdx = reasonText ? EXPENSE_EXAMPLES.findIndex(e => e.text === reasonText) : -1;
      setExample(exIdx >= 0 ? exIdx : null);
      setDate(initial ? new Date(initial.date) : new Date());
      setErrors({});
    }
  }, [visible, initial?.id]);

  function onAmountBlur() {
    const n = parseFloat(amount);
    if (!isNaN(n) && n > 0) {
      const r = roundToNearest250(n);
      setRounded(r);
      setAmount(String(r));
    } else {
      setRounded(null);
    }
  }

  function validate(): boolean {
    const errs: { amount?: string; reason?: string } = {};
    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0) errs.amount = t('reports.amountRequired');
    if (!reason.trim()) errs.reason = t('reports.reasonRequired');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const amt = roundToNearest250(parseFloat(amount));
    const derivedCategory = selectedExample !== null
      ? EXPENSE_EXAMPLES[selectedExample].category
      : 'Other';
    setSaving(true);
    try {
      await onSave({
        amount: amt,
        category: derivedCategory,
        reason: reason.trim(),
        note: note.trim() || undefined,
        date: toDateOnly(expenseDate),
      });
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initial;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.formRoot, { backgroundColor: colors.gray50 }]}>
        {/* Gradient header */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid] as [string, string]}
          style={styles.formHeader}
        >
          <View style={[styles.formHeaderInner, { flexDirection }]}>
            <TouchableOpacity style={styles.formHeaderBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.formHeaderTitle}>
              {isEdit ? t('reports.editExpense') : t('reports.addExpense')}
            </Text>
            <View style={{ width: 38 }} />
          </View>
        </LinearGradient>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.formBody}
            contentContainerStyle={styles.formBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Amount */}
            <PremiumCard style={styles.formCard}>
              <Text style={[styles.fieldLabel, { color: colors.gray600 }]}>
                {t('reports.amount')}
              </Text>
              <View style={[styles.amountInputRow, { borderColor: errors.amount ? colors.error : colors.gray200, backgroundColor: colors.white, flexDirection }]}>
                <TextInput
                  style={[styles.amountInput, { color: colors.black }]}
                  placeholder="0"
                  placeholderTextColor={colors.gray400}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: undefined })); }}
                  onBlur={onAmountBlur}
                />
                <View style={[styles.amountBadge, { backgroundColor: colors.gray100 }]}>
                  <Text style={[styles.amountBadgeText, { color: colors.gray500 }]}>IQD</Text>
                </View>
              </View>
              {errors.amount ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.amount}</Text>
              ) : rounded !== null ? (
                <Text style={[styles.roundedHint, { color: colors.primary }]}>
                  → {fmtIQD(rounded)} IQD
                </Text>
              ) : null}

              {/* Reason */}
              <Text style={[styles.fieldLabel, { color: colors.gray600, marginTop: 16 }]}>
                {t('reports.expenseReason')}
              </Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  { borderColor: errors.reason ? colors.error : colors.gray200, backgroundColor: colors.white, color: colors.black },
                ]}
                placeholder={t('reports.expenseReasonPlaceholder')}
                placeholderTextColor={colors.gray400}
                value={reason}
                onChangeText={(v) => { setReason(v); setExample(null); setErrors((e) => ({ ...e, reason: undefined })); }}
                returnKeyType="done"
              />
              {errors.reason ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.reason}</Text>
              ) : null}

              {/* Helper text */}
              <Text style={[styles.helperText, { color: colors.gray400 }]}>
                {t('reports.expenseReasonHelper')}
              </Text>

              {/* Quick-fill example chips */}
              <Text style={[styles.examplesLabel, { color: colors.gray500 }]}>
                {t('reports.expenseExamplesLabel')}
              </Text>
              <View style={[styles.examplesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {EXPENSE_EXAMPLES.map((ex, idx) => {
                  const selected = selectedExample === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.exampleChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.gray100,
                          borderColor: selected ? colors.primary : colors.gray200,
                        },
                      ]}
                      onPress={() => {
                        setReason(ex.text);
                        setExample(idx);
                        setErrors((e) => ({ ...e, reason: undefined }));
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.exampleChipText, { color: selected ? '#fff' : colors.gray600 }]}>
                        {ex.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional note */}
              <View style={[styles.noteDivider, { backgroundColor: colors.gray100 }]} />
              <Text style={[styles.fieldLabel, { color: colors.gray600 }]}>
                {t('reports.note')}
              </Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  { borderColor: colors.gray200, backgroundColor: colors.white, color: colors.black },
                ]}
                placeholder={t('reports.notePlaceholder')}
                placeholderTextColor={colors.gray400}
                value={note}
                onChangeText={setNote}
                returnKeyType="done"
              />
            </PremiumCard>

            {/* Date */}
            <PremiumCard style={styles.formCard}>
              <DateTimePicker
                value={expenseDate}
                onChange={setDate}
                label={t('reports.date')}
                maxDate={new Date()}
              />
            </PremiumCard>

            <PrimaryButton
              label={saving ? t('common.saving') ?? 'Saving…' : isEdit ? t('reports.save') : t('reports.addExpense')}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Expense Card ─────────────────────────────────────────────────────────────

function ExpenseCard({
  expense,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useAppTheme();
  const { isRTL } = useRTL();

  const iconBg = CATEGORY_COLORS[expense.category] ?? '#F1F5F9';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200 }}
    >
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        {/* Top row: icon + category + amount */}
        <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.cardIconCircle, { backgroundColor: iconBg }]}>
            <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[expense.category] ?? '📌'}</Text>
          </View>
          <View style={[styles.cardMid, { marginStart: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.cardCategory, { color: colors.black }]} numberOfLines={2}>
              {expense.reason ?? expense.note ?? '—'}
            </Text>
            {expense.reason != null && expense.note ? (
              <Text style={[styles.cardReason, { color: colors.gray500 }]} numberOfLines={1}>
                {expense.note}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.cardAmount, { color: Colors.error }]}>
            {fmtIQD(expense.amount)} IQD
          </Text>
        </View>

        {/* Bottom row: date/time + action buttons */}
        <View style={[styles.cardBottomRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.cardDate, { color: colors.gray400 }]}>
            {formatDate(expense.date)}
            {expense.createdAt ? ` · ${formatTime(expense.createdAt)}` : ''}
          </Text>
          <View style={[styles.cardActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]}
              onPress={onEdit}
              hitSlop={6}
            >
              <Ionicons name="create-outline" size={15} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FEF2F2', marginStart: 6 }]}
              onPress={onDelete}
              hitSlop={6}
            >
              <Ionicons name="trash-outline" size={15} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </MotiView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const { expenses, reloadAfterMutation, loadExpenses } = useReportStore();
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();

  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Expense | undefined>(undefined);
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilterKey>('today');
  const [appliedRange, setAppliedRange]   = useState<{ from: string; to: string } | null>(null);

  React.useEffect(() => { loadExpenses(); }, []);

  const filteredExpenses = useMemo(
    () => applyExpenseFilter(expenses, expenseFilter, appliedRange),
    [expenses, expenseFilter, appliedRange],
  );

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  function handleFilterChange(key: ExpenseFilterKey, range?: { from: string; to: string }) {
    setExpenseFilter(key);
    if (key === 'custom' && range) { setAppliedRange(range); }
    else if (key !== 'custom') { setAppliedRange(null); }
  }

  function openAdd() {
    setEditTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditTarget(expense);
    setFormOpen(true);
  }

  const handleSave = useCallback(async (data: { amount: number; category: string; reason: string; note?: string; date?: string }) => {
    if (editTarget) {
      const { updateExpense } = await import('@/lib/sqlite');
      await updateExpense(editTarget.id, data);
    } else {
      const { createExpense } = await import('@/lib/sqlite');
      await createExpense(data);
    }
    await reloadAfterMutation();
    setFormOpen(false);
  }, [editTarget, reloadAfterMutation]);

  function handleDelete(id: number) {
    Alert.alert(t('reports.deleteExpense'), t('reports.deleteExpenseConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { deleteExpense } = await import('@/lib/sqlite');
          await deleteExpense(id);
          await reloadAfterMutation();
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('reports.expensesTitle')}
        showBack
        rightAction={<HeaderActionButton icon="add-circle-outline" onPress={openAdd} />}
      />

      <ExpenseFilterBar
        filter={expenseFilter}
        appliedRange={appliedRange}
        onChange={handleFilterChange}
      />

      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Summary card */}
            {filteredExpenses.length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300 }}
              >
                <PremiumCard style={styles.summaryCard}>
                  <Text style={[styles.summaryLabel, { color: colors.gray400, textAlign }]}>
                    {t('reports.totalExpenses')}
                  </Text>
                  <Text style={[styles.summaryTotal, { textAlign }]}>
                    {fmtIQD(totalExpenses)} IQD
                  </Text>

                  <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />
                  <View style={[styles.summaryCountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.summaryCountLabel, { color: colors.gray500 }]}>
                      {t('reports.expenses')}
                    </Text>
                    <Text style={[styles.summaryCountValue, { color: colors.gray700 }]}>
                      {filteredExpenses.length}
                    </Text>
                  </View>
                </PremiumCard>
              </MotiView>
            )}

            {filteredExpenses.length > 0 && (
              <View style={[styles.listHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.listTitle, { color: colors.black }]}>
                  {t('reports.expenses')} ({filteredExpenses.length})
                </Text>
                <Text style={[styles.listHint, { color: colors.gray400 }]}>
                  {t('reports.tapToDelete')}
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="wallet-outline" size={40} color={Colors.gray400} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.gray600 }]}>
              {t('reports.noExpenses')}
            </Text>
            <Text style={[styles.emptySub, { color: colors.gray400 }]}>
              {t('reports.tapToAddExpense')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.primary, flexDirection }]}
              onPress={openAdd}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginEnd: 6 }} />
              <Text style={styles.emptyAddBtnLabel}>{t('reports.addExpense')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ExpenseFormModal
        visible={formOpen}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  listContent: { padding: 16, paddingBottom: 40 },

  // Summary card
  summaryCard: { marginBottom: 16 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryTotal: { fontSize: 26, fontWeight: '800', color: Colors.error, marginBottom: 12 },
  divider: { height: 1, marginBottom: 12 },
  summaryCountRow: { alignItems: 'center', justifyContent: 'space-between' },
  summaryCountLabel: { fontSize: 13 },
  summaryCountValue: { fontSize: 13, fontWeight: '700' },

  listHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { fontSize: 14, fontWeight: '700' },
  listHint: { fontSize: 11 },

  // Expense card
  card: {
    borderRadius: Theme.radius.lg,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: { alignItems: 'flex-start', marginBottom: 10 },
  cardIconCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardMid: { flex: 1 },
  cardCategory: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardReason: { fontSize: 13 },
  cardAmount: { fontSize: 15, fontWeight: '800', flexShrink: 0, marginStart: 8 },
  cardBottomRow: { alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { fontSize: 11 },
  cardActions: { alignItems: 'center' },
  actionBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty state
  empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.gray100,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptySub: { fontSize: 13, marginBottom: 8 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, marginTop: 8,
  },
  emptyAddBtnLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Form modal
  formRoot: { flex: 1 },
  formHeader: {
    paddingTop: 52, paddingBottom: 16,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  formHeaderInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  formHeaderBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  formHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.15 },

  formBody: { flex: 1 },
  formBodyContent: { padding: 16, gap: 12 },
  formCard: { marginBottom: 0 },

  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.1 },

  amountInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12, overflow: 'hidden', height: 52,
  },
  amountInput: { flex: 1, paddingHorizontal: 14, fontSize: 18, fontWeight: '600' },
  amountBadge: {
    paddingHorizontal: 14, height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  amountBadgeText: { fontSize: 13, fontWeight: '600' },
  roundedHint: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  errorText: { fontSize: 12, marginTop: 4 },

  reasonInput: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, minHeight: 52,
  },

  noteDivider: { height: 1, marginTop: 16, marginBottom: 14 },
  helperText: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  examplesLabel: { fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 8, letterSpacing: 0.1 },
  examplesRow: { flexWrap: 'wrap', gap: 8 },
  exampleChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
  },
  exampleChipText: { fontSize: 13, fontWeight: '500' },
});
