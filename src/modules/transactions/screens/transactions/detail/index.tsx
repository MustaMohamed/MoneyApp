import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { DetailFactRow } from '@/components/ui/detail_fact_row';
import { DetailHero } from '@/components/ui/detail_hero';
import { DetailLoadError } from '@/components/ui/detail_load_error';
import { DetailNotFoundState } from '@/components/ui/detail_not_found_state';
import { DetailNoteCard } from '@/components/ui/detail_note_card';
import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';

import { TxDeleteDialog } from '../components/tx_delete_dialog';
import { ActionRow } from './components/action_row';
import { DetailHeader } from './components/detail_header';
import { TransactionDetailSkeleton, TransferFlowSkeletonCard } from './components/detail_skeleton';
import { TransferFlowCard } from './components/transfer_flow_card';
import {
  TRANSACTION_DETAIL_LOAD_ERROR_COPY,
  TRANSACTION_DETAIL_LOAD_ERROR_TEST_ID,
} from './detail.helpers';
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
        <DetailNotFoundState
          title={Strings.detailNotFoundTitle}
          body={Strings.detailNotFoundBody}
        />
      ) : state.viewState === 'firstLoadError' ? (
        <DetailLoadError
          copy={TRANSACTION_DETAIL_LOAD_ERROR_COPY}
          testID={TRANSACTION_DETAIL_LOAD_ERROR_TEST_ID}
          onRetry={reload}
        />
      ) : hasDetailContent ? (
        <>
          <ScreenScroll>
            <DetailHero hero={detail.hero} testID="transaction-detail-hero" />

            {state.transferFlowView.kind === 'pending' ? (
              <TransferFlowSkeletonCard />
            ) : state.transferFlowView.kind === 'cells' ? (
              <TransferFlowCard flow={state.transferFlowView.flow} onOpenAccount={openAccount} />
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

            <DetailNoteCard note={transaction.note} />

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

          {state.refreshError ? (
            <DetailLoadError
              copy={TRANSACTION_DETAIL_LOAD_ERROR_COPY}
              testID={TRANSACTION_DETAIL_LOAD_ERROR_TEST_ID}
              floating
              onRetry={reload}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
