import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Input, Spinner } from 'heroui-native';
import { View } from 'react-native';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { FormErrorText } from '@/components/ui/form_error_text';
import { SHEET_FOOTER_CLEARANCE, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

import { AmountHero } from './components/amount_hero';
import { DateRow } from './components/date_row';
import { FormPickerRow } from './components/form_picker_row';
import { TransactionExchangeRateRow } from './components/transaction_exchange_rate_row';
import { TypeTabs } from './components/type_tabs';
import type { TransactionFormMode } from './transaction_form.types';

interface Props {
  datePickerOwnerId: string;
  formMode: TransactionFormMode;
  locked: boolean;
  type: TransactionType;
  typeLabel: string;
  typeSupportingText: string;
  onSelectType: (t: TransactionType) => void;
  setAmountStr: (v: string) => void;
  amountError?: string;
  selectedAccount: Account | null;
  onOpenAccountPicker: () => void;
  accountError?: string;
  selectedToAccount: Account | null;
  onOpenToPicker: () => void;
  toAccountError?: string;
  selectedCategory: Category | null;
  onOpenCategoryPicker: () => void;
  categoryError?: string;
  showBudgetField: boolean;
  selectedBudget: Budget | null;
  budgetsLoading: boolean;
  budgetLookupError?: string;
  onOpenBudgetPicker: () => void;
  onRetryBudgetLookup: () => void;
  budgetError?: string;
  errorMessage?: string;
  /** The rate demand flag (either side USD), not the source currency. */
  requiresRate: boolean;
  exchangeRate: string;
  setExchangeRate: (v: string) => void;
  rateOverride: boolean;
  toggleRateOverride: () => void;
  rateUpdatedAt: string | null;
  rateError?: string;
  date: string;
  setDate: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  currency: Currency;
}

export const TRANSACTION_FORM_CONTENT_CONTAINER_STYLE = {
  padding: ms(16),
  paddingBottom: SHEET_FOOTER_CLEARANCE,
  gap: ms(8),
};

export const TRANSACTION_FORM_ERROR_SLOT_HEIGHT = ms(16);

interface ValidationSlotProps {
  testID: string;
  message?: string;
  centered?: boolean;
}

function ValidationSlot({ testID, message, centered = false }: ValidationSlotProps) {
  return (
    <View
      testID={testID}
      style={{ minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT }}
      className={centered ? 'justify-center px-4' : 'justify-center'}
      accessibilityLiveRegion="polite"
    >
      <FormErrorText
        message={message}
        numberOfLines={1}
        disableAnimation
        className={centered ? 'text-center' : undefined}
        style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
      />
    </View>
  );
}

export function TransactionFormBody(props: Props): React.ReactElement {
  const {
    datePickerOwnerId,
    formMode,
    locked,
    type,
    typeLabel,
    typeSupportingText,
    onSelectType,
    setAmountStr,
    amountError,
    selectedAccount,
    onOpenAccountPicker,
    accountError,
    selectedToAccount,
    onOpenToPicker,
    toAccountError,
    selectedCategory,
    onOpenCategoryPicker,
    categoryError,
    showBudgetField,
    selectedBudget,
    budgetsLoading,
    budgetLookupError,
    onOpenBudgetPicker,
    onRetryBudgetLookup,
    budgetError,
    errorMessage,
    requiresRate,
    exchangeRate,
    setExchangeRate,
    rateOverride,
    toggleRateOverride,
    rateUpdatedAt,
    rateError,
    date,
    setDate,
    note,
    setNote,
    currency,
  } = props;
  const { onFocus: onInputFocus, onBlur: onInputBlur } = useBottomSheetAwareHandlers();

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const budgetValueFontSize = budgetLookupError ? Type.caption : Type.body;

  return (
    <View style={{ flex: 1 }}>
      <TypeTabs
        active={type}
        incomeLabel={type === TransactionType.Income ? typeLabel : Strings.addTxTypeIncome}
        onSelect={onSelectType}
        isDisabled={locked}
      />
      <View className="border-separator min-h-8 justify-center border-b px-4 py-1.5">
        <Text
          className="font-inter text-muted"
          style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
          numberOfLines={1}
        >
          {typeSupportingText}
        </Text>
      </View>

      <AmountHero onChange={setAmountStr} type={type} currency={currency} mode={formMode} />
      <ValidationSlot testID="amount-error-slot" message={amountError} centered />

      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={TRANSACTION_FORM_CONTENT_CONTAINER_STYLE}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <FormPickerRow
            testID="from-account-row"
            onPress={locked ? undefined : onOpenAccountPicker}
            disabled={locked}
            label={isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            value={selectedAccount?.name ?? Strings.addTxPickAccountTitle}
            prefix={
              <MaterialCommunityIcons
                name={
                  selectedAccount
                    ? (TYPE_OPTIONS.find((option) => option.type === selectedAccount.type)?.icon ??
                      'bank')
                    : 'bank-outline'
                }
                size={Size.iconXs}
                color={selectedAccount?.color ?? CoreTokens.text2}
              />
            }
            suffix={
              <MaterialCommunityIcons
                name={locked ? 'lock-outline' : 'chevron-right'}
                size={Size.iconSm}
                color={CoreTokens.text2}
              />
            }
          />
          <ValidationSlot testID="account-error-slot" message={accountError} />
        </View>

        {isTransferOrCC ? (
          <>
            <View>
              <FormPickerRow
                testID="to-account-row"
                onPress={locked ? undefined : onOpenToPicker}
                disabled={locked}
                label={Strings.addTxToLabel}
                value={selectedToAccount?.name ?? Strings.addTxPickToTitle}
                prefix={
                  <MaterialCommunityIcons
                    name={
                      selectedToAccount
                        ? (TYPE_OPTIONS.find((option) => option.type === selectedToAccount.type)
                            ?.icon ?? 'bank')
                        : 'bank-outline'
                    }
                    size={Size.iconXs}
                    color={selectedToAccount?.color ?? CoreTokens.text2}
                  />
                }
                suffix={
                  <MaterialCommunityIcons
                    name={locked ? 'lock-outline' : 'chevron-right'}
                    size={Size.iconSm}
                    color={CoreTokens.text2}
                  />
                }
              />
              <ValidationSlot testID="to-account-error-slot" message={toAccountError} />
            </View>
          </>
        ) : null}

        {!isTransferOrCC ? (
          <>
            <View>
              <FormPickerRow
                testID="category-row"
                onPress={onOpenCategoryPicker}
                label={Strings.addTxCategoryLabel}
                value={selectedCategory?.name ?? Strings.addTxPickCategoryTitle}
                prefix={
                  <MaterialCommunityIcons
                    name={
                      selectedCategory ? toIconName(selectedCategory.icon, 'tag') : 'tag-outline'
                    }
                    size={Size.filterSegmentIcon}
                    color={selectedCategory?.color ?? CoreTokens.text1}
                  />
                }
                suffix={
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={Size.iconSm}
                    color={CoreTokens.text2}
                  />
                }
              />
              <ValidationSlot testID="category-error-slot" message={categoryError} />
            </View>
          </>
        ) : null}

        {showBudgetField ? (
          <>
            <View>
              <FormPickerRow
                testID="budget-row"
                onPress={
                  budgetsLoading
                    ? undefined
                    : budgetLookupError
                      ? onRetryBudgetLookup
                      : onOpenBudgetPicker
                }
                disabled={budgetsLoading}
                accessibilityLabel={
                  budgetLookupError ? Strings.addTxBudgetRetryA11y : Strings.addTxBudgetLabel
                }
                label={Strings.addTxBudgetLabel}
                value={
                  budgetsLoading
                    ? Strings.addTxBudgetLoading
                    : (budgetLookupError ?? selectedBudget?.name ?? Strings.addTxPickBudgetTitle)
                }
                valueClassName={
                  budgetLookupError ? 'font-inter-medium text-danger' : 'text-foreground'
                }
                valueStyle={{
                  fontSize: budgetValueFontSize,
                  lineHeight: lineHeightFor(budgetValueFontSize),
                }}
                prefix={
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={Size.filterSegmentIcon}
                    color={CoreTokens.text2}
                  />
                }
                suffix={
                  budgetsLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <MaterialCommunityIcons
                      name={budgetLookupError ? 'reload' : 'chevron-right'}
                      size={Size.iconSm}
                      color={CoreTokens.text2}
                    />
                  )
                }
              />
              <ValidationSlot
                testID="budget-error-slot"
                message={budgetLookupError ? undefined : budgetError}
              />
            </View>
          </>
        ) : null}

        {requiresRate ? (
          <TransactionExchangeRateRow
            value={exchangeRate}
            onChange={setExchangeRate}
            overrideEnabled={rateOverride}
            onToggleOverride={toggleRateOverride}
            rateUpdatedAt={rateUpdatedAt}
            mode={formMode}
            type={type}
            sourceCurrency={selectedAccount?.currency}
            destinationCurrency={selectedToAccount?.currency}
            error={rateError}
          />
        ) : null}

        <DateRow ownerId={datePickerOwnerId} value={date} onChange={setDate} />

        <View className="bg-default rounded-md px-3 py-3">
          <Text
            className="font-inter text-muted"
            style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
          >
            {Strings.addTxNoteLabel}
          </Text>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder={Strings.addTxNotePlaceholder}
            placeholderTextColor={CoreTokens.text2}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            variant="secondary"
            className="font-inter text-foreground min-h-8 rounded-none border-0 bg-transparent p-0"
            style={{ fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
          />
        </View>
        <ValidationSlot testID="form-error-slot" message={errorMessage} />
      </BottomSheetScrollView>
    </View>
  );
}
