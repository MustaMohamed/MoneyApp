// modules/transactions/screens/transactions/detail/components/transfer_flow_card.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { formatDisplayMagnitude } from '@/utils/format_amount';

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

/**
 * A transfer cell composes its own sign (`signPrefix`, direction-of-flow — not the
 * domain value's sign) beside a positive magnitude, the same shape as
 * `transactions.helpers.ts`'s `formatSignedAmount` and `detail.helpers.ts`'s
 * `signedAmount`. It shares their composed-sign population and their fix: route the
 * magnitude through `formatDisplayMagnitude` so a rounded-away amount (e.g. 0.40 EGP
 * at EGP's 0dp display precision) never prints a sign beside a magnitude that reads
 * "0" — and, per the same rule's other branch, an exact-zero magnitude carries no
 * sign at all. See docs/adr/2026-08-21-currency-aware-display-decimals.md §2.1.
 *
 * Exported so the composition can be asserted directly — this is the text the cell
 * actually renders, not a parallel field the component can silently stop reading.
 */
export function transferCellAmountText(
  amount: number,
  currency: Currency,
  signPrefix: '+' | '−',
): { display: string; accessible: string } {
  const { text, printsAsZero } = formatDisplayMagnitude(amount, currency);
  const accessible = `${text} ${CURRENCY_CONFIG[currency].code}`;
  return { display: printsAsZero ? accessible : `${signPrefix}${accessible}`, accessible };
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
  const { display, accessible } = transferCellAmountText(amount, currency, signPrefix);
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
        {display}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <PressableFeedback
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={Strings.detailOpenAccountAccessibility(account.name, accessible)}
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
