import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Currency } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';

interface Props {
  fromAccount: Account;
  toAccount: Account;
  fromAmount: number;
  fromCurrency: Currency;
  toAmount: number;
  toCurrency: Currency;
  onPressFrom?: () => void;
  onPressTo?: () => void;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

function Cell({
  label,
  account,
  amount,
  currency,
  signPrefix,
  onPress,
}: {
  label: string;
  account: Account;
  amount: number;
  currency: Currency;
  signPrefix: '+' | '−';
  onPress?: () => void;
}): React.ReactElement {
  const inner = (
    <View className="flex-1 items-center">
      <Text className="font-inter font-semibold text-[9.5px] uppercase tracking-wide text-foreground/55">
        {label}
      </Text>
      <View className="w-9 h-9 rounded-lg bg-accent/15 items-center justify-center mt-1.5">
        <MaterialCommunityIcons name="bank" size={16} color="#D4AF37" />
      </View>
      <Text className="font-inter font-semibold text-[11.5px] text-foreground mt-1">
        {account.name}
      </Text>
      <Text className="font-sora font-semibold text-[11px] text-foreground/85 mt-0.5">
        {signPrefix}{numberFmt.format(amount)} {currency}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${account.name}, open account detail`}
        className="flex-1"
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export function TransferFlowCard({
  fromAccount,
  toAccount,
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  onPressFrom,
  onPressTo,
}: Props): React.ReactElement {
  return (
    <View className="mt-4 mx-4 p-3.5 rounded-2xl bg-surface border border-accent/18 flex-row items-center gap-2">
      <Cell
        label={Strings.detailFlowFromLabel}
        account={fromAccount}
        amount={fromAmount}
        currency={fromCurrency}
        signPrefix="−"
        onPress={onPressFrom}
      />
      <MaterialCommunityIcons name="arrow-right" size={20} color="#D4AF37" />
      <Cell
        label={Strings.detailFlowToLabel}
        account={toAccount}
        amount={toAmount}
        currency={toCurrency}
        signPrefix="+"
        onPress={onPressTo}
      />
    </View>
  );
}
