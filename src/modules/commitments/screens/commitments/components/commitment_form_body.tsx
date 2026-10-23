import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Input, PressableFeedback } from 'heroui-native';
import { useMemo } from 'react';
import { Controller, useFormState, useWatch, type UseFormReturn } from 'react-hook-form';
import { Platform, View, useWindowDimensions } from 'react-native';

import { AccountStrip } from '@/components/ui/account_strip';
import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import {
  ACCOUNT_STRIP_WRAPPER_PADDING_Y,
  resolveTypeTabsGeometry,
} from '@/components/ui/form_sheet.geometry';
import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { scaledTextStyleAboveOne } from '@/components/ui/text_scale.geometry';
import { ValidationSlot } from '@/components/ui/validation_slot';
import {
  AmountType,
  CategoryType,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

import { resolveAccountIdFromChip, resolveCommitmentStripChips } from '../commitment_form.helpers';
import {
  type CommitmentFormValues,
  PRESET_MAP,
  SET_OPTS,
  composeFieldBlur,
  detectPreset,
} from '../commitment_form.shared';
import { CommitmentAmountHero } from './commitment_amount_hero';
import {
  COMMITMENT_FORM_CONTENT_CONTAINER_STYLE,
  COMMITMENT_FORM_TABS_SLOP,
  COMMITMENT_FORM_TOP_BLEED_STYLE,
} from './commitment_form.geometry';
import {
  useCommitmentFormBodyPickers,
  useCommitmentFormStripAccounts,
} from './commitment_form_body.hook';
import { DurationPicker } from './duration_picker';
import { RecurrencePicker } from './recurrence_picker';

const BODY_FAULT_FIELDS = ['name', 'amount', 'categoryId', 'startDate', 'notes'] as const;

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
  const { onFocus: onInputFocus, onBlur: onInputBlur } = useBottomSheetAwareHandlers();
  const { fontScale } = useWindowDimensions();
  const typeTabs = resolveTypeTabsGeometry(fontScale);
  const supportingText = scaledTextStyleAboveOne(Type.micro, fontScale);
  const [
    amountType,
    currency,
    startDate,
    durationType,
    recurrenceEvery,
    recurrencePeriod,
    categoryId,
    accountId,
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
  const accountsById = useCommitmentFormStripAccounts(accountId);
  const stripChips = resolveCommitmentStripChips({
    activeAccounts: accounts,
    accountId,
    accountsById,
  });

  const {
    state: { categoryPickerVisible, showStartDatePicker, showEndDatePicker },
    setCategoryPickerVisible,
    setShowStartDatePicker,
    setShowEndDatePicker,
  } = useCommitmentFormBodyPickers();

  // Subscribes the body to its own faults: a compiled host reuses this element when `form` keeps its identity.
  const formState = useFormState({ control: form.control, name: BODY_FAULT_FIELDS });
  const errors = {
    name: form.getFieldState('name', formState).error?.message,
    amount: form.getFieldState('amount', formState).error?.message,
    category: form.getFieldState('categoryId', formState).error?.message,
    startDate: form.getFieldState('startDate', formState).error?.message,
    notes: form.getFieldState('notes', formState).error?.message,
  };

  const startDateAsDate = startDate ? new Date(startDate + 'T00:00:00') : new Date();
  const formattedStartDate = startDate
    ? formatLongDate(startDate)
    : Strings.commitmentDateInputFormat;

  function handleAmountTypeChange(v: AmountType) {
    form.setValue('amountType', v, SET_OPTS);
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

  function openStartDatePicker() {
    if (locked) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: startDateAsDate,
        mode: 'date',
        onValueChange: (_, d) => form.setValue('startDate', toLocalDateString(d), SET_OPTS),
      });
    } else {
      setShowStartDatePicker(!showStartDatePicker);
      setShowEndDatePicker(false);
    }
  }

  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id, SET_OPTS);
    setCategoryPickerVisible(false);
  }

  return (
    <>
      <BottomSheetScrollView
        testID="commitment-form-scroll"
        style={{ flex: 1 }}
        contentContainerStyle={COMMITMENT_FORM_CONTENT_CONTAINER_STYLE}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={COMMITMENT_FORM_TOP_BLEED_STYLE}>
          <View className="border-separator border-b px-4 py-2">
            <SegmentedTabs<AmountType>
              segments={[
                { value: AmountType.Fixed, label: Strings.commitmentsTypeFixedAmount },
                { value: AmountType.Variable, label: Strings.commitmentsTypeVariesEachTime },
              ]}
              value={amountType}
              onValueChange={handleAmountTypeChange}
              variant="solid-gold"
              density="compact"
              corners="form"
              listClassName="w-full"
              listStyle={{ height: typeTabs.listHeight }}
              triggerHitSlop={typeTabs.triggerHitSlop}
              accessibilityLabel={Strings.commitmentsAmountTypeSelectorA11y}
              isDisabled={locked}
            />
          </View>
          <View className="min-h-8 justify-center px-4 py-1.5">
            <Text
              className="font-inter text-muted"
              allowFontScaling={supportingText === undefined}
              style={{
                fontSize: Type.micro,
                lineHeight: lineHeightFor(Type.micro),
                ...supportingText,
              }}
            >
              {amountType === AmountType.Variable
                ? Strings.commitmentsTypeVariableSupport
                : Strings.commitmentsTypeFixedSupport}
            </Text>
          </View>
          <View
            className="border-separator border-b"
            style={{ paddingVertical: ACCOUNT_STRIP_WRAPPER_PADDING_Y }}
          >
            <AccountStrip
              chips={stripChips}
              onSelect={
                locked
                  ? undefined
                  : (id) => form.setValue('accountId', resolveAccountIdFromChip(id), SET_OPTS)
              }
            />
          </View>
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
        </View>

        <View className="bg-default gap-1 rounded-2xl px-3 py-3">
          <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
            {Strings.commitmentsFieldName}
          </Text>
          <Controller
            control={form.control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                // oxlint-disable-next-line typescript/no-unnecessary-condition -- RHF field value can be null at reset
                value={value ?? ''}
                onChangeText={onChange}
                onFocus={onInputFocus}
                onBlur={composeFieldBlur(onInputBlur, onBlur)}
                placeholder={Strings.commitmentsNamePlaceholder}
                maxLength={50}
                isDisabled={locked}
                isInvalid={!!errors.name}
              />
            )}
          />
          {errors.name ? (
            <Text className="font-inter text-danger text-[11px]">{errors.name}</Text>
          ) : null}
        </View>

        <View className="bg-default gap-2 rounded-2xl px-3 py-3">
          <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
            {Strings.commitmentsFieldCurrency}
          </Text>
          <SegmentedTabs<Currency>
            segments={[
              { value: Currency.EGP, label: Currency.EGP },
              { value: Currency.USD, label: Currency.USD },
            ]}
            value={currency}
            onValueChange={(c) => form.setValue('currency', c, SET_OPTS)}
            variant="solid-gold"
            listClassName="w-full"
            isDisabled={locked}
            accessibilityLabel={Strings.commitmentsFieldCurrency}
            triggerHitSlop={COMMITMENT_FORM_TABS_SLOP}
          />
        </View>

        <PressableFeedback
          onPress={() => setCategoryPickerVisible(true)}
          isDisabled={locked}
          className="bg-default gap-1 rounded-2xl px-3 py-3"
          accessibilityRole="button"
          accessibilityLabel={Strings.commitmentsFieldCategory}
        >
          <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
            {Strings.commitmentsFieldCategory}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
            {selectedCategory ? (
              <Text className="font-sora-semibold text-foreground flex-1 text-[15px]">
                {selectedCategory.name}
              </Text>
            ) : (
              <Text className="font-inter text-muted flex-1 text-[15px]">
                {Strings.addTxPickCategoryTitle}
              </Text>
            )}
            <MaterialCommunityIcons
              name={locked ? 'lock-outline' : 'chevron-right'}
              size={18}
              color={CoreTokens.text2}
            />
          </View>
          {errors.category ? (
            <Text className="font-inter text-danger text-[11px]">{errors.category}</Text>
          ) : null}
        </PressableFeedback>

        <RecurrencePicker
          form={form}
          recurrencePreset={recurrencePreset}
          onPresetChange={handleRecurrencePresetChange}
        />

        <PressableFeedback
          onPress={openStartDatePicker}
          isDisabled={locked}
          className="bg-default gap-1 rounded-2xl px-3 py-3"
          accessibilityRole="button"
          accessibilityLabel={Strings.commitmentsFieldStartDate}
        >
          <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
            {Strings.commitmentsFieldStartDate}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
            <Text
              className={
                startDate
                  ? 'font-sora-semibold text-foreground flex-1 text-[15px]'
                  : 'font-inter text-muted flex-1 text-[15px]'
              }
            >
              {formattedStartDate}
            </Text>
            <MaterialCommunityIcons
              name={locked ? 'lock-outline' : 'calendar'}
              size={18}
              color={CoreTokens.text2}
            />
          </View>
          {errors.startDate ? (
            <Text className="font-inter text-danger text-[11px]">{errors.startDate}</Text>
          ) : null}
        </PressableFeedback>

        {showStartDatePicker ? (
          <DateTimePicker
            value={startDateAsDate}
            mode="date"
            display="spinner"
            themeVariant="dark"
            onValueChange={(_, d) => form.setValue('startDate', toLocalDateString(d), SET_OPTS)}
          />
        ) : null}

        <DurationPicker
          form={form}
          durationType={durationType}
          onDurationTypeChange={handleDurationTypeChange}
          showEndDatePicker={showEndDatePicker}
          setShowEndDatePicker={(v) => {
            setShowEndDatePicker(v);
            if (v) setShowStartDatePicker(false);
          }}
        />

        <View className="bg-default gap-1 rounded-2xl px-3 py-3">
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-1">
            <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
              {Strings.commitmentsFieldNotes}
            </Text>
            <Text className="font-inter text-muted text-[10px]">{Strings.commitmentsOptional}</Text>
          </View>
          <Controller
            control={form.control}
            name="notes"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value ?? ''}
                onChangeText={(v) => onChange(v || undefined)}
                onFocus={onInputFocus}
                onBlur={composeFieldBlur(onInputBlur, onBlur)}
                placeholder={Strings.addTxNotePlaceholder}
                multiline
                numberOfLines={3}
                style={{ minHeight: 72, textAlignVertical: 'top' }}
              />
            )}
          />
        </View>
        {afterFields}
      </BottomSheetScrollView>

      <CategoryPickerSheet
        isOpen={categoryPickerVisible}
        title={Strings.addTxPickCategoryTitle}
        categories={expenseCategories}
        selectedId={categoryId}
        onSelect={selectCategory}
        onOpenChange={() => setCategoryPickerVisible(false)}
      />
    </>
  );
}
