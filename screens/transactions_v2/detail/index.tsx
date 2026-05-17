import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Screen, ScreenScroll } from '@/components/ui/screen';
import { BackButton } from '@/components/ui/back_button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';

import { EditTransactionSheet } from '@/screens/transactions/transaction_form';
import { useEditTransactionState } from '@/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/screens/transactions/transaction_form/edit_transaction.store';

import { ActionRow } from './components/action_row';
import { DeleteConfirmDialog } from './components/delete_confirm_dialog';
import { DetailHero } from './components/detail_hero';
import { DetailRow } from './components/detail_row';
import { DetailRowsCard } from './components/detail_rows_card';
import { NotFoundState } from './components/not_found_state';
import { TransferFlowCard } from './components/transfer_flow_card';
import { useTransactionDetail } from './detail.hook';

export default function TransactionDetailScreenV2(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { state, openDeleteConfirm, closeDeleteConfirm, confirmDelete, reload } =
    useTransactionDetail(id);

  const { state: editTxState } = useEditTransactionState(useShallow((s) => ({ state: s.state })));
  const { state: editTxStoreState } = useEditTransactionStore(
    useShallow((s) => ({ state: s.state })),
  );

  useEffect(() => {
    return () => {
      useEditTransactionStore.getState().reset();
      useEditTransactionState.getState().close();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!useEditTransactionState.getState().state.visible) return;
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
      <View className="h-14 flex-row items-center justify-between px-2 border-b border-separator">
        <BackButton onPress={() => router.back()} />
        <Text className="font-sora font-semibold text-[15px] text-foreground">
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
      ) : state.viewState === 'ready' && state.tx && state.derived ? (
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
              />
              <DetailRow
                icon="card-bulleted-outline"
                label={Strings.detailAccount}
                value={state.derived.accountLabel}
                sublabel={state.derived.accountTypeLabel}
              />
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
                icon="text"
                label={Strings.detailNote}
                value={state.derived.noteText}
                muted={!state.tx.note}
                showDivider={false}
              />
            </DetailRowsCard>

            <ActionRow onEdit={handleEdit} onDelete={openDeleteConfirm} />
          </ScreenScroll>

          <DeleteConfirmDialog
            visible={state.confirmVisible}
            busy={state.deleting}
            onCancel={closeDeleteConfirm}
            onConfirm={confirmDelete}
          />

          <EditTransactionSheet
            visible={editTxState.visible}
            onClose={() => {
              useEditTransactionStore.getState().reset();
              useEditTransactionState.getState().close();
            }}
            onSaved={() => {
              useEditTransactionStore.getState().reset();
              useEditTransactionState.getState().close();
              reload();
            }}
            tx={editTxStoreState.editingTx}
          />
        </>
      ) : null}
    </Screen>
  );
}
