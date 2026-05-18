import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useEffect } from 'react';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';

import { AmountHero } from './components/amount_hero';
import { DateRow } from './components/date_row';
import { ExchangeRateRow } from './components/exchange_rate_row';
import { Numpad } from './components/numpad';
import { TypeTabs } from './components/type_tabs';
import { useTransactionFormBodyState } from './transaction_form_body.state';

interface Props {
  locked: boolean;
  type: TransactionType;
  onSelectType: (t: TransactionType) => void;
  amountStr: string;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
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
    locked,
    type,
    onSelectType,
    amountStr,
    handleNumpad,
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

  const {
    state: bodyState,
    setKeyboardVisible,
    reset,
  } = useTransactionFormBodyState(
    useShallow((s) => ({
      state: s.state,
      setKeyboardVisible: s.setKeyboardVisible,
      reset: s.reset,
    })),
  );

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
      reset();
    };
  }, []);

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const amountNum = parseFloat(amountStr) || 0;

  return (
    <View style={{ flex: 1 }}>
      <TypeTabs active={type} onSelect={onSelectType} disabled={locked} />

      <AmountHero amountStr={amountStr} type={type} currency={currency} />
      {amountError ? (
        <Text className="font-inter text-[11px] text-danger text-center mt-1">{amountError}</Text>
      ) : null}

      <BottomSheetScrollView
        contentContainerStyle={{ padding: 16, gap: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* From account */}
        <Pressable
          testID="from-account-row"
          onPress={locked ? undefined : onOpenAccountPicker}
          disabled={locked}
          className="rounded-md bg-default px-3 py-3"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-[11px] text-muted">
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {selectedAccount ? (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: selectedAccount.color ?? CoreTokens.border,
                  }}
                />
              ) : null}
              <Text className="font-sora font-semibold text-[15px] text-foreground">
                {selectedAccount?.name ?? Strings.addTxPickAccountTitle}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name={locked ? 'lock-outline' : 'chevron-right'}
            size={18}
            color={CoreTokens.text2}
          />
        </Pressable>
        {accountError ? (
          <Text className="font-inter text-[11px] text-danger">{accountError}</Text>
        ) : null}

        {/* To account */}
        {isTransferOrCC ? (
          <>
            <Pressable
              testID="to-account-row"
              onPress={locked ? undefined : onOpenToPicker}
              disabled={locked}
              className="rounded-md bg-default px-3 py-3"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-[11px] text-muted">{Strings.addTxToLabel}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {selectedToAccount ? (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: selectedToAccount.color ?? CoreTokens.border,
                      }}
                    />
                  ) : null}
                  <Text className="font-sora font-semibold text-[15px] text-foreground">
                    {selectedToAccount?.name ?? Strings.addTxPickToTitle}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={locked ? 'lock-outline' : 'chevron-right'}
                size={18}
                color={CoreTokens.text2}
              />
            </Pressable>
            {toAccountError ? (
              <Text className="font-inter text-[11px] text-danger">{toAccountError}</Text>
            ) : null}
          </>
        ) : null}

        {/* Category (expense/income only) */}
        {!isTransferOrCC ? (
          <>
            <Pressable
              testID="category-row"
              onPress={onOpenCategoryPicker}
              className="rounded-md bg-default px-3 py-3"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-[11px] text-muted">
                  {Strings.addTxCategoryLabel}
                </Text>
                <Text className="font-sora font-semibold text-[15px] text-foreground">
                  {selectedCategory?.name ?? Strings.addTxPickCategoryTitle}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={CoreTokens.text2} />
            </Pressable>
            {categoryError ? (
              <Text className="font-inter text-[11px] text-danger">{categoryError}</Text>
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
        <View className="rounded-md bg-default px-3 py-3">
          <Text className="font-inter text-[11px] text-muted">{Strings.addTxNoteLabel}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={Strings.addTxNotePlaceholder}
            placeholderTextColor={CoreTokens.text2}
            className="font-inter text-[14px] text-foreground p-0"
          />
        </View>
      </BottomSheetScrollView>

      {!bodyState.keyboardVisible ? <Numpad onPress={handleNumpad} /> : null}
    </View>
  );
}
