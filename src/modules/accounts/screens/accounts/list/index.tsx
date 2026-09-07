import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, Separator } from 'heroui-native';
import React from 'react';

import { EmptyState } from '@/components/ui/empty_state';
import { ListCard } from '@/components/ui/list_card';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section_header';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { useAccountsList } from './accounts_list.hook';
import { AccountListRow } from './components/account_list_row';

export default function AccountsListScreen() {
  const {
    state: { accounts },
    goToAccount,
    goToAddAccount,
    onBack,
  } = useAccountsList();

  return (
    <Screen>
      <StackHeader
        title={Strings.accountsListTitle}
        onBack={onBack}
        right={
          <PressableFeedback
            onPress={goToAddAccount}
            hitSlop={8}
            className="bg-surface border-border h-9 w-9 items-center justify-center border"
            style={{ borderRadius: Radius.sm }}
            accessibilityRole="button"
            accessibilityLabel={Strings.emptyAccountsCta}
          >
            <MaterialCommunityIcons name="plus" size={Size.iconBack} color={CoreTokens.text1} />
          </PressableFeedback>
        }
      />

      {accounts.length === 0 ? (
        // MA-025 replaces this with B2 and keeps it for B3.
        <EmptyState variant="accounts" onAction={goToAddAccount} />
      ) : (
        <ScreenScroll
          contentContainerStyle={{ paddingBottom: Spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title={Strings.accountsListSection} count={accounts.length} />
          <ListCard>
            {/* Not virtualized: a `FlatList` nested in `ScreenScroll` virtualizes nothing. */}
            {accounts.map((account, index) => (
              <React.Fragment key={account.id}>
                {index > 0 ? <Separator thickness={Size.hairline} /> : null}
                <AccountListRow account={account} onPress={goToAccount} />
              </React.Fragment>
            ))}
          </ListCard>
        </ScreenScroll>
      )}
    </Screen>
  );
}
