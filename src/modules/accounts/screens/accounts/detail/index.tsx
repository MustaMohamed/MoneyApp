import { PressableFeedback, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { LoadingCenter } from '@/components/ui/loading_center';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { DetailRowsCard } from '@/modules/transactions/screens/transactions/detail/components/detail_rows_card';
import { resolveAccountName } from '@/utils/account_name';

import { useAccountDetail } from './account_detail.hook';
import { AccountActivityCard } from './components/account_activity_card';
import { AccountFactRow } from './components/account_fact_row';
import { buildAccountFacts } from './components/account_facts.helpers';
import { AdjustBalanceSheet } from './components/adjust_balance_sheet';
import { ArchiveConfirmationDialog } from './components/archive_confirmation_dialog';
import { ArchivedDetailBody } from './components/archived_detail_body';
import { BalanceHero } from './components/balance_hero';
import { BalanceReviewAlert } from './components/balance_review_alert';
import { shouldShowBalanceReview } from './components/balance_review_alert.helpers';
import { AccountDeleteConfirmationDialog } from './components/delete_confirmation_dialog';
import { ReplacementAccountSheet } from './components/replacement_account_sheet';

const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export default function AccountDetailScreen() {
  const {
    state: {
      account,
      viewState,
      archived,
      isAdjustVisible,
      isArchiveVisible,
      isAdjusting,
      isArchiving,
      isConfirmingBalanceReview,
      balanceReviewError,
      archiveError,
      isUnarchiving,
      unarchiveError,
      isDeleteVisible,
      isDeleting,
      deleteError,
      replacementOptions,
      hasReplacementAccount,
      activity,
    },
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    closeArchive,
    handleArchive,
    handleUnarchive,
    setDeleteVisible,
    closeDelete,
    handleDelete,
    handleConfirmBalanceReviewed,
    onBack,
    goToEdit,
    retryActivity,
    retryArchivedRead,
    goToTransaction,
    goToAllTransactions,
    addTransactionForAccount,
  } = useAccountDetail();

  // `viewState` is 'active' exactly when `account` resolves; the guard is what narrows it.
  if (!account) {
    return (
      <Screen>
        <StackHeader title={archived ? resolveAccountName(archived.account) : ''} onBack={onBack} />

        {viewState === 'loading' ? <LoadingCenter /> : null}

        {viewState === 'notFound' ? (
          <View style={{ flex: 1 }} className="items-center justify-center">
            <Text className="font-inter text-muted text-[15px]">
              {Strings.accountDetailNotFound}
            </Text>
          </View>
        ) : null}

        {viewState === 'loadError' ? (
          <LoadErrorAlert
            title={Strings.accountDetailLoadError}
            retryLabel={Strings.accountDetailLoadRetry}
            flatRetry
            onRetry={retryArchivedRead}
          />
        ) : null}

        {archived ? (
          <>
            <ScreenScroll
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
            >
              <ArchivedDetailBody
                account={archived.account}
                transactionCount={archived.transactionCount}
                activeCommitmentCount={archived.activeCommitmentCount}
                onUnarchive={() => {
                  void handleUnarchive();
                }}
                onDelete={() => setDeleteVisible(true)}
                isUnarchiving={isUnarchiving}
                errorMessage={unarchiveError}
              />
            </ScreenScroll>
            <AccountDeleteConfirmationDialog
              visible={isDeleteVisible}
              account={archived.account}
              transactionCount={archived.transactionCount}
              activeCommitments={archived.activeCommitments}
              hasReplacementAccount={hasReplacementAccount}
              onClose={closeDelete}
              onConfirm={() => {
                void handleDelete();
              }}
              isLoading={isDeleting}
              errorMessage={deleteError}
            />
            <ReplacementAccountSheet
              account={archived.account}
              commitments={archived.activeCommitments}
              options={replacementOptions}
            />
          </>
        ) : null}
      </Screen>
    );
  }

  const facts = [...buildAccountFacts(account), ...activity.monthFacts];

  return (
    <Screen>
      <StackHeader
        title={resolveAccountName(account)}
        onBack={onBack}
        right={
          <PressableFeedback
            onPress={goToEdit}
            hitSlop={hitSlop}
            className="bg-surface border-border h-9 w-9 items-center justify-center rounded-[8px] border"
          >
            <Typography className="font-sora-bold text-accent text-[11px]">
              {Strings.accountDetailEdit}
            </Typography>
          </PressableFeedback>
        }
      />

      <ScreenScroll
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <BalanceHero account={account} />

        {shouldShowBalanceReview(account) ? (
          <BalanceReviewAlert
            onAdjust={() => setAdjustVisible(true)}
            onConfirm={() => {
              void handleConfirmBalanceReviewed();
            }}
            isConfirming={isConfirmingBalanceReview}
            errorMessage={balanceReviewError}
          />
        ) : null}

        <DetailRowsCard>
          {facts.map((fact, index) => (
            <AccountFactRow
              key={fact.label}
              label={fact.label}
              value={fact.value}
              valueColor={fact.valueColor}
              showDivider={index < facts.length - 1}
            />
          ))}
        </DetailRowsCard>

        <Box style={{ flexDirection: 'row' }} className="mx-4 mt-4 gap-2">
          <Box style={{ flex: 1 }}>
            <Button
              variant="secondary"
              flat
              icon="pencil-outline"
              label={Strings.accountDetailAdjustBalance}
              onPress={() => setAdjustVisible(true)}
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <Button
              variant="secondary"
              flat
              tone="danger"
              icon="archive-outline"
              label={Strings.accountDetailArchive}
              onPress={() => setArchiveVisible(true)}
            />
          </Box>
        </Box>
        {/* The card's own header and container carry `mx-4`, so it is the Box's sibling. */}
        <AccountActivityCard
          status={activity.status}
          rows={activity.rows}
          onRowPress={goToTransaction}
          onSeeAll={goToAllTransactions}
          onAdd={addTransactionForAccount}
          onRetry={retryActivity}
        />
      </ScreenScroll>

      <AdjustBalanceSheet
        isOpen={isAdjustVisible}
        currentBalance={account.current_balance}
        currency={account.currency}
        accountType={account.type}
        onOpenChange={(open) => {
          if (!open) setAdjustVisible(false);
        }}
        // The sheet awaits this promise; wrapping it in `void` makes a failed adjust silent.
        onSave={handleAdjustBalance}
        isLoading={isAdjusting}
      />

      <ArchiveConfirmationDialog
        visible={isArchiveVisible}
        account={account}
        onClose={closeArchive}
        onConfirm={() => {
          void handleArchive();
        }}
        isLoading={isArchiving}
        errorMessage={archiveError}
      />
    </Screen>
  );
}
