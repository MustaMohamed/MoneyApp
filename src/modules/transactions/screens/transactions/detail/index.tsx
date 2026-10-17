import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Screen, ScreenScroll } from '@/components/ui/screen';

import { TxDeleteDialog } from '../components/tx_delete_dialog';
import { ActionRow } from './components/action_row';
import { DetailFactRow } from './components/detail_fact_row';
import { DetailHeader } from './components/detail_header';
import { DetailHero } from './components/detail_hero';
import { DetailLoadError } from './components/detail_load_error';
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
        editable={hasDetailContent && state.isEditable}
        refreshing={state.viewState === 'refreshing'}
        onBack={goBack}
        onEdit={openEdit}
      />

      {state.viewState === 'loading' ? (
        <TransactionDetailSkeleton
          transaction={state.loadingTransactionHint}
          actionSet={state.loadingActionSet}
        />
      ) : state.viewState === 'notFound' ? (
        <NotFoundState />
      ) : state.viewState === 'firstLoadError' ? (
        <DetailLoadError onRetry={reload} />
      ) : hasDetailContent ? (
        <>
          <ScreenScroll>
            <DetailHero hero={detail.hero} />

            {detail.isTransferLike ? (
              transferFlow ? (
                <TransferFlowCard
                  fromAccount={transferFlow.fromAccount}
                  toAccount={transferFlow.toAccount}
                  fromAmountText={transferFlow.fromAmountText}
                  toAmountText={transferFlow.toAmountText}
                  onPressFrom={() => openAccount(transferFlow.fromAccount.id)}
                  onPressTo={() => openAccount(transferFlow.toAccount.id)}
                />
              ) : (
                <TransferFlowSkeletonCard />
              )
            ) : null}

            <DetailRowsCard>
              {detail.facts.map((fact, index) => (
                <DetailFactRow
                  key={fact.kind}
                  fact={fact}
                  showDivider={index < detail.facts.length - 1}
                />
              ))}
            </DetailRowsCard>

            <NoteCard note={transaction.note} />

            <ActionRow
              {...state.actions}
              onEdit={openEdit}
              onDelete={openDeleteConfirm}
              onViewCommitment={() => {
                void openCommitment();
              }}
            />
          </ScreenScroll>

          <TxDeleteDialog
            isOpen={state.confirmVisible}
            body={state.deleteBody}
            busy={state.deleteBusy}
            errorMessage={state.deleteErrorMessage}
            onCancel={closeDeleteConfirm}
            onConfirm={() => {
              void confirmDelete();
            }}
          />

          {state.refreshError ? <DetailLoadError floating onRetry={reload} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
