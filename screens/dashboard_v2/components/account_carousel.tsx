import React from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';

import { AccountType } from '@/constants/enums';
import { ms } from '@/utils/responsive';
import type { AccountStats } from '@/database/account_stats';
import type { Account } from '@/store/account.store';
import { AccountCard } from './account_card';
import { AddCard } from './add_card';

// Cards take 70% of screen width so one card dominates the viewport and the
// next card peeks at the edge — invites horizontal scroll without losing focus.
const CARD_WIDTH_RATIO = 0.7;

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
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * CARD_WIDTH_RATIO;

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
          width={cardWidth}
          onPress={() => onAccountPress(account.id)}
        />
      ))}
      <AddCard onPress={onAddPress} width={cardWidth} />
    </ScrollView>
  );
}
