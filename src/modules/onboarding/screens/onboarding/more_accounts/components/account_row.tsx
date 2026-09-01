import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { AccountType } from '@/constants/enums';
import { Colors, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import type { Account } from '@/modules/accounts/store/account.store';
import { formatCurrencyParts } from '@/utils/format_amount';

import {
  N3_ROW_STYLE,
  N3_ROW_TYPE_GAP,
  N3_ROW_TYPE_GLYPH,
  resolveAccountRowA11yLabel,
  resolveAccountRowDotColor,
} from '../more_accounts.geometry';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_ICONS: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

/** `accessible` announces the row once; no `accessibilityRole`, it is not pressable here. */
export function AccountRow({ account }: { account: Account }) {
  // Two nodes, not `formatCurrencyAmount`: the design stacks the value over the code.
  const { value, code } = formatCurrencyParts(account.current_balance, account.currency);

  return (
    <ListGroup.Item
      style={N3_ROW_STYLE}
      accessible
      accessibilityLabel={resolveAccountRowA11yLabel(account)}
    >
      {/* Runtime hex: className is build-time only. */}
      <ListGroup.ItemPrefix
        style={{
          width: Size.colorDot,
          height: Size.colorDot,
          borderRadius: Size.colorDot / 2,
          flexShrink: 0,
          backgroundColor: resolveAccountRowDotColor(account.color),
        }}
      />

      <ListGroup.ItemContent style={{ flex: 1, minWidth: 0 }}>
        <ListGroup.ItemTitle
          className="text-foreground font-inter-medium"
          style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {account.name}
        </ListGroup.ItemTitle>

        {/* Not ItemDescription: its muted colour is 2.36:1 and cannot host the glyph sibling. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: N3_ROW_TYPE_GAP,
            marginTop: Spacing.xxxs,
          }}
        >
          <MaterialCommunityIcons
            name={TYPE_ICONS[account.type]}
            size={N3_ROW_TYPE_GLYPH}
            color={Colors.dark.text2}
          />
          <Typography
            className="text-content-secondary font-inter"
            style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
          >
            {ACCOUNT_TYPE_LABELS[account.type]}
          </Typography>
        </View>
      </ListGroup.ItemContent>

      {/* Passing children replaces the slot's default chevron outright. */}
      <ListGroup.ItemSuffix style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Typography
          className="text-foreground font-sora tabular-nums"
          style={{
            fontSize: Type.bodyStrong,
            lineHeight: lineHeightFor(Type.bodyStrong),
            textAlign: 'right',
          }}
        >
          {value}
        </Typography>
        <Typography
          className="text-content-secondary font-inter"
          style={{
            fontSize: Type.micro,
            lineHeight: lineHeightFor(Type.micro),
            marginTop: Spacing.xxxs,
            textAlign: 'right',
          }}
        >
          {code}
        </Typography>
      </ListGroup.ItemSuffix>
    </ListGroup.Item>
  );
}
