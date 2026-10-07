import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { resolveAccountName } from '@/utils/account_name';

import { getAccountTypeIcon, type TransferCellText } from '../detail.helpers';
import {
  DETAIL_TRANSFER_AMOUNT_FONT_SIZE,
  DETAIL_TRANSFER_LABEL_FONT_SIZE,
  DETAIL_TRANSFER_NAME_FONT_SIZE,
  resolveTransferCardHeight,
} from './detail.geometry';

interface Props {
  fromAccount: Account;
  toAccount: Account;
  fromAmountText: TransferCellText;
  toAmountText: TransferCellText;
  onPressFrom?: () => void;
  onPressTo?: () => void;
}

function Cell({
  label,
  account,
  amountText,
  onPress,
}: {
  label: string;
  account: Account;
  amountText: TransferCellText;
  onPress?: () => void;
}): React.ReactElement {
  const { display, accessible } = amountText;
  const { fontScale } = useWindowDimensions();
  const accountName = resolveAccountName(account);
  const inner = (
    <View className="flex-1 items-center">
      <Text
        className="font-inter-semibold text-foreground/55 tracking-wide uppercase"
        allowFontScaling={false}
        style={scaledTextStyle(DETAIL_TRANSFER_LABEL_FONT_SIZE, fontScale)}
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
        allowFontScaling={false}
        style={scaledTextStyle(DETAIL_TRANSFER_NAME_FONT_SIZE, fontScale)}
        numberOfLines={1}
      >
        {accountName}
      </Text>
      <Text
        className="font-sora-semibold text-foreground/85 mt-0.5"
        allowFontScaling={false}
        style={scaledTextStyle(DETAIL_TRANSFER_AMOUNT_FONT_SIZE, fontScale)}
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
        accessibilityLabel={Strings.detailOpenAccountAccessibility(accountName, accessible)}
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
  fromAmountText,
  toAmountText,
  onPressFrom,
  onPressTo,
}: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <Card
      className="border-accent/18 mx-4 mt-4 flex-row items-center gap-2 rounded-2xl border p-3.5"
      style={{ height: resolveTransferCardHeight(fontScale), boxShadow: 'none' }}
    >
      <Cell
        label={Strings.detailFlowFromLabel}
        account={fromAccount}
        amountText={fromAmountText}
        onPress={onPressFrom}
      />
      <MaterialCommunityIcons name="arrow-right" size={Size.iconBack} color={GoldTokens[500]} />
      <Cell
        label={Strings.detailFlowToLabel}
        account={toAccount}
        amountText={toAmountText}
        onPress={onPressTo}
      />
    </Card>
  );
}
