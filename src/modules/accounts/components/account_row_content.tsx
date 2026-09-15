import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { resolveAccountName } from '@/utils/account_name';
import { formatCurrencyAmount } from '@/utils/format_amount';

import type { Account } from '../entities/account.entity';
import { AccountColorTile } from './account_color_tile';

const nameStyle = { fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) };
const balanceStyle = { fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) };

// The caller owns the row's pressable and its trailing control; this is the tile, name and balance between them.
export function AccountRowContent({ account }: { account: Account }) {
  return (
    <>
      <AccountColorTile
        color={account.color}
        type={account.type}
        size={Size.accountTile}
        glyphSize={Size.iconXs}
      />
      <View style={{ flex: 1 }}>
        <Text className="font-sora-semibold text-foreground" style={nameStyle} numberOfLines={1}>
          {resolveAccountName(account)}
        </Text>
        <Text className="font-inter text-muted" style={balanceStyle}>
          {formatCurrencyAmount(account.current_balance, account.currency)}
        </Text>
      </View>
    </>
  );
}
