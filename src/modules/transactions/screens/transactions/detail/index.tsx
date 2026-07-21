import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';

import { useTransactionFormV2State } from '../transaction_form_v2/transaction_form_v2.state';
import { ActionRow } from './components/action_row';
import { DeleteConfirmDialog } from './components/delete_confirm_dialog';
import { DetailHero } from './components/detail_hero';
import { DetailLoadError } from './components/detail_load_error';
import { DetailRow } from './components/detail_row';
import { DetailRowsCard } from './components/detail_rows_card';
import { TransactionDetailSkeleton } from './components/detail_skeleton';
import { NotFoundState } from './components/not_found_state';
import { NoteCard } from './components/note_card';
import { TransferFlowCard } from './components/transfer_flow_card';
import { useTransactionDetail } from './detail.hook';

export default function TransactionDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, openDeleteConfirm, closeDeleteConfirm, confirmDelete, openCommitment, reload } =
    useTransactionDetail(id);

  function handleEdit() {
    if (state.tx && state.isEditable) {
      useTransactionFormV2State.getState().openEdit(state.tx, reload);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <StackHeader title={Strings.detailHeader} onBack={() => router.back()} />

      {state.viewState === 'loading' ? (
        <TransactionDetailSkeleton transaction={state.loadingTransactionHint} />
      ) : state.viewState === 'notFound' ? (
        <NotFoundState />
      ) : state.viewState === 'error' ? (
        <DetailLoadError onRetry={reload} />
      ) : // oxlint-disable-next-line typescript/no-unnecessary-condition -- explicit state check for readability; state.tx/derived guards are real
      state.viewState === 'ready' && state.tx && state.derived ? (
        <>
          <ScreenScroll>
            <DetailHero
              tx={state.tx}
              category={state.derived.category}
              amountText={state.derived.amountText}
              title={state.derived.title}
              dateTimeText={state.derived.dateTimeText}
              badgeLabel={state.derived.categoryBadge}
              heroColor={state.derived.heroColor}
            />

            {state.derived.isTransferLike && state.derived.transferFlow ? (
              <TransferFlowCard
                fromAccount={state.derived.transferFlow.fromAccount}
                toAccount={state.derived.transferFlow.toAccount}
                fromAmount={state.derived.transferFlow.fromAmount}
                fromCurrency={state.derived.transferFlow.fromCurrency}
                toAmount={state.derived.transferFlow.toAmount}
                toCurrency={state.derived.transferFlow.toCurrency}
                onPressFrom={() =>
                  state.derived?.transferFlow &&
                  router.push(`/accounts/${state.derived.transferFlow.fromAccount.id}`)
                }
                onPressTo={() =>
                  state.derived?.transferFlow &&
                  router.push(`/accounts/${state.derived.transferFlow.toAccount.id}`)
                }
              />
            ) : null}

            <DetailRowsCard>
              <DetailRow
                icon="shape"
                label={Strings.detailCategory}
                value={state.derived.categoryLabel}
                badge={state.derived.categoryBadge}
                badgeTone={state.derived.categoryBadgeTone}
              />
              <DetailRow
                icon={state.derived.accountIcon}
                label={Strings.detailAccount}
                value={state.derived.accountLabel}
                sublabel={state.derived.accountTypeLabel}
              />
              {state.derived.budgetLabel ? (
                <DetailRow
                  icon="wallet-outline"
                  label={Strings.detailBudget}
                  value={state.derived.budgetLabel}
                />
              ) : null}
              <DetailRow
                icon="calendar"
                label={Strings.detailDateTime}
                value={state.derived.dateTimeText}
              />
              {state.derived.originalAmountText ? (
                <DetailRow
                  icon="currency-usd"
                  label={Strings.detailOriginalAmount}
                  value={state.derived.originalAmountText}
                />
              ) : null}
              {state.derived.exchangeRateText ? (
                <DetailRow
                  icon="earth"
                  label={Strings.detailExchangeRate}
                  value={state.derived.exchangeRateText}
                  badge={Strings.capturedBadge}
                />
              ) : null}
              <DetailRow
                icon={state.isCommitmentOwned ? 'calendar-check-outline' : 'pencil-outline'}
                label={Strings.detailSource}
                value={state.derived.sourceLabel}
                showDivider={false}
              />
            </DetailRowsCard>

            {/*
              Note lives in its OWN full-width card below the rows card —
              mirrors the §7 list-row pattern where the note was lifted out of
              the narrow middle column. A long note now wraps to as many
              lines as it needs, instead of being chopped to two by the
              DetailRow numberOfLines={2} ceiling. When the transaction has
              no note, the card is omitted entirely (no empty placeholder).
            */}
            <NoteCard note={state.tx.note} />

            {state.isCommitmentOwned ? (
              <ActionRow
                onViewCommitment={() => {
                  void openCommitment();
                }}
              />
            ) : (
              <ActionRow onEdit={handleEdit} onDelete={openDeleteConfirm} />
            )}
          </ScreenScroll>

          {state.isDeletable ? (
            <DeleteConfirmDialog
              isOpen={state.confirmVisible}
              busy={state.deleting}
              onCancel={closeDeleteConfirm}
              onConfirm={() => {
                void confirmDelete();
              }}
            />
          ) : null}

          {state.refreshError ? <DetailLoadError floating onRetry={reload} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
