import { ScrollView, StyleSheet, View } from 'react-native';

import { AccountType } from '@/constants/enums';
import { Spacing } from '@/constants/theme';
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
  type,
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
      contentContainerStyle={styles.content}
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
      <AddCard type={type} onPress={onAddPress} />
      <View style={styles.tail} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingLeft: Spacing.sm, alignItems: 'stretch', paddingVertical: Spacing.xs },
  tail: { width: Spacing.sm },
});
