import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, Separator } from 'heroui-native';
import React from 'react';

import { EmptyState } from '@/components/ui/empty_state';
import { ErrorState } from '@/components/ui/error_state';
import { ListCard } from '@/components/ui/list_card';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section_header';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { ACCOUNTS_LIST_CARD_STYLE } from './accounts_list.geometry';
import { useAccountsList } from './accounts_list.hook';
import { AccountListRow } from './components/account_list_row';

export default function AccountsListScreen() {
  const {
    state: { rows, archivedCount, content, emptyState, isRetrying },
    goToAccount,
    goToAddAccount,
    onBack,
    retry,
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

      {content === 'error' ? (
        // `edges={[]}`: the outer `Screen` already pads top and bottom.
        <ErrorState
          edges={[]}
          flat
          iconName="alert-circle-outline"
          title={Strings.accountsReadErrorTitle}
          description={Strings.accountsReadErrorDescription}
          actionLabel={Strings.accountsReadErrorRetry}
          actionAccessibilityLabel={Strings.accountsReadErrorRetry}
          onAction={() => void retry()}
          isActionLoading={isRetrying}
          isActionDisabled={isRetrying}
          testID="accounts-load-error"
        />
      ) : emptyState === 'noAccounts' ? (
        <EmptyState variant="accounts" onAction={goToAddAccount} />
      ) : (
        <ScreenScroll
          contentContainerStyle={{ paddingBottom: Spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {emptyState === 'archivedOnly' ? (
            // Nothing follows: the archived section is MA-017's slot.
            <EmptyState
              variant="accountsArchivedOnly"
              archivedCount={archivedCount}
              onAction={goToAddAccount}
            />
          ) : (
            <>
              <SectionHeader title={Strings.accountsListSection} count={rows.length} />
              <ListCard style={ACCOUNTS_LIST_CARD_STYLE}>
                {/* Not virtualized: a `FlatList` nested in `ScreenScroll` virtualizes nothing. */}
                {rows.map(({ account, caption }, index) => (
                  <React.Fragment key={account.id}>
                    {index > 0 ? <Separator thickness={Size.hairline} /> : null}
                    <AccountListRow account={account} caption={caption} onPress={goToAccount} />
                  </React.Fragment>
                ))}
              </ListCard>
            </>
          )}
        </ScreenScroll>
      )}
    </Screen>
  );
}
