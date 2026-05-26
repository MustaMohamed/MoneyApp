import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { Text } from 'heroui-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { StatusBadge } from '@/components/ui/status_badge';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens } from '@/constants/theme_tokens';
import type { Account } from '../../../../store/account.store';
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
    <HeroShell glowColor={color} style={{ marginTop: 8 }}>
      <View className="px-4 py-4">
        {/* Label + type chip row */}
        <View style={{ flexDirection: 'row' }} className="items-center justify-between">
          <Text className="text-foreground/70 tracking-wider uppercase font-inter text-[11px]">
            {Strings.accountDetailBalance}
          </Text>
          <StatusBadge
            label={TYPE_LABEL[account.type]}
            color={color}
            icon={TYPE_ICON[account.type]}
            size="sm"
          />
        </View>

        {/* Balance */}
        <Text
          numberOfLines={1}
          className={isCC ? 'text-danger mt-1 font-sora-bold text-[20px] tabular-nums' : 'text-accent mt-1 font-sora-bold text-[20px] tabular-nums'}
        >
          {formatAmount(account.current_balance)} {account.currency}
        </Text>

        {/* Context caption */}
        <Text
          className="text-foreground/55 mt-1 font-inter text-[11px]"
          style={caption.color ? { color: caption.color } : undefined}
        >
          {caption.text}
          {caption.adjusted ? ` · ${Strings.accountHeroAdjusted}` : ''}
        </Text>
      </View>
    </HeroShell>
  );
}
