import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens } from '@/constants/theme_tokens';
import type { Account } from '@/store/account.store';
import { formatAmount } from '@/utils/format_amount';

import { buildHeroCaption } from './balance_hero.helpers';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_LABEL: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};

const TYPE_ICON: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

interface BalanceHeroProps {
  account: Account;
}

export function BalanceHero({ account }: BalanceHeroProps) {
  const color = account.color ?? AcctTokens.midnight.rich;
  const isCC = account.type === AccountType.CreditCard;
  const caption = buildHeroCaption(account);

  return (
    <Box className="bg-surface border-border mx-4 mt-2 overflow-hidden rounded-2xl border">
      {/* Account-color accent bar — runtime hex (only allowed inline color) */}
      <View style={{ height: 4, width: '100%', backgroundColor: color }} />

      <Box className="px-4 py-4">
        {/* Label + type chip row */}
        <Box style={{ flexDirection: 'row' }} className="items-center justify-between">
          <Text variant="caption" className="text-muted tracking-wider uppercase">
            {Strings.accountDetailBalance}
          </Text>
          <Box
            style={{ flexDirection: 'row', backgroundColor: color + '22' }}
            className="border-border items-center gap-1 rounded-full border px-2 py-0.5"
          >
            <MaterialCommunityIcons name={TYPE_ICON[account.type]} size={12} color={color} />
            <Text variant="caption" className="text-muted font-semibold">
              {TYPE_LABEL[account.type]}
            </Text>
          </Box>
        </Box>

        {/* Balance */}
        <Text
          variant="numMd"
          numberOfLines={1}
          className={isCC ? 'text-danger mt-1' : 'text-accent mt-1'}
        >
          {formatAmount(account.current_balance)} {account.currency}
        </Text>

        {/* Context caption */}
        <Text
          variant="caption"
          className="mt-1"
          style={caption.color ? { color: caption.color } : undefined}
        >
          {caption.text}
          {caption.adjusted ? ` · ${Strings.accountHeroAdjusted}` : ''}
        </Text>
      </Box>
    </Box>
  );
}
