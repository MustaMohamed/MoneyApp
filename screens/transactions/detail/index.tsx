import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back_button';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { EditTransactionSheet } from '../transaction_form';
import { useEditTransactionState } from '../transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '../transaction_form/edit_transaction.store';
import { ActionRow } from './components/action_row';
import { DeleteConfirmDialog } from './components/delete_confirm_dialog';
import { DetailHero } from './components/detail_hero';
import { DetailRow } from './components/detail_row';
import { DetailRowsCard } from './components/detail_rows_card';
import { NotFoundState } from './components/not_found_state';
import { useShallow } from 'zustand/react/shallow';

import { useTransactionDetail } from './detail.hook';

export default function TransactionDetailScreen() {
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

  function handleEditClose() {
    useEditTransactionStore.getState().reset();
    useEditTransactionState.getState().close();
  }

  function handleEditSaved() {
    useEditTransactionStore.getState().reset();
    useEditTransactionState.getState().close();
    reload();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>{Strings.detailHeader}</Text>
        <View style={styles.backBtn} />
      </View>

      {state.viewState === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.shared.cairoGold} />
        </View>
      )}

      {state.viewState === 'notFound' && <NotFoundState />}

      {state.viewState === 'ready' && state.tx && state.derived && (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <DetailHero
              tx={state.tx}
              category={state.derived.category}
              amountText={state.derived.amountText}
              title={state.derived.title}
              dateTimeText={state.derived.dateTimeText}
            />

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
              {state.derived.originalAmountText && (
                <DetailRow
                  icon="currency-usd"
                  label={Strings.detailOriginalAmount}
                  value={state.derived.originalAmountText}
                />
              )}
              {state.derived.exchangeRateText && (
                <DetailRow
                  icon="earth"
                  label={Strings.detailExchangeRate}
                  value={state.derived.exchangeRateText}
                  badge={Strings.capturedBadge}
                />
              )}
              <DetailRow
                icon="text"
                label={Strings.detailNote}
                value={state.derived.noteText}
                muted={!state.tx.note}
                showDivider={false}
              />
            </DetailRowsCard>

            <ActionRow onEdit={handleEdit} onDelete={openDeleteConfirm} />
          </ScrollView>

          <DeleteConfirmDialog
            visible={state.confirmVisible}
            busy={state.deleting}
            onCancel={closeDeleteConfirm}
            onConfirm={confirmDelete}
          />

          <EditTransactionSheet
            visible={editTxState.visible}
            onClose={handleEditClose}
            onSaved={handleEditSaved}
            tx={editTxStoreState.editingTx}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: ms(40) },
});
