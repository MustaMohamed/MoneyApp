// modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Input, PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

import { AmountHero } from './components/amount_hero';
import { DateRow } from './components/date_row';
import { ExchangeRateRow } from './components/exchange_rate_row';
import { TypeTabs } from './components/type_tabs';

interface Props {
  visible: boolean;
  locked: boolean;
  type: TransactionType;
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

export function TransactionFormBody(props: Props): React.ReactElement {
  const {
    visible,
    locked,
    type,
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
      <TypeTabs active={type} onSelect={onSelectType} isDisabled={locked} />

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
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* From account */}
        <PressableFeedback
          testID="from-account-row"
          onPress={locked ? undefined : onOpenAccountPicker}
          isDisabled={locked}
          className="bg-default rounded-md px-3 py-3"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-muted text-[11px]">
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
            size={18}
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-muted text-[11px]">{Strings.addTxToLabel}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
                size={18}
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
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
              <MaterialCommunityIcons name="chevron-right" size={18} color={CoreTokens.text2} />
            </PressableFeedback>
            {categoryError ? (
              <Text className="font-inter text-danger text-[11px]">{categoryError}</Text>
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

        <DateRow value={date} onChange={setDate} />

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
      </BottomSheetScrollView>
    </View>
  );
}
