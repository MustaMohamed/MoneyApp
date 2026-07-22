import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';

import { TxDeleteConfirmSheet } from '../components/tx_delete_confirm_sheet';
import { ActionRow } from './components/action_row';
import { DetailHeader } from './components/detail_header';
import { DetailHero } from './components/detail_hero';
import { DetailLoadError } from './components/detail_load_error';
import { DetailRow } from './components/detail_row';
import { DetailRowsCard } from './components/detail_rows_card';
import { TransactionDetailSkeleton, TransferFlowSkeletonCard } from './components/detail_skeleton';
import { NotFoundState } from './components/not_found_state';
import { NoteCard } from './components/note_card';
import { TransferFlowCard } from './components/transfer_flow_card';
import { useTransactionDetail } from './detail.hook';

export default function TransactionDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    state,
    goBack,
    openAccount,
    openEdit,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    openCommitment,
    reload,
  } = useTransactionDetail(id);
  const transaction = state.tx;
  const detail = state.derived;
  const transferFlow = detail?.transferFlow;
  const hasDetailContent = transaction !== null && detail !== null;

  return (
    <Screen edges={['top', 'bottom']}>
      <DetailHeader
        editable={hasDetailContent && !state.isCommitmentOwned}
        refreshing={state.viewState === 'refreshing'}
        onBack={goBack}
        onEdit={openEdit}
      />

      {state.viewState === 'loading' ? (
        <TransactionDetailSkeleton transaction={state.loadingTransactionHint} />
      ) : state.viewState === 'notFound' ? (
        <NotFoundState />
      ) : state.viewState === 'firstLoadError' ? (
        <DetailLoadError onRetry={reload} />
      ) : hasDetailContent ? (
        <>
          <ScreenScroll>
            <DetailHero
              tx={transaction}
              category={detail.category}
              amountText={detail.amountText}
              title={detail.title}
              dateTimeText={detail.dateTimeText}
              badgeLabel={detail.categoryBadge}
              heroColor={detail.heroColor}
            />

            {detail.isTransferLike ? (
              transferFlow ? (
                <TransferFlowCard
                  fromAccount={transferFlow.fromAccount}
                  toAccount={transferFlow.toAccount}
                  fromAmount={transferFlow.fromAmount}
                  fromCurrency={transferFlow.fromCurrency}
                  toAmount={transferFlow.toAmount}
                  toCurrency={transferFlow.toCurrency}
                  onPressFrom={() => openAccount(transferFlow.fromAccount.id)}
                  onPressTo={() => openAccount(transferFlow.toAccount.id)}
                />
              ) : (
                <TransferFlowSkeletonCard />
              )
            ) : null}

            <DetailRowsCard>
              <DetailRow
                icon="shape"
                label={Strings.detailCategory}
                value={detail.categoryLabel}
                badge={detail.categoryBadge}
                badgeTone={detail.categoryBadgeTone}
              />
              <DetailRow
                icon={detail.accountIcon}
                label={Strings.detailAccount}
                value={detail.accountLabel}
                sublabel={detail.accountTypeLabel}
                reserveSublabel
              />
              {detail.budgetLabel ? (
                <DetailRow
                  icon="wallet-outline"
                  label={Strings.detailBudget}
                  value={detail.budgetLabel}
                />
              ) : null}
              <DetailRow
                icon="calendar"
                label={Strings.detailDateTime}
                value={detail.dateTimeText}
              />
              {detail.originalAmountText ? (
                <DetailRow
                  icon="currency-usd"
                  label={Strings.detailOriginalAmount}
                  value={detail.originalAmountText}
                />
              ) : null}
              {detail.exchangeRateText ? (
                <DetailRow
                  icon="earth"
                  label={Strings.detailExchangeRate}
                  value={detail.exchangeRateText}
                  badge={Strings.capturedBadge}
                />
              ) : null}
              <DetailRow
                icon={state.isCommitmentOwned ? 'calendar-check-outline' : 'pencil-outline'}
                label={Strings.detailSource}
                value={detail.sourceLabel}
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
            <NoteCard note={transaction.note} />

            {state.isCommitmentOwned ? (
              <ActionRow
                onViewCommitment={() => {
                  void openCommitment();
                }}
              />
            ) : (
              <ActionRow onDelete={openDeleteConfirm} />
            )}
          </ScreenScroll>

          {state.isDeletable ? (
            <TxDeleteConfirmSheet
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
