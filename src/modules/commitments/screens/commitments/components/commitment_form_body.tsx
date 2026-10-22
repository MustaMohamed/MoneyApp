import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Input, PressableFeedback } from 'heroui-native';
import { useMemo } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Platform, View } from 'react-native';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { StackHeader } from '@/components/ui/stack_header';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
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
import { AccountPickerSheet } from '@/modules/accounts/components/account_picker_sheet';
import { resolveAccountGlyphColor } from '@/modules/accounts/constants/account_glyph_color';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import { resolveAccountName } from '@/utils/account_name';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';
import { ms } from '@/utils/responsive';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

import {
  COMMITMENT_AMOUNT_REFUSES_ZERO,
  type CommitmentFormValues,
  PRESET_MAP,
  SET_OPTS,
  composeFieldBlur,
  detectPreset,
} from '../commitment_form.shared';
import {
  COMMITMENT_FORM_CONTENT_CONTAINER_STYLE,
  COMMITMENT_FORM_TABS_SLOP,
} from './commitment_form.geometry';
import { useCommitmentFormBodyPickers } from './commitment_form_body.hook';
import { DecimalAmountInput } from './decimal_amount_input';
import { DurationPicker } from './duration_picker';
import { RecurrencePicker } from './recurrence_picker';

type CommitmentFormPresentationProps =
  | {
      presentation?: 'screen';
      title: string;
      saving: boolean;
      errorMessage?: string;
      onSubmit: () => void;
      /** Rendered between the scroll content and the CTA footer, inside the `Screen` layout. */
      footerExtra?: React.ReactNode;
    }
  | { presentation: 'sheet' };

type CommitmentFormBodyProps = {
  form: UseFormReturn<CommitmentFormValues>;
  categories: Category[];
  accounts: Account[];
  locked?: boolean;
} & CommitmentFormPresentationProps;

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

function CommitmentFormFrame(
  props: CommitmentFormPresentationProps & { children: React.ReactNode },
): React.ReactElement {
  if (props.presentation === 'sheet') return <>{props.children}</>;
  return (
    <Screen edges={['top', 'bottom']}>
      <StackHeader title={props.title} onBack={() => router.back()} />
      {props.children}
      {props.footerExtra ?? null}
      <View className="border-separator border-t px-4 pt-2 pb-6">
        <CommitmentFormFooter
          errorMessage={props.errorMessage}
          saving={props.saving}
          onSubmit={props.onSubmit}
        />
      </View>
    </Screen>
  );
}

function CommitmentFormScroll({
  presentation,
  children,
}: {
  presentation: 'screen' | 'sheet' | undefined;
  children: React.ReactNode;
}): React.ReactElement {
  if (presentation === 'sheet') {
    return (
      <BottomSheetScrollView
        testID="commitment-form-scroll"
        style={{ flex: 1 }}
        contentContainerStyle={COMMITMENT_FORM_CONTENT_CONTAINER_STYLE}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </BottomSheetScrollView>
    );
  }
  return (
    <ScreenScroll
      contentContainerStyle={COMMITMENT_FORM_CONTENT_CONTAINER_STYLE}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScreenScroll>
  );
}

