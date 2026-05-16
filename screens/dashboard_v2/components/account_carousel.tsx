import React from 'react';
import { ScrollView } from 'react-native';

import { AccountType } from '@/constants/enums';
import { ms } from '@/utils/responsive';
import type { AccountStats } from '@/database/account_stats';
import type { Account } from '@/store/account.store';
import { AccountCard } from './account_card';
import { AddCard } from './add_card';

interface AccountCarouselProps {
  type: AccountType;
  accounts: Account[];
  rate: number;
  statsMap: Record<string, AccountStats>;
  onAccountPress: (id: string) => void;
  onAddPress: () => void;
}

export function AccountCarousel({
  accounts,
  rate,
  statsMap,
  onAccountPress,
  onAddPress,
}: AccountCarouselProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: ms(16),
        paddingVertical: ms(4),
        gap: ms(8),
        alignItems: 'stretch',
      }}
    >
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          rate={rate}
          stats={statsMap[account.id]}
          onPress={() => onAccountPress(account.id)}
        />
      ))}
      <AddCard onPress={onAddPress} />
    </ScrollView>
  );
}
