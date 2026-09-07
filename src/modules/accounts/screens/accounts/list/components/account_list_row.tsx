import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup, Typography } from 'heroui-native';
import { View } from 'react-native';

import { ACCOUNT_TYPE_ICONS } from '@/constants/account_type_icons';
import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { formatCurrencyParts } from '@/utils/format_amount';

import { resolveAccountBalanceColorClass } from '../../../../constants/account_balance_color';
import { resolveAccountRowA11yLabel } from '../../../../constants/account_row_a11y_label';
import { resolveAccountTileColors } from '../../../../constants/account_tile_color';
import type { Account } from '../../../../entities/account.entity';
import { ACCOUNTS_LIST_ROW_STYLE } from '../accounts_list.geometry';

interface AccountListRowProps {
  account: Account;
  onPress: (id: string) => void;
}

export function AccountListRow({ account, onPress }: AccountListRowProps) {
  // Two nodes, not `formatCurrencyAmount`: B1 stacks the value over the code.
  const { value, code } = formatCurrencyParts(account.current_balance, account.currency);
  const tile = resolveAccountTileColors(account.color);

  return (
    <ListGroup.Item
      onPress={() => onPress(account.id)}
      style={ACCOUNTS_LIST_ROW_STYLE}
      accessibilityRole="button"
      accessibilityLabel={resolveAccountRowA11yLabel(account)}
    >
      {/* Runtime hex: className is build-time only. */}
      <ListGroup.ItemPrefix
        style={{
          width: Size.accountTile,
          height: Size.accountTile,
          borderRadius: Radius.sm,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tile.background,
        }}
      >
        <MaterialCommunityIcons
          name={ACCOUNT_TYPE_ICONS[account.type]}
          size={Size.iconXs}
          color={tile.glyph}
        />
      </ListGroup.ItemPrefix>

      <ListGroup.ItemContent style={{ flex: 1, minWidth: 0 }}>
        <ListGroup.ItemTitle
          className="text-foreground font-inter-medium"
          style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {account.name}
        </ListGroup.ItemTitle>

        {/* Not ItemDescription: its muted colour is 2.36:1. */}
        <Typography
          className="text-content-secondary font-inter"
          style={{
            fontSize: Type.caption,
            lineHeight: lineHeightFor(Type.caption),
            marginTop: Spacing.xxxs,
          }}
        >
          {ACCOUNT_TYPE_LABELS[account.type]}
        </Typography>
      </ListGroup.ItemContent>

      {/* Passing children replaces the slot's default chevron outright. */}
      <ListGroup.ItemSuffix style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Typography
          className={`${resolveAccountBalanceColorClass(account.type)} font-sora tabular-nums`}
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

      {/* Empty by design: MA-016 puts the reorder grip here. */}
      <View style={{ width: Size.reorderGripSlot }} />
    </ListGroup.Item>
  );
}
