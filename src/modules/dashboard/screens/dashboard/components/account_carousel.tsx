import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  View,
  type ListRenderItem,
  useWindowDimensions,
} from 'react-native';

import { AccountType } from '@/constants/enums';
import { Spacing } from '@/constants/theme';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import type { Account } from '@/modules/accounts/entities/account.entity';

import { AccountCard } from './account_card';
import { AddCard } from './add_card';

// Cards take 55% of screen width so one card dominates the viewport and the
// next card peeks at the edge — invites horizontal scroll without losing focus.
const CARD_WIDTH_RATIO = 0.55;

export type AccountCarouselItem =
  | { kind: 'account'; account: Account }
  | { kind: 'add'; accountType: AccountType };

export const ACCOUNT_CAROUSEL_VIRTUALIZATION_THRESHOLD = 8;

export function shouldVirtualizeAccountCarousel(accountCount: number): boolean {
  return accountCount >= ACCOUNT_CAROUSEL_VIRTUALIZATION_THRESHOLD;
}

export function buildAccountCarouselItems(
  accountType: AccountType,
  accounts: Account[],
): AccountCarouselItem[] {
  return [
    ...accounts.map((account) => ({ kind: 'account', account }) as const),
    { kind: 'add', accountType },
  ];
}

export function getAccountCarouselItemKey(item: AccountCarouselItem): string {
  return item.kind === 'account' ? `account:${item.account.id}` : `add:${item.accountType}`;
}

export function getAccountCarouselItemLayout(cardWidth: number, index: number) {
  const length = cardWidth + Spacing.xxs + Spacing.xs;
  return { index, length, offset: length * index };
}

function AccountCarouselSeparator(): React.ReactElement {
  return <View style={{ width: Spacing.xs }} />;
}

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
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * CARD_WIDTH_RATIO;
  const items = useMemo(() => buildAccountCarouselItems(type, accounts), [accounts, type]);
  const accountPressHandlers = useMemo(
    () =>
      new Map(
        accounts.map((account) => [
          account.id,
          () => {
            onAccountPress(account.id);
          },
        ]),
      ),
    [accounts, onAccountPress],
  );
  const renderItem = useCallback<ListRenderItem<AccountCarouselItem>>(
    ({ item }) =>
      item.kind === 'account' ? (
        <AccountCard
          account={item.account}
          rate={rate}
          stats={statsMap[item.account.id]}
          width={cardWidth}
          onPress={accountPressHandlers.get(item.account.id)!}
        />
      ) : (
        <AddCard onPress={onAddPress} width={cardWidth} />
      ),
    [accountPressHandlers, cardWidth, onAddPress, rate, statsMap],
  );
  const getItemLayout = useCallback(
    (_data: ArrayLike<AccountCarouselItem> | null | undefined, index: number) =>
      getAccountCarouselItemLayout(cardWidth, index),
    [cardWidth],
  );

  if (shouldVirtualizeAccountCarousel(accounts.length)) {
    return (
      <FlatList
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={getAccountCarouselItemKey}
        ItemSeparatorComponent={AccountCarouselSeparator}
        getItemLayout={getItemLayout}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.xxs,
          alignItems: 'stretch',
        }}
      />
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xxs,
        columnGap: Spacing.xs,
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
          onPress={accountPressHandlers.get(account.id)!}
        />
      ))}
      <AddCard onPress={onAddPress} width={cardWidth} />
    </ScrollView>
  );
}
