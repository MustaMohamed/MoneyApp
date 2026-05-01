import { ScrollView, StyleSheet, View } from 'react-native';

import { AccountType } from '@/constants/enums';
import { Spacing } from '@/constants/theme';
import type { Account } from '@/store/account.store';
import { AccountCard } from './account_card';
import { AddCard } from './add_card';

interface AccountCarouselProps {
  type: AccountType;
  accounts: Account[];
  rate: number;
  onAccountPress: (id: string) => void;
  onAddPress: () => void;
}

export function AccountCarousel({
  type,
  accounts,
  rate,
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
          onPress={() => onAccountPress(account.id)}
        />
      ))}
      <AddCard type={type} onPress={onAddPress} />
      <View style={styles.tail} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingLeft: Spacing.sm, alignItems: 'flex-start', paddingVertical: Spacing.xs },
  tail: { width: Spacing.sm },
});
