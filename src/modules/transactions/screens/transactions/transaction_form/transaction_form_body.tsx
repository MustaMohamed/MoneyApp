// modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Input, PressableFeedback, Spinner } from 'heroui-native';
import { View } from 'react-native';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { FormErrorText } from '@/components/ui/form_error_text';
import { SHEET_FOOTER_CLEARANCE, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

import { AmountHero } from './components/amount_hero';
import { DateRow } from './components/date_row';
import { TransactionExchangeRateRow } from './components/transaction_exchange_rate_row';
import { TypeTabs } from './components/type_tabs';
import type { TransactionFormMode } from './transaction_form_host.state';

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
  isUSD: boolean;
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
        className={centered ? 'text-center text-[11px]' : 'text-[11px]'}
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
    isUSD,
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

  return (
    <View style={{ flex: 1 }}>
      <TypeTabs
        active={type}
        incomeLabel={type === TransactionType.Income ? typeLabel : Strings.addTxTypeIncome}
        onSelect={onSelectType}
        isDisabled={locked}
      />
      <View className="border-separator min-h-8 justify-center border-b px-4 py-1.5">
        <Text className="font-inter text-muted text-[11px]" numberOfLines={1}>
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
        {/* From account */}
        <View>
          <PressableFeedback
            testID="from-account-row"
            onPress={locked ? undefined : onOpenAccountPicker}
            isDisabled={locked}
            className="bg-default rounded-md px-3 py-3"
            style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text className="font-inter text-muted text-[11px]">
                {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}>
                {selectedAccount ? (
                  <MaterialCommunityIcons
                    name={TYPE_OPTIONS.find((o) => o.type === selectedAccount.type)?.icon ?? 'bank'}
                    size={ms(16)}
                    color={selectedAccount.color ?? CoreTokens.text2}
                  />
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, minWidth: 0 }}
                  className="font-sora text-foreground text-[15px] font-semibold"
                >
                  {selectedAccount?.name ?? Strings.addTxPickAccountTitle}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name={locked ? 'lock-outline' : 'chevron-right'}
              size={ms(18)}
              color={CoreTokens.text2}
            />
          </PressableFeedback>
          <ValidationSlot testID="account-error-slot" message={accountError} />
        </View>

        {/* To account */}
        {isTransferOrCC ? (
          <>
            <View>
              <PressableFeedback
                testID="to-account-row"
                onPress={locked ? undefined : onOpenToPicker}
                isDisabled={locked}
                className="bg-default rounded-md px-3 py-3"
                style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text className="font-inter text-muted text-[11px]">{Strings.addTxToLabel}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}>
                    {selectedToAccount ? (
                      <MaterialCommunityIcons
                        name={
                          TYPE_OPTIONS.find((o) => o.type === selectedToAccount.type)?.icon ??
                          'bank'
                        }
                        size={ms(16)}
                        color={selectedToAccount.color ?? CoreTokens.text2}
                      />
                    ) : null}
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, minWidth: 0 }}
                      className="font-sora text-foreground text-[15px] font-semibold"
                    >
                      {selectedToAccount?.name ?? Strings.addTxPickToTitle}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name={locked ? 'lock-outline' : 'chevron-right'}
                  size={ms(18)}
                  color={CoreTokens.text2}
                />
              </PressableFeedback>
              <ValidationSlot testID="to-account-error-slot" message={toAccountError} />
            </View>
          </>
        ) : null}

        {/* Category (expense/income only) */}
        {!isTransferOrCC ? (
          <>
            <View>
              <PressableFeedback
                testID="category-row"
                onPress={onOpenCategoryPicker}
                className="bg-default rounded-md px-3 py-3"
                style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text className="font-inter text-muted text-[11px]">
                    {Strings.addTxCategoryLabel}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(6) }}>
                    {selectedCategory ? (
                      <MaterialCommunityIcons
                        name={toIconName(selectedCategory.icon, 'tag')}
                        size={ms(15)}
                        // oxlint-disable-next-line typescript/no-unnecessary-condition -- category color can be null despite the string type
                        color={selectedCategory.color ?? CoreTokens.text1}
                      />
                    ) : null}
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, minWidth: 0 }}
                      className="font-sora text-foreground text-[15px] font-semibold"
                    >
                      {selectedCategory?.name ?? Strings.addTxPickCategoryTitle}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={ms(18)}
                  color={CoreTokens.text2}
                />
              </PressableFeedback>
              <ValidationSlot testID="category-error-slot" message={categoryError} />
            </View>
          </>
        ) : null}

        {showBudgetField ? (
          <>
            <View>
              <PressableFeedback
                testID="budget-row"
                onPress={
                  budgetsLoading
                    ? undefined
                    : budgetLookupError
                      ? onRetryBudgetLookup
                      : onOpenBudgetPicker
                }
                isDisabled={budgetsLoading}
                accessibilityLabel={
                  budgetLookupError ? Strings.addTxBudgetRetryA11y : Strings.addTxBudgetLabel
                }
                accessibilityHint={budgetLookupError}
                className="bg-default rounded-md px-3 py-2.5"
                style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text className="font-inter text-muted text-[11px]">
                    {Strings.addTxBudgetLabel}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(6) }}>
                    <MaterialCommunityIcons
                      name="wallet-outline"
                      size={ms(15)}
                      color={CoreTokens.text2}
                    />
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, minWidth: 0 }}
                      className={
                        budgetLookupError
                          ? 'font-inter text-danger text-[12px] font-medium'
                          : 'font-sora text-foreground text-[14px] font-semibold'
                      }
                    >
                      {budgetsLoading
                        ? Strings.addTxBudgetLoading
                        : (budgetLookupError ??
                          selectedBudget?.name ??
                          Strings.addTxPickBudgetTitle)}
                    </Text>
                  </View>
                </View>
                {budgetsLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <MaterialCommunityIcons
                    name={budgetLookupError ? 'reload' : 'chevron-right'}
                    size={ms(18)}
                    color={CoreTokens.text2}
                  />
                )}
              </PressableFeedback>
              <ValidationSlot
                testID="budget-error-slot"
                message={budgetLookupError ? undefined : budgetError}
              />
            </View>
          </>
        ) : null}

        {isUSD ? (
          <TransactionExchangeRateRow
            value={exchangeRate}
            onChange={setExchangeRate}
            overrideEnabled={rateOverride}
            onToggleOverride={toggleRateOverride}
            rateUpdatedAt={rateUpdatedAt}
            mode={formMode}
            error={rateError}
          />
        ) : null}

        <DateRow ownerId={datePickerOwnerId} value={date} onChange={setDate} />

        {/* Note */}
        <View className="bg-default rounded-md px-3 py-3">
          <Text className="font-inter text-muted text-[11px]">{Strings.addTxNoteLabel}</Text>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder={Strings.addTxNotePlaceholder}
            placeholderTextColor={CoreTokens.text2}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            variant="secondary"
            className="font-inter text-foreground min-h-8 rounded-none border-0 bg-transparent p-0 text-[14px]"
          />
        </View>
        <ValidationSlot testID="form-error-slot" message={errorMessage} />
      </BottomSheetScrollView>
    </View>
  );
}
