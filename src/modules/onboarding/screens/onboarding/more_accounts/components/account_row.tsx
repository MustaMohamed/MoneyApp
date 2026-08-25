import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { AccountType } from '@/constants/enums';
import { Colors, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import type { Account } from '@/modules/accounts/store/account.store';
import { formatCurrencyParts } from '@/utils/format_amount';

import {
  N3_ACCOUNT_TYPE_LABELS,
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

/**
 * One list row — mockup.html:2020-2023, `.lrow`. Three fixed columns: a flat
 * colour dot, the name over its account type, and the amount over its
 * currency code.
 *
 * The row carries no fill of its own: `ListGroup`'s Surface paints `--surface`
 * for the whole group and the row sits transparent on top (§5.3). It also
 * carries no `entering` and no `index` — the list never animates (S6, N-3), so
 * it cannot know whether it is first, which is why the divider is the parent's
 * to draw.
 *
 * `accessible` + one label makes a screen reader announce the row as one thing
 * instead of four. No `accessibilityRole`: `ListGroup.Item` is a `Pressable`
 * with no `onPress` here and must not announce as a button.
 */
export function AccountRow({ account }: { account: Account }) {
  // Split into two nodes rather than routed through `formatCurrencyAmount`, which
  // concatenates them, because the mockup stacks value over code (`.am > .v` then `.c`,
  // mockup.html:626-628). Decimals still come from CURRENCY_CONFIG via `formatCurrencyParts`.
  const { value, code } = formatCurrencyParts(account.current_balance, account.currency);

  return (
    <ListGroup.Item
      style={N3_ROW_STYLE}
      accessible
      accessibilityLabel={resolveAccountRowA11yLabel(account)}
    >
      {/* Runtime hex — className is build-time only (.claude/rules/ui.md). */}
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

        {/* Not ListGroup.ItemDescription: its class is `color: var(--color-muted)`
            (2.36:1), which the scope spec rules out for anything a user must
            read, and a HeroText cannot host the leading glyph as a sibling. */}
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
            {N3_ACCOUNT_TYPE_LABELS[account.type]}
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
