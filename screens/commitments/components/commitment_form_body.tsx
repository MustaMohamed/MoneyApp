import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';

import { AmountType, Currency, DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatLongDate } from '@/utils/format_date';
import { CategoryPickerSheet } from '@/screens/transactions/transaction_form/components/category_picker_sheet';
import { AccountPickerSheet } from '@/screens/transactions/transaction_form/components/account_picker_sheet';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { type CommitmentFormValues, PRESET_MAP, detectPreset } from '../commitment_form.shared';
import { RecurrencePicker } from './recurrence_picker';
import { DurationPicker } from './duration_picker';
import { useCommitmentFormBodyState } from './commitment_form_body.state';

const CHIP_ACTIVE_BG = Colors.shared.cairoGold + '22';
const CURRENCIES: Currency[] = [Currency.EGP, Currency.USD];
const AMOUNT_TYPES: { key: AmountType; label: string }[] = [
  { key: AmountType.Fixed, label: Strings.commitmentsAmountFixed },
  { key: AmountType.Variable, label: Strings.commitmentsAmountVariable },
];

interface CommitmentFormBodyProps {
  form: UseFormReturn<CommitmentFormValues>;
  categories: Category[];
  accounts: Account[];
  saving: boolean;
  onSubmit: () => void;
  title: string;
  locked?: boolean;
}

