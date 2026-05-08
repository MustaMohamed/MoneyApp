import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
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
import type { UseFormReturn } from 'react-hook-form';

import { AmountType, Currency, DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { CategoryPickerSheet } from '@/screens/transactions/transaction_form/components/category_picker_sheet';
import { AccountPickerSheet } from '@/screens/transactions/transaction_form/components/account_picker_sheet';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { CommitmentFormValues } from '../add_commitment/add_commitment.hook';
import type { RecurrencePreset } from '../add_commitment/add_commitment.store';
import { RecurrencePicker } from './recurrence_picker';
import { DurationPicker } from './duration_picker';

const CURRENCIES: Currency[] = [Currency.EGP, Currency.USD];

const AMOUNT_TYPES: { key: AmountType; label: string }[] = [
  { key: AmountType.Fixed, label: Strings.commitmentsAmountFixed },
  { key: AmountType.Variable, label: Strings.commitmentsAmountVariable },
];

interface CommitmentFormBodyProps {
  form: UseFormReturn<CommitmentFormValues>;
  amountType: AmountType;
  recurrencePreset: RecurrencePreset;
  durationType: DurationType;
  onAmountTypeChange: (v: AmountType) => void;
  onRecurrencePresetChange: (preset: RecurrencePreset) => void;
  onDurationTypeChange: (type: DurationType) => void;
  onOpenCategoryPicker: () => void;
  onCloseCategoryPicker: () => void;
  onOpenAccountPicker: () => void;
  onCloseAccountPicker: () => void;
  onSelectCategory: (category: Category) => void;
  onSelectAccount: (account: Account) => void;
  categoryPickerVisible: boolean;
  accountPickerVisible: boolean;
  categories: Category[];
  accounts: Account[];
  selectedCategory: Category | undefined;
  selectedAccount: Account | undefined;
  saving: boolean;
  onSubmit: () => void;
  title: string;
  locked?: boolean;
}

export function CommitmentFormBody({
  form,
  amountType,
  recurrencePreset,
  durationType,
  onAmountTypeChange,
  onRecurrencePresetChange,
  onDurationTypeChange,
  onOpenCategoryPicker,
  onCloseCategoryPicker,
  onOpenAccountPicker,
  onCloseAccountPicker,
  onSelectCategory,
  onSelectAccount,
  categoryPickerVisible,
  accountPickerVisible,
  categories,
  accounts,
  selectedCategory,
  selectedAccount,
  saving,
  onSubmit,
  title,
  locked,
}: CommitmentFormBodyProps) {
  const amount = form.watch('amount');
  const currency = form.watch('currency');
  const start_date = form.watch('start_date');
  const notes = form.watch('notes');

  const errors = {
    name: form.formState.errors.name?.message,
    amount: form.formState.errors.amount?.message,
    category: form.formState.errors.category_id?.message,
    start_date: form.formState.errors.start_date?.message,
    notes: form.formState.errors.notes?.message,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
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
          <TextInput
            style={styles.textInput}
            value={form.watch('name')}
            onChangeText={(v) => form.setValue('name', v)}
            placeholder="e.g. Rent"
            placeholderTextColor={Colors.dark.text2}
            maxLength={50}
            editable={!locked}
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
                  onPress={() => onAmountTypeChange(key)}
                  disabled={locked}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Amount + Currency (Fixed only) */}
        {amountType === AmountType.Fixed && (
          <View style={styles.amountRow}>
            <View style={[styles.field, styles.amountField]}>
              <Text style={styles.fieldLabel}>{Strings.commitmentsFieldAmount}</Text>
              <TextInput
                style={[styles.textInput, errors.amount ? styles.inputError : null]}
                value={amount != null ? String(amount) : ''}
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  form.setValue('amount', isNaN(n) ? undefined : n);
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Colors.dark.text2}
                editable={!locked}
              />
            </View>
            <View style={[styles.field, styles.currencyField]}>
              <Text style={styles.fieldLabel}>{Strings.commitmentsFieldCurrency}</Text>
              <View style={styles.chipRow}>
                {CURRENCIES.map((c) => {
                  const active = currency === c;
                  return (
                    <Pressable
                      key={c}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => form.setValue('currency', c)}
                      disabled={locked}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}
        {amountType === AmountType.Fixed && errors.amount ? (
          <Text style={styles.err}>{errors.amount}</Text>
        ) : null}

        {/* Category picker row */}
        <Pressable style={styles.field} onPress={onOpenCategoryPicker} disabled={locked}>
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
          onPresetChange={onRecurrencePresetChange}
        />

        {/* Start Date */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{Strings.commitmentsFieldStartDate}</Text>
          <TextInput
            style={[styles.textInput, errors.start_date ? styles.inputError : null]}
            value={start_date}
            onChangeText={(v) => form.setValue('start_date', v)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.dark.text2}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            editable={!locked}
          />
        </View>
        {errors.start_date ? <Text style={styles.err}>{errors.start_date}</Text> : null}

        {/* Default Account (optional) */}
        <Pressable style={styles.field} onPress={onOpenAccountPicker}>
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
          onDurationTypeChange={onDurationTypeChange}
        />

        {/* Notes (optional) */}
        <View style={styles.field}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{Strings.commitmentsFieldNotes}</Text>
            <Text style={styles.optionalBadge}>{Strings.commitmentsOptional}</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notes ?? ''}
            onChangeText={(v) => form.setValue('notes', v || undefined)}
            placeholder={Strings.addTxNotePlaceholder}
            placeholderTextColor={Colors.dark.text2}
            multiline
            numberOfLines={3}
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
        visible={categoryPickerVisible}
        title={Strings.addTxPickCategoryTitle}
        categories={categories}
        selectedId={form.watch('category_id')}
        onSelect={onSelectCategory}
        onClose={onCloseCategoryPicker}
      />
      <AccountPickerSheet
        visible={accountPickerVisible}
        title={Strings.addTxPickAccountTitle}
        accounts={accounts}
        selectedId={form.watch('account_id')}
        onSelect={onSelectAccount}
        onClose={onCloseAccountPicker}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
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
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipActive: {
    borderColor: Colors.shared.cairoGold,
    backgroundColor: Colors.shared.cairoGold + '22',
  },
  chipLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  chipLabelActive: {
    color: Colors.shared.cairoGold,
  },
  amountRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  amountField: { flex: 2 },
  currencyField: { flex: 1 },
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
  ctaPress: {
    borderRadius: Radius.cta,
    overflow: 'hidden',
  },
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
