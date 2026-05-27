import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';

import { EditTransactionSheet } from '../transaction_form';
import { useEditTransactionState } from '../transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '../transaction_form/edit_transaction.store';
import { ActionRow } from './components/action_row';
import { DeleteConfirmDialog } from './components/delete_confirm_dialog';
import { DetailHero } from './components/detail_hero';
import { DetailRow } from './components/detail_row';
import { DetailRowsCard } from './components/detail_rows_card';
import { NotFoundState } from './components/not_found_state';
import { NoteCard } from './components/note_card';
import { TransferFlowCard } from './components/transfer_flow_card';
import { useTransactionDetail } from './detail.hook';

export default function TransactionDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { state, openDeleteConfirm, closeDeleteConfirm, confirmDelete, reload } =
    useTransactionDetail(id);

  const editTxVisible = useEditTransactionState.useState.visible();

  useEffect(() => {
    return () => {
      useEditTransactionStore.getState().reset();
      useEditTransactionState.getState().close();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!useEditTransactionState.getState().visible) return;
      e.preventDefault();
      useEditTransactionStore.getState().reset();
      useEditTransactionState.getState().close();
    });
    return unsubscribe;
  }, [navigation]);

  function handleEdit() {
    if (state.tx) {
      useEditTransactionStore.getState().loadFromTx(state.tx);
      useEditTransactionState.getState().open(state.tx);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="border-separator h-14 flex-row items-center justify-between border-b px-2">
        <BackButton onPress={() => router.back()} />
        <Text className="font-sora text-foreground text-[15px] font-semibold">
          {Strings.detailHeader}
        </Text>
        <View className="w-10" />
      </View>

      {state.viewState === 'loading' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={GoldTokens[400]} />
        </View>
      ) : state.viewState === 'notFound' ? (
        <NotFoundState />
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
              {/*
                showDivider is false on the LAST visible row of the card so
                the bottom doesn't render a hairline flush against the
                card's own bottom border (avoids double-line artifact). The
                last row depends on which conditional rows are present:
                  DateTime is last when no Original Amount and no Rate
                  Original Amount is last when no Rate
                  Rate (when present) is always last
              */}
              <DetailRow
                icon="calendar"
                label={Strings.detailDateTime}
                value={state.derived.dateTimeText}
                showDivider={!!state.derived.originalAmountText || !!state.derived.exchangeRateText}
              />
              {state.derived.originalAmountText ? (
                <DetailRow
                  icon="currency-usd"
                  label={Strings.detailOriginalAmount}
                  value={state.derived.originalAmountText}
                  showDivider={!!state.derived.exchangeRateText}
                />
              ) : null}
              {state.derived.exchangeRateText ? (
                <DetailRow
                  icon="earth"
                  label={Strings.detailExchangeRate}
                  value={state.derived.exchangeRateText}
                  badge={Strings.capturedBadge}
                  showDivider={false}
                />
              ) : null}
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

            <ActionRow onEdit={handleEdit} onDelete={openDeleteConfirm} />
          </ScreenScroll>

          <DeleteConfirmDialog
            isOpen={state.confirmVisible}
            busy={state.deleting}
            onCancel={closeDeleteConfirm}
            onConfirm={() => {
              void confirmDelete();
            }}
          />

          <EditTransactionSheet
            visible={editTxVisible}
            onClose={() => {
              useEditTransactionStore.getState().reset();
              useEditTransactionState.getState().close();
            }}
            onSaved={() => {
              useEditTransactionStore.getState().reset();
              useEditTransactionState.getState().close();
              reload();
            }}
            tx={state.tx}
          />
        </>
      ) : null}
    </Screen>
  );
}
