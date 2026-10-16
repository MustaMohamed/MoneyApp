import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';

import { TxDeleteConfirmSheet } from '../components/tx_delete_confirm_sheet';
import { ActionRow } from './components/action_row';
import { DETAIL_FACT_TILE } from './components/detail.geometry';
import { DetailFactRow, type DetailFactBadge } from './components/detail_fact_row';
import { DetailHeader } from './components/detail_header';
import { DetailHero } from './components/detail_hero';
import { DetailLoadError } from './components/detail_load_error';
import { DetailRowsCard } from './components/detail_rows_card';
import { TransactionDetailSkeleton, TransferFlowSkeletonCard } from './components/detail_skeleton';
import { NotFoundState } from './components/not_found_state';
import { NoteCard } from './components/note_card';
import { TransferFlowCard } from './components/transfer_flow_card';
import { useTransactionDetail } from './detail.hook';

const ARCHIVED_BADGE: DetailFactBadge = { label: Strings.detailAccountArchived, tone: 'neutral' };
const CAPTURED_BADGE: DetailFactBadge = { label: Strings.capturedBadge, tone: 'accent' };
const COMMITMENT_BADGE: DetailFactBadge = { label: Strings.typeBadgeCommitment, tone: 'accent' };

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
              {detail.accountRow ? (
                <DetailFactRow
                  label={Strings.detailAccount}
                  value={detail.accountRow.name}
                  leading={
                    <AccountColorTile
                      {...detail.accountRow.tile}
                      size={DETAIL_FACT_TILE}
                      glyphSize={Size.iconMicro}
                    />
                  }
                  badge={detail.accountRow.archived ? ARCHIVED_BADGE : undefined}
                />
              ) : null}
              {detail.categoryRow ? (
                <DetailFactRow
                  label={Strings.detailCategory}
                  value={detail.categoryRow.name}
                  leading={
                    <MaterialCommunityIcons
                      name={detail.categoryRow.glyphName}
                      size={Size.iconXs}
                      color={detail.categoryRow.glyphColor}
                    />
                  }
                />
              ) : null}
              {detail.budgetLabel ? (
                <DetailFactRow label={Strings.detailBudget} value={detail.budgetLabel} />
              ) : null}
              {detail.amountRow ? (
                <DetailFactRow label={detail.amountRow.label} value={detail.amountRow.value} />
              ) : null}
              {detail.exchangeRateText ? (
                <DetailFactRow
                  label={Strings.detailExchangeRate}
                  value={detail.exchangeRateText}
                  badge={CAPTURED_BADGE}
                />
              ) : null}
              <DetailFactRow label={Strings.detailDate} value={detail.dateText} />
              <DetailFactRow label={Strings.detailTime} value={detail.timeText} />
              {/* A commitment's payment shows its badge alone, with no commitment name beside it. */}
              <DetailFactRow
                label={Strings.detailSource}
                value={detail.source === 'manual' ? Strings.detailManualSource : undefined}
                valueFace="inter"
                badge={detail.source === 'commitment' ? COMMITMENT_BADGE : undefined}
                showDivider={false}
              />
            </DetailRowsCard>

            <NoteCard note={transaction.note} />

            <ActionRow
              actionSet={state.actionSet}
              notice={state.archivedAccountLine}
              onEdit={openEdit}
              onDelete={openDeleteConfirm}
              onViewCommitment={() => {
                void openCommitment();
              }}
            />
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