export function CommitmentFormBody({
  form,
  categories,
  accounts,
  saving,
  onSubmit,
  title,
  locked,
}: CommitmentFormBodyProps) {
  const amountType = form.watch('amountType');
  const currency = form.watch('currency');
  const startDate = form.watch('startDate');
  const durationType = form.watch('durationType');
  const recurrenceEvery = form.watch('recurrenceEvery');
  const recurrencePeriod = form.watch('recurrencePeriod');
  const categoryId = form.watch('categoryId');
  const accountId = form.watch('accountId');
  const recurrencePreset = detectPreset(recurrenceEvery, recurrencePeriod);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId],
  );

  const {
    state: bodyState,
    setCategoryPickerVisible,
    setAccountPickerVisible,
    setShowStartDatePicker,
    setShowEndDatePicker,
  } = useCommitmentFormBodyState(
    useShallow((s) => ({
      state: s.state,
      setCategoryPickerVisible: s.setCategoryPickerVisible,
      setAccountPickerVisible: s.setAccountPickerVisible,
      setShowStartDatePicker: s.setShowStartDatePicker,
      setShowEndDatePicker: s.setShowEndDatePicker,
    })),
  );

  useEffect(() => () => useCommitmentFormBodyState.getState().reset(), []);

  const errors = {
    name: form.formState.errors.name?.message,
    amount: form.formState.errors.amount?.message,
    category: form.formState.errors.categoryId?.message,
    startDate: form.formState.errors.startDate?.message,
    notes: form.formState.errors.notes?.message,
  };

  const startDateAsDate = startDate ? new Date(startDate + 'T00:00:00') : new Date();
  const formattedStartDate = startDate
    ? formatLongDate(startDate)
    : Strings.commitmentDateInputFormat;

  function handleAmountTypeChange(v: AmountType) {
    form.setValue('amountType', v, { shouldDirty: true });
    if (v === AmountType.Variable) form.setValue('amount', undefined);
  }

  function handleRecurrencePresetChange(preset: ReturnType<typeof detectPreset>) {
    const mapped = PRESET_MAP[preset];
    if (mapped) {
      form.setValue('recurrenceEvery', mapped.every, { shouldDirty: true });
      form.setValue('recurrencePeriod', mapped.period, { shouldDirty: true });
    }
  }

  function handleDurationTypeChange(type: DurationType) {
    form.setValue('durationType', type, { shouldDirty: true });
    if (type !== DurationType.UntilDate) form.setValue('endDate', undefined);
    if (type !== DurationType.AfterCount) form.setValue('endAfterCount', undefined);
  }

  function openStartDatePicker() {
    if (locked) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: startDateAsDate,
        mode: 'date',
        onChange: (_, d) => {
          if (d) form.setValue('startDate', d.toISOString().slice(0, 10));
        },
      });
    } else {
      setShowStartDatePicker(!bodyState.showStartDatePicker);
      setShowEndDatePicker(false);
    }
  }

  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id);
    setCategoryPickerVisible(false);
  }

  function selectAccount(account: Account) {
    form.setValue('accountId', account.id);
    setAccountPickerVisible(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={Size.iconBack}
            color={Colors.dark.text2}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{Strings.commitmentsFieldName}</Text>
          <Controller
            control={form.control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={styles.textInput}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.commitmentsNamePlaceholder}
                placeholderTextColor={Colors.dark.text2}
                maxLength={50}
                editable={!locked}
                multiline={false}
                numberOfLines={1}
              />
            )}
          />
        </View>
        {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

        {/* Amount Type toggle */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{Strings.commitmentsFieldAmountType}</Text>
          <View style={styles.chipRow}>
            {AMOUNT_TYPES.map(({ key, label }) => {
              const active = amountType === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => handleAmountTypeChange(key)}
                  disabled={locked}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Amount + Currency row */}
        <View style={styles.amountRow}>
          <View style={[styles.field, styles.amountField]}>
            {amountType === AmountType.Variable ? (
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{Strings.commitmentsFieldEstimatedAmount}</Text>
                <Text style={styles.optionalBadge}>{Strings.commitmentsOptional}</Text>
              </View>
            ) : (
              <Text style={styles.fieldLabel}>{Strings.commitmentsFieldAmount}</Text>
            )}
            <Controller
              control={form.control}
              name="amount"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={[styles.textInput, errors.amount ? styles.inputError : null]}
                  value={value != null ? String(value) : ''}
                  onChangeText={(v) => {
                    const n = parseFloat(v);
                    onChange(isNaN(n) ? undefined : n);
                  }}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  placeholder={
                    amountType === AmountType.Variable
                      ? Strings.commitmentsEstimatedAmountPlaceholder
                      : Strings.commitmentsAmountPlaceholder
                  }
                  placeholderTextColor={Colors.dark.text2}
                  editable={!locked}
                  multiline={false}
                  numberOfLines={1}
                />
              )}
            />
          </View>
          <View style={[styles.field, styles.currencyField]}>
            <Text style={styles.fieldLabel}>{Strings.commitmentsFieldCurrency}</Text>
            <View style={styles.currencyChipRow}>
              {CURRENCIES.map((c) => {
                const active = currency === c;
                return (
                  <Pressable
                    key={c}
                    style={[styles.chip, styles.currencyChip, active && styles.chipActive]}
                    onPress={() => form.setValue('currency', c, { shouldDirty: true })}
                    disabled={locked}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        {errors.amount ? <Text style={styles.err}>{errors.amount}</Text> : null}

        {/* Category picker row */}
        <Pressable
          style={styles.field}
          onPress={() => setCategoryPickerVisible(true)}
          disabled={locked}
        >
          <Text style={styles.fieldLabel}>{Strings.commitmentsFieldCategory}</Text>
          <View style={styles.fieldValue}>
            {selectedCategory ? (
              <Text style={styles.fieldValueText}>{selectedCategory.name}</Text>
            ) : (
              <Text style={styles.fieldPlaceholder}>{Strings.addTxPickCategoryTitle}</Text>
            )}
            <MaterialCommunityIcons
              name={locked ? 'lock-outline' : 'chevron-right'}
              size={ms(18)}
              color={Colors.dark.text2}
            />
          </View>
        </Pressable>
        {errors.category ? <Text style={styles.err}>{errors.category}</Text> : null}

        {/* Recurrence */}
        <RecurrencePicker
          form={form}
          recurrencePreset={recurrencePreset}
          onPresetChange={handleRecurrencePresetChange}
        />

        {/* Start Date */}
        <Pressable
          style={[styles.field, errors.startDate ? styles.inputError : null]}
          onPress={openStartDatePicker}
          disabled={locked}
        >
          <Text style={styles.fieldLabel}>{Strings.commitmentsFieldStartDate}</Text>
          <View style={styles.fieldValue}>
            <Text style={startDate ? styles.fieldValueText : styles.fieldPlaceholder}>
              {formattedStartDate}
            </Text>
            <MaterialCommunityIcons
              name={locked ? 'lock-outline' : 'calendar'}
              size={ms(18)}
              color={Colors.dark.text2}
            />
          </View>
        </Pressable>
        {errors.startDate ? <Text style={styles.err}>{errors.startDate}</Text> : null}

        {bodyState.showStartDatePicker && (
          <DateTimePicker
            value={startDateAsDate}
            mode="date"
            display="spinner"
            themeVariant="dark"
            onChange={(_, d) => {
              if (d) form.setValue('startDate', d.toISOString().slice(0, 10));
            }}
          />
        )}

        {/* Default Account (optional) */}
        <Pressable
          style={styles.field}
          onPress={() => setAccountPickerVisible(true)}
          disabled={locked}
        >
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{Strings.commitmentsFieldDefaultAccount}</Text>
            <Text style={styles.optionalBadge}>{Strings.commitmentsOptional}</Text>
          </View>
          <View style={styles.fieldValue}>
            {selectedAccount ? (
              <>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: selectedAccount.color ?? Colors.dark.border },
                  ]}
                />
                <Text style={styles.fieldValueText}>{selectedAccount.name}</Text>
              </>
            ) : (
              <Text style={styles.fieldPlaceholder}>{Strings.addTxPickAccountTitle}</Text>
            )}
            <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
          </View>
        </Pressable>

        {/* Duration */}
        <DurationPicker
          form={form}
          durationType={durationType}
          onDurationTypeChange={handleDurationTypeChange}
          showEndDatePicker={bodyState.showEndDatePicker}
          setShowEndDatePicker={(v) => {
            setShowEndDatePicker(v);
            if (v) setShowStartDatePicker(false);
          }}
        />

        {/* Notes (optional) */}
        <View style={styles.field}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{Strings.commitmentsFieldNotes}</Text>
            <Text style={styles.optionalBadge}>{Strings.commitmentsOptional}</Text>
          </View>
          <Controller
            control={form.control}
            name="notes"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={styles.notesInput}
                value={value ?? ''}
                onChangeText={(v) => onChange(v || undefined)}
                onBlur={onBlur}
                placeholder={Strings.addTxNotePlaceholder}
                placeholderTextColor={Colors.dark.text2}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, saving && styles.ctaDisabled]}>
        <Pressable style={styles.ctaPress} onPress={onSubmit} disabled={saving}>
          <LinearGradient
            colors={[Colors.shared.cairoGold, Colors.dark.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaLabel}>{Strings.commitmentsSave}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Pickers */}
      <CategoryPickerSheet
        visible={bodyState.categoryPickerVisible}
        title={Strings.addTxPickCategoryTitle}
        categories={categories}
        selectedId={categoryId}
        onSelect={selectCategory}
        onClose={() => setCategoryPickerVisible(false)}
      />
      <AccountPickerSheet
        visible={bodyState.accountPickerVisible}
        title={Strings.addTxPickAccountTitle}
        accounts={accounts}
        selectedId={accountId}
        onSelect={selectAccount}
        onClose={() => setAccountPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  scrollContent: { gap: Spacing.sm, paddingBottom: Spacing.md, paddingTop: Spacing.sm },
  field: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xxs,
  },
  fieldLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  optionalBadge: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  fieldValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  fieldValueText: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  fieldPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  dot: { width: ms(10), height: ms(10), borderRadius: ms(5) },
  textInput: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.dark.negative,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  currencyChipRow: { flexDirection: 'row', gap: Spacing.xs },
  currencyChip: { flex: 1, alignItems: 'center' },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipActive: { borderColor: Colors.shared.cairoGold, backgroundColor: CHIP_ACTIVE_BG },
  chipLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  chipLabelActive: { color: Colors.shared.cairoGold },
  amountRow: { flexDirection: 'row', gap: Spacing.sm },
  amountField: { flex: 3 },
  currencyField: { flex: 2 },
  notesInput: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
    minHeight: ms(60),
    textAlignVertical: 'top',
  },
  err: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    marginTop: -Spacing.xxs,
  },
  footer: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.surface,
  },
  ctaPress: { borderRadius: Radius.cta, overflow: 'hidden' },
  cta: {
    height: Size.ctaHeight,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
