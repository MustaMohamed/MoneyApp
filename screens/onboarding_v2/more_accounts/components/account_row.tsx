import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import Animated, { type EntryOrExitLayoutType } from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { Account } from '@/store/account.store';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_ICONS: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

const TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};

export function AccountRowV2({
  account,
  index: _index,
  entering,
}: {
  account: Account;
  index: number;
  entering: EntryOrExitLayoutType | undefined;
}) {
  const icon = TYPE_ICONS[account.type];
  const typeLabel = `${TYPE_LABELS[account.type]} · ${account.currency}`;
  const formattedBalance = new Intl.NumberFormat('en-US').format(account.opening_balance);
  const isCC = account.type === AccountType.CreditCard;

  return (
    <Animated.View entering={entering}>
      <Box
        style={{ flexDirection: 'row' }}
        className="bg-surface border-border items-center gap-3 rounded-[8px] border px-3 py-3"
      >
        {/* Icon container — runtime hex from account.color; inline style is the only correct approach */}
        <Box
          className="border-border h-10 w-10 items-center justify-center rounded-[8px] border"
          style={{ backgroundColor: account.color ?? undefined }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={CoreTokens.text1} />
        </Box>

        <Box style={{ flex: 1 }} className="gap-0.5">
          <Text variant="body" className="font-soraBold text-foreground" numberOfLines={1}>
            {account.name}
          </Text>
          <Text variant="caption" className="text-muted">
            {typeLabel}
          </Text>
        </Box>

        <Text
          variant="body"
          className="font-soraBold"
          style={{ color: isCC ? SemanticTokens.negative : SemanticTokens.positive }}
        >
          {formattedBalance}
        </Text>
      </Box>
    </Animated.View>
  );
}
