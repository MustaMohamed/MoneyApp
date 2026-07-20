// modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Input, PressableFeedback, Spinner } from 'heroui-native';
import { View } from 'react-native';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
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
import { ExchangeRateRow } from './components/exchange_rate_row';
import { TypeTabs } from './components/type_tabs';

interface Props {
  datePickerOwnerId: string;
  visible: boolean;
  locked: boolean;
  type: TransactionType;
  typeLabel: string;
  typeSupportingText: string;
  onSelectType: (t: TransactionType) => void;
  amountStr: string;
  setAmountStr: (v: string) => void;
  handleNumpad?: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
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

export function TransactionFormBody(props: Props): React.ReactElement {
  const {
    datePickerOwnerId,
    visible,
    locked,
    type,
    typeLabel,
    typeSupportingText,
    onSelectType,
    amountStr,
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

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const amountNum = parseFloat(amountStr) || 0;

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

      <AmountHero
        visible={visible}
        amountStr={amountStr}
        onChange={setAmountStr}
        type={type}
        currency={currency}
      />
      {amountError ? (
        <Text className="font-inter text-danger mt-1 text-center text-[11px]">{amountError}</Text>
      ) : null}

      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={TRANSACTION_FORM_CONTENT_CONTAINER_STYLE}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* From account */}
        <PressableFeedback
          testID="from-account-row"
          onPress={locked ? undefined : onOpenAccountPicker}
          isDisabled={locked}
          className="bg-default rounded-md px-3 py-3"
          style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}
        >
          <View style={{ flex: 1 }}>
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
              <Text className="font-sora text-foreground text-[15px] font-semibold">
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
        {accountError ? (
          <Text className="font-inter text-danger text-[11px]">{accountError}</Text>
        ) : null}

        {/* To account */}
        {isTransferOrCC ? (
          <>
            <PressableFeedback
              testID="to-account-row"
              onPress={locked ? undefined : onOpenToPicker}
              isDisabled={locked}
              className="bg-default rounded-md px-3 py-3"
              style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}
            >
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-muted text-[11px]">{Strings.addTxToLabel}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}>
                  {selectedToAccount ? (
                    <MaterialCommunityIcons
                      name={
                        TYPE_OPTIONS.find((o) => o.type === selectedToAccount.type)?.icon ?? 'bank'
                      }
                      size={ms(16)}
                      color={selectedToAccount.color ?? CoreTokens.text2}
                    />
                  ) : null}
                  <Text className="font-sora text-foreground text-[15px] font-semibold">
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
            {toAccountError ? (
              <Text className="font-inter text-danger text-[11px]">{toAccountError}</Text>
            ) : null}
          </>
        ) : null}

        {/* Category (expense/income only) */}
        {!isTransferOrCC ? (
          <>
            <PressableFeedback
              testID="category-row"
              onPress={onOpenCategoryPicker}
              className="bg-default rounded-md px-3 py-3"
              style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}
            >
              <View style={{ flex: 1 }}>
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
                  <Text className="font-sora text-foreground text-[15px] font-semibold">
                    {selectedCategory?.name ?? Strings.addTxPickCategoryTitle}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={CoreTokens.text2} />
            </PressableFeedback>
            {categoryError ? (
              <Text className="font-inter text-danger text-[11px]">{categoryError}</Text>
            ) : null}
          </>
        ) : null}

        {showBudgetField ? (
          <>
            <PressableFeedback
              testID="budget-row"
              onPress={budgetsLoading || budgetLookupError ? undefined : onOpenBudgetPicker}
              isDisabled={budgetsLoading || Boolean(budgetLookupError)}
              accessibilityLabel={Strings.addTxBudgetLabel}
              className="bg-default rounded-md px-3 py-2.5"
              style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}
            >
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-muted text-[11px]">
                  {Strings.addTxBudgetLabel}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(6) }}>
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={ms(15)}
                    color={CoreTokens.text2}
                  />
                  <Text className="font-sora text-foreground text-[14px] font-semibold">
                    {budgetsLoading
                      ? Strings.addTxBudgetLoading
                      : (selectedBudget?.name ?? Strings.addTxPickBudgetTitle)}
                  </Text>
                </View>
              </View>
              {budgetsLoading ? (
                <Spinner size="sm" />
              ) : (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={ms(18)}
                  color={CoreTokens.text2}
                />
              )}
            </PressableFeedback>
            {budgetError ? (
              <View className="min-h-11 flex-row items-center justify-between gap-2">
                <Text className="font-inter text-danger flex-1 text-[11px]">{budgetError}</Text>
                {budgetLookupError ? (
                  <PressableFeedback
                    onPress={onRetryBudgetLookup}
                    accessibilityRole="button"
                    accessibilityLabel={Strings.addTxBudgetRetryA11y}
                    className="min-h-11 justify-center px-2"
                  >
                    <Text className="font-inter text-accent text-[12px] font-semibold">
                      {Strings.budgetLoadRetry}
                    </Text>
                  </PressableFeedback>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {isUSD ? (
          <ExchangeRateRow
            value={exchangeRate}
            onChange={setExchangeRate}
            overrideEnabled={rateOverride}
            onToggleOverride={toggleRateOverride}
            rateUpdatedAt={rateUpdatedAt}
            amount={amountNum}
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
            className="font-inter text-foreground p-0 text-[14px]"
          />
        </View>
        {errorMessage ? (
          <Text className="font-inter text-danger text-[11px] font-medium">{errorMessage}</Text>
        ) : null}
      </BottomSheetScrollView>
    </View>
  );
}