export function CommitmentFormBody(props: CommitmentFormBodyProps) {
  const { form, categories, accounts, locked } = props;
  const { onFocus: onInputFocus, onBlur: onInputBlur } = useBottomSheetAwareHandlers();
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
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId],
  );

  const {
    state: { categoryPickerVisible, accountPickerVisible, showStartDatePicker, showEndDatePicker },
    setCategoryPickerVisible,
    setAccountPickerVisible,
    setShowStartDatePicker,
    setShowEndDatePicker,
  } = useCommitmentFormBodyPickers();

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

  function selectAccount(account: Account) {
    form.setValue('accountId', account.id, SET_OPTS);
    setAccountPickerVisible(false);
  }

  return (
    <CommitmentFormFrame {...props}>
      <CommitmentFormScroll presentation={props.presentation}>
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
            {Strings.commitmentsFieldAmountType}
          </Text>
          <SegmentedTabs<AmountType>
            segments={[
              { value: AmountType.Fixed, label: Strings.commitmentsAmountFixed },
              { value: AmountType.Variable, label: Strings.commitmentsAmountVariable },
            ]}
            value={amountType}
            onValueChange={handleAmountTypeChange}
            variant="solid-gold"
            listClassName="w-full"
            isDisabled={locked}
            accessibilityLabel={Strings.commitmentsFieldAmountType}
            triggerHitSlop={COMMITMENT_FORM_TABS_SLOP}
          />
        </View>

        <View style={{ flexDirection: 'row' }} className="gap-2">
          <View style={{ flex: 3 }} className="bg-default gap-1 rounded-2xl px-3 py-3">
            <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-1">
              <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
                {amountType === AmountType.Variable
                  ? Strings.commitmentsFieldEstimatedAmount
                  : Strings.commitmentsFieldAmount}
              </Text>
              {amountType === AmountType.Variable ? (
                <Text className="font-inter text-muted text-[10px]">
                  {Strings.commitmentsOptional}
                </Text>
              ) : null}
            </View>
            <Controller
              control={form.control}
              name="amount"
              render={({ field: { value, onChange, onBlur } }) => (
                <DecimalAmountInput
                  value={value}
                  onChange={(n, typedText) => {
                    const held =
                      typedText !== undefined &&
                      holdStillTypingDecimal(
                        form,
                        'amount',
                        n,
                        COMMITMENT_AMOUNT_REFUSES_ZERO,
                        typedText,
                      );
                    if (!held) onChange(n);
                  }}
                  onFocus={onInputFocus}
                  onBlur={composeFieldBlur(onInputBlur, onBlur)}
                  hasError={!!errors.amount}
                  placeholder={
                    amountType === AmountType.Variable
                      ? Strings.commitmentsEstimatedAmountPlaceholder
                      : Strings.commitmentsAmountPlaceholder
                  }
                  editable={!locked}
                  multiline={false}
                  numberOfLines={1}
                />
              )}
            />
            {errors.amount ? (
              <Text className="font-inter text-danger text-[11px]">{errors.amount}</Text>
            ) : null}
          </View>

          <View style={{ flex: 2 }} className="bg-default gap-2 rounded-2xl px-3 py-3">
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

        <PressableFeedback
          onPress={() => setAccountPickerVisible(true)}
          isDisabled={locked}
          className="bg-default gap-1 rounded-2xl px-3 py-3"
          accessibilityRole="button"
          accessibilityLabel={Strings.commitmentsFieldDefaultAccount}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-1">
            <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
              {Strings.commitmentsFieldDefaultAccount}
            </Text>
            <Text className="font-inter text-muted text-[10px]">{Strings.commitmentsOptional}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
            {selectedAccount ? (
              <>
                <MaterialCommunityIcons
                  name={TYPE_OPTIONS.find((o) => o.type === selectedAccount.type)?.icon ?? 'bank'}
                  size={ms(16)}
                  color={resolveAccountGlyphColor(selectedAccount.color)}
                />
                <Text className="font-sora-semibold text-foreground flex-1 text-[15px]">
                  {resolveAccountName(selectedAccount)}
                </Text>
              </>
            ) : (
              <Text className="font-inter text-muted flex-1 text-[15px]">
                {Strings.addTxPickAccountTitle}
              </Text>
            )}
            <MaterialCommunityIcons name="chevron-right" size={18} color={CoreTokens.text2} />
          </View>
        </PressableFeedback>

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
      </CommitmentFormScroll>

      <CategoryPickerSheet
        isOpen={categoryPickerVisible}
        title={Strings.addTxPickCategoryTitle}
        categories={expenseCategories}
        selectedId={categoryId}
        onSelect={selectCategory}
        onOpenChange={() => setCategoryPickerVisible(false)}
      />
      <AccountPickerSheet
        isOpen={accountPickerVisible}
        title={Strings.addTxPickAccountTitle}
        accounts={accounts}
        selectedId={accountId}
        onSelect={selectAccount}
        onOpenChange={() => setAccountPickerVisible(false)}
      />
    </CommitmentFormFrame>
  );
}
