import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, Typography } from 'heroui-native';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EmptyState } from '@/components/ui/empty_state';
import { ErrorState } from '@/components/ui/error_state';
import { ListCard } from '@/components/ui/list_card';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section_header';
import { SegmentFilter } from '@/components/ui/segment_filter';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { useAccountsListDragAnim } from './accounts_list.anim';
import {
  ACCOUNTS_LIST_CARD_STYLE,
  ACCOUNTS_LIST_DROP_SLOT_STYLE,
  ACCOUNTS_LIST_FLOATING_STYLE,
  ACCOUNTS_LIST_RAIL_STYLE,
  ACCOUNTS_LIST_REORDER_NOTE_STYLE,
} from './accounts_list.geometry';
import { useAccountsList } from './accounts_list.hook';
import { ACCOUNTS_LIST_TYPE_FILTERS } from './accounts_list.presentation';
import { AccountListRow } from './components/account_list_row';
import { ArchivedCard } from './components/archived_card';
import { LiftedAccountRow } from './components/lifted_account_row';

export default function AccountsListScreen() {
  const {
    state: {
      rows,
      archived,
      archivedCount,
      canLift,
      content,
      emptyState,
      isReorderable,
      isLifted,
      isRetrying,
      liftedRow,
      liftGeneration,
      selectedType,
      sectionTitle,
    },
    goToAccount,
    goToAddAccount,
    liftRow,
    moveRow,
    onBack,
    releaseRow,
    retry,
    selectType,
    setArchivedExpanded,
    unarchive,
  } = useAccountsList();
  const { drag, slotStyle, liftedStyle } = useAccountsListDragAnim({ isLifted });

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
          scrollEnabled={!isLifted}
        >
          <View style={ACCOUNTS_LIST_RAIL_STYLE}>
            <SegmentFilter
              selectedFilter={selectedType}
              onSelectedFilterChange={selectType}
              filters={ACCOUNTS_LIST_TYPE_FILTERS}
              accessibilityLabel={Strings.accountTypeFilterAccessibility}
              corners="form"
            />
          </View>

          {emptyState === 'archivedOnly' ? (
            <EmptyState
              variant="accountsArchivedOnly"
              archivedCount={archivedCount}
              onAction={goToAddAccount}
            />
          ) : (
            <>
              <SectionHeader title={sectionTitle} count={rows.length} />
              {emptyState === 'filtered' ? (
                <EmptyState
                  variant="filtered"
                  placement="inline"
                  onAction={() => selectType('all')}
                />
              ) : (
                <>
                  <ListCard style={ACCOUNTS_LIST_CARD_STYLE}>
                    {/* Not virtualized: a `FlatList` nested in `ScreenScroll` virtualizes nothing. */}
                    {rows.map(({ account, caption }, index) => (
                      <AccountListRow
                        key={`${account.id}:${liftGeneration}`}
                        account={account}
                        caption={caption}
                        index={index}
                        count={rows.length}
                        drag={drag}
                        isLifted={isLifted}
                        canLift={canLift}
                        showSeparator={index > 0}
                        onPress={goToAccount}
                        onMove={
                          isReorderable ? (direction) => void moveRow(index, direction) : undefined
                        }
                        onLift={liftRow}
                        onRelease={releaseRow}
                      />
                    ))}
                    {liftedRow === undefined ? null : (
                      <>
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            ACCOUNTS_LIST_DROP_SLOT_STYLE,
                            ACCOUNTS_LIST_FLOATING_STYLE,
                            slotStyle,
                          ]}
                        />
                        <LiftedAccountRow
                          account={liftedRow.account}
                          caption={liftedRow.caption}
                          style={liftedStyle}
                        />
                      </>
                    )}
                  </ListCard>
                  {isReorderable ? null : (
                    <Typography
                      className="text-content-secondary font-inter"
                      style={ACCOUNTS_LIST_REORDER_NOTE_STYLE}
                    >
                      {Strings.accountsReorderFilterNote}
                    </Typography>
                  )}
                </>
              )}
            </>
          )}

          <ArchivedCard
            rows={archived.rows}
            summary={archived.summary}
            isExpanded={archived.isExpanded}
            unarchivingId={archived.unarchivingId}
            unarchiveError={archived.unarchiveError}
            onExpandedChange={setArchivedExpanded}
            onPressRow={goToAccount}
            onUnarchive={(id) => void unarchive(id)}
          />
        </ScreenScroll>
      )}
    </Screen>
  );
}
