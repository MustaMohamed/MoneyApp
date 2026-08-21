// modules/transactions/screens/transactions/detail/components/transfer_flow_card.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { formatCurrencyAmount } from '@/utils/format_amount';

import { getAccountTypeIcon } from '../detail.helpers';
import { DETAIL_TRANSFER_MIN_HEIGHT } from './detail_geometry';

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
      <Text
        className="font-inter-semibold text-foreground/55 tracking-wide uppercase"
        style={{ fontSize: Type.compactBadge }}
      >
        {label}
      </Text>
      <View className="bg-accent/15 mt-1.5 h-9 w-9 items-center justify-center rounded-lg">
        <MaterialCommunityIcons
          name={getAccountTypeIcon(account.type)}
          size={Size.iconXs}
          color={GoldTokens[500]}
        />
      </View>
      <Text
        className="font-inter-semibold text-foreground mt-1"
        style={{ fontSize: Type.detail }}
        numberOfLines={1}
      >
        {account.name}
      </Text>
      <Text
        className="font-sora-semibold text-foreground/85 mt-0.5"
        style={{ fontSize: Type.micro }}
        numberOfLines={1}
      >
        {signPrefix}
        {formatCurrencyAmount(amount, currency)}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <PressableFeedback
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={Strings.detailOpenAccountAccessibility(
          account.name,
          formatCurrencyAmount(amount, currency),
        )}
        className="flex-1"
      >
        {inner}
      </PressableFeedback>
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
    <Card
      className="border-accent/18 mx-4 mt-4 flex-row items-center gap-2 rounded-2xl border p-3.5"
      style={{ height: DETAIL_TRANSFER_MIN_HEIGHT, elevation: 0, shadowOpacity: 0 }}
    >
      <Cell
        label={Strings.detailFlowFromLabel}
        account={fromAccount}
        amount={fromAmount}
        currency={fromCurrency}
        signPrefix="−"
        onPress={onPressFrom}
      />
      <MaterialCommunityIcons name="arrow-right" size={Size.iconBack} color={GoldTokens[500]} />
      <Cell
        label={Strings.detailFlowToLabel}
        account={toAccount}
        amount={toAmount}
        currency={toCurrency}
        signPrefix="+"
        onPress={onPressTo}
      />
    </Card>
  );
}
