import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useId, useMemo } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { View } from 'react-native';

import { AccountStrip } from '@/components/ui/account_strip';
import { Button } from '@/components/ui/button';
import { DangerRing } from '@/components/ui/danger_ring';
import { DateRow } from '@/components/ui/date_row';
import { FormErrorText } from '@/components/ui/form_error_text';
import { FormPickerRow } from '@/components/ui/form_picker_row';
import {
  FORM_FACT_CELL_CLASS,
  FORM_SHEET_CONTENT_CONTAINER_STYLE,
} from '@/components/ui/form_sheet.geometry';
import { FormTypeTabs } from '@/components/ui/form_type_tabs';
import { ListCard } from '@/components/ui/list_card';
import { NoteFactRow } from '@/components/ui/note_fact_row';
import { useNoteReveal } from '@/components/ui/note_reveal.hook';
import { ValidationSlot } from '@/components/ui/validation_slot';
import {
  AmountType,
  CategoryType,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { CategoryPickerRow } from '@/modules/categories/components/category_picker_row';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import { ms } from '@/utils/responsive';

import {
  resolveAccountIdFromChip,
  resolveCommitmentStripChips,
  resolveEndsRowValue,
  resolveRepeatsRowValue,
} from '../commitment_form.helpers';
import {
  type CommitmentFormValues,
  PRESET_MAP,
  SET_OPTS,
  detectPreset,
} from '../commitment_form.shared';
import { CommitmentAmountHero } from './commitment_amount_hero';
import { CommitmentChoiceSheet } from './commitment_choice_sheet';
import {
  resolveCommitmentFormStripError,
  useCommitmentFormBodyFaults,
  useCommitmentFormBodyPickers,
  useCommitmentFormStripAccounts,
} from './commitment_form_body.hook';
import { DurationPicker } from './duration_picker';
import { RecurrencePicker } from './recurrence_picker';

interface CommitmentFormBodyProps {
  form: UseFormReturn<CommitmentFormValues>;
  categories: Category[];
  accounts: Account[];
  locked?: boolean;
  afterFields?: React.ReactNode;
}

export function CommitmentFormFooter({
  errorMessage,
  saving,
  onSubmit,
}: {
  errorMessage?: string;
  saving: boolean;
  onSubmit: () => void;
}): React.ReactElement {
  return (
    <>
      <View
        style={{ minHeight: ms(16) }}
        className="justify-center"
        collapsable={false}
        accessibilityLiveRegion="polite"
      >
        <FormErrorText
          message={errorMessage}
          numberOfLines={1}
          disableAnimation
          className="text-center"
          style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
        />
      </View>
      <Button
        variant="primary"
        label={Strings.commitmentsSave}
        isLoading={saving}
        onPress={onSubmit}
      />
    </>
  );
}

export function CommitmentFormBody(props: CommitmentFormBodyProps) {
  const { form, categories, accounts, locked, afterFields } = props;
  const startsOwnerId = useId();
  const { scrollRef, handleScrollLayout, handleNoteFocus, handleNoteBlur } = useNoteReveal();
  const [
    amountType,
    currency,
    startDate,
    durationType,
    recurrenceEvery,
    recurrencePeriod,
    categoryId,
    accountId,
    endAfterCount,
    endDate,
  ] = useWatch({
    control: form.control,
    name: [
      'amountType',
      'currency',
      'startDate',
      'durationType',
      'recurrenceEvery',
      'recurrencePeriod',
      'categoryId',
      'accountId',
      'endAfterCount',
      'endDate',
    ],
  });
  const recurrencePreset = detectPreset(recurrenceEvery, recurrencePeriod);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );
  // Commitments are expenses only; `selectedCategory` keeps the full list so legacy rows resolve.
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === CategoryType.Expense),
    [categories],
  );
  const accountRead = useCommitmentFormStripAccounts(accountId);
  const stripError = resolveCommitmentFormStripError(accountRead, accountId);
  const stripChips = resolveCommitmentStripChips({
    activeAccounts: accounts,
    accountId,
    accountsById: accountRead.accountsById,
  });

  const {
    state: { categoryPickerVisible, showEndDatePicker, choiceSheet },
    setCategoryPickerVisible,
    setShowEndDatePicker,
    setChoiceSheet,
  } = useCommitmentFormBodyPickers();

  const { faults: errors, isSubmitted } = useCommitmentFormBodyFaults(form);
  const endsFault = errors.endAfterCount ?? errors.endDate;

  function handleAmountTypeChange(v: AmountType) {
    form.setValue('amountType', v, SET_OPTS);
    if (isSubmitted) void form.trigger('amount');
  }

  function handleRecurrencePresetChange(preset: ReturnType<typeof detectPreset>) {
    const mapped = PRESET_MAP[preset];
    if (mapped) {
      form.setValue('recurrenceEvery', mapped.every, SET_OPTS);
      form.setValue('recurrencePeriod', mapped.period, SET_OPTS);
      return;
    }
    // Nudge the values away from every preset shape so `detectPreset` returns Custom.
    if (recurrenceEvery === 1) {
      form.setValue('recurrenceEvery', 2, SET_OPTS);
    } else if (recurrencePeriod === RecurrencePeriod.Months) {
      // Already non-1 months, so switch period instead; `detectPreset` cannot map it back.
      form.setValue('recurrencePeriod', RecurrencePeriod.Days, SET_OPTS);
    }
  }

  function handleDurationTypeChange(type: DurationType) {
    form.setValue('durationType', type, SET_OPTS);
    if (type !== DurationType.UntilDate) form.resetField('endDate', { defaultValue: undefined });
    if (type !== DurationType.AfterCount)
      form.resetField('endAfterCount', { defaultValue: undefined });
  }

  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id, SET_OPTS);
    setCategoryPickerVisible(false);
  }

  function toggleCurrency() {
    form.setValue('currency', currency === Currency.EGP ? Currency.USD : Currency.EGP, SET_OPTS);
  }

  const chevron = (
    <MaterialCommunityIcons name="chevron-right" size={Size.iconSm} color={CoreTokens.text2} />
  );

  return (
    <>
      <BottomSheetScrollView
        ref={scrollRef}
        testID="commitment-form-scroll"
        style={{ flex: 1 }}
        onLayout={handleScrollLayout}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormTypeTabs<AmountType>
          segments={[
            { value: AmountType.Fixed, label: Strings.commitmentsTypeFixedAmount },
            { value: AmountType.Variable, label: Strings.commitmentsTypeVariesEachTime },
          ]}
          value={amountType}
          onValueChange={handleAmountTypeChange}
          accessibilityLabel={Strings.commitmentsAmountTypeSelectorA11y}
          isDisabled={locked}
          supportText={
            amountType === AmountType.Variable
              ? Strings.commitmentsTypeVariableSupport
              : Strings.commitmentsTypeFixedSupport
          }
          supportLines="wrap"
        >
          <AccountStrip
            chips={stripChips}
            error={stripError}
            onSelect={
              locked
                ? undefined
                : (id) => form.setValue('accountId', resolveAccountIdFromChip(id), SET_OPTS)
            }
          />
        </FormTypeTabs>
        <CommitmentAmountHero
          form={form}
          currency={currency}
          invalid={errors.amount !== undefined}
        />
        <ValidationSlot
          testID="amount-error-slot"
          liveTestID="amount-error-live"
          message={errors.amount}
        />

        <View testID="commitment-form-card-inset" style={FORM_SHEET_CONTENT_CONTAINER_STYLE}>
          <ListCard testID="commitment-form-fact-group">
            <View className={FORM_FACT_CELL_CLASS}>
              <Controller
                control={form.control}
                name="name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <NoteFactRow
                    testID="name-row"
                    inset={false}
                    maxLength={50}
                    disabled={locked}
                    accessibilityHint={errors.name}
                    label={Strings.commitmentsFieldName}
                    placeholder={Strings.commitmentsNamePlaceholder}
                    // oxlint-disable-next-line typescript/no-unnecessary-condition -- RHF field value can be null at reset
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              {errors.name !== undefined ? <DangerRing testID="name-ring" /> : null}
            </View>

            <View className={FORM_FACT_CELL_CLASS}>
              <CategoryPickerRow
                testID="category-row"
                label={Strings.commitmentsFieldCategory}
                category={selectedCategory}
                onPress={() => setCategoryPickerVisible(true)}
                disabled={locked}
                accessibilityHint={errors.categoryId}
              />
              {errors.categoryId !== undefined ? <DangerRing testID="category-ring" /> : null}
            </View>

            <View className={FORM_FACT_CELL_CLASS}>
              <FormPickerRow
                testID="repeats-row"
                divider={false}
                onPress={() => setChoiceSheet('repeats')}
                disabled={locked}
                label={Strings.commitmentsFieldRecurrence}
                accessibilityHint={errors.recurrenceEvery}
                value={resolveRepeatsRowValue(recurrenceEvery, recurrencePeriod)}
                suffix={chevron}
              />
              {errors.recurrenceEvery !== undefined ? <DangerRing testID="repeats-ring" /> : null}
            </View>

            <View className={FORM_FACT_CELL_CLASS}>
              <DateRow
                ownerId={startsOwnerId}
                value={startDate}
                onChange={(next) => form.setValue('startDate', next, SET_OPTS)}
                divider={false}
                label={Strings.commitmentsFieldStartDate}
                testID="starts-row"
                pickerTitle={Strings.commitmentsFieldStartDate}
                capsAtToday={false}
                disabled={locked}
              />
              {errors.startDate !== undefined ? <DangerRing testID="starts-ring" /> : null}
            </View>

            <View className={FORM_FACT_CELL_CLASS}>
              <FormPickerRow
                testID="ends-row"
                divider={false}
                onPress={() => setChoiceSheet('ends')}
                disabled={locked}
                label={Strings.commitmentsFieldDuration}
                accessibilityHint={endsFault}
                value={resolveEndsRowValue(durationType, endAfterCount, endDate)}
                suffix={chevron}
              />
              {endsFault !== undefined ? <DangerRing testID="ends-ring" /> : null}
            </View>

            <View className={FORM_FACT_CELL_CLASS}>
              <FormPickerRow
                testID="currency-row"
                divider={false}
                onPress={toggleCurrency}
                disabled={locked}
                label={Strings.commitmentsFieldCurrency}
                value={currency}
                suffix={chevron}
              />
            </View>

            <Controller
              control={form.control}
              name="notes"
              render={({ field: { value, onChange, onBlur } }) => (
                <NoteFactRow
                  label={Strings.commitmentsFieldNotes}
                  placeholder={Strings.addTxNotePlaceholder}
                  value={value ?? ''}
                  onChangeText={(v) => onChange(v || undefined)}
                  onFocus={handleNoteFocus}
                  onBlur={() => {
                    handleNoteBlur();
                    onBlur();
                  }}
                />
              )}
            />
          </ListCard>
          {afterFields}
        </View>
      </BottomSheetScrollView>

      <CategoryPickerSheet
        isOpen={categoryPickerVisible}
        title={Strings.addTxPickCategoryTitle}
        categories={expenseCategories}
        selectedId={categoryId}
        onSelect={selectCategory}
        onOpenChange={() => setCategoryPickerVisible(false)}
      />
      <CommitmentChoiceSheet
        isOpen={choiceSheet === 'repeats'}
        title={Strings.commitmentsFieldRecurrence}
        testID="repeats-sheet"
        onClose={() => setChoiceSheet(undefined)}
      >
        <RecurrencePicker
          form={form}
          recurrencePreset={recurrencePreset}
          onPresetChange={handleRecurrencePresetChange}
        />
      </CommitmentChoiceSheet>
      <CommitmentChoiceSheet
        isOpen={choiceSheet === 'ends'}
        title={Strings.commitmentsFieldDuration}
        testID="ends-sheet"
        onClose={() => setChoiceSheet(undefined)}
      >
        <DurationPicker
          form={form}
          durationType={durationType}
          onDurationTypeChange={handleDurationTypeChange}
          showEndDatePicker={showEndDatePicker}
          setShowEndDatePicker={setShowEndDatePicker}
        />
      </CommitmentChoiceSheet>
    </>
  );
}
