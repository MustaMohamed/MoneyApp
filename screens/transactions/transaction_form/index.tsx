import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

import { Strings } from '@/constants/strings';
import { Colors, Radius } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Transaction } from '@/database/entities/transaction.entity';
import { useAddTransaction } from './add_transaction.hook';
import { useEditTransaction } from './edit_transaction.hook';
import { AccountPickerSheet } from './components/account_picker_sheet';
import { CategoryPickerSheet } from './components/category_picker_sheet';
import { TransactionFormBody } from './transaction_form_body';

const WINDOW_HEIGHT = Dimensions.get('window').height;

// ─── Add Transaction Sheet ────────────────────────────────────────────────────

interface AddProps {
  visible: boolean;
  onClose: () => void;
}

export function AddTransactionSheet({ visible, onClose }: AddProps) {
  const sheetRef = useRef<ActionSheetRef>(null);
  const hide = useCallback(() => sheetRef.current?.hide(), []);
  const hook = useAddTransaction(hide);

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={onClose}
      gestureEnabled
      useBottomSafeAreaPadding={false}
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <TransactionFormBody
        title={Strings.addTxTitle}
        locked={false}
        type={hook.state.type}
        onSelectType={hook.setType}
        amountStr={hook.state.amountStr}
        handleNumpad={hook.handleNumpad}
        amountError={hook.state.errors.amount}
        selectedAccount={hook.state.selectedAccount}
        onOpenAccountPicker={() => hook.setShowAccountPicker(true)}
        accountError={hook.state.errors.account}
        selectedToAccount={hook.state.selectedToAccount}
        onOpenToPicker={() => hook.setShowToPicker(true)}
        toAccountError={hook.state.errors.toAccount}
        selectedCategory={hook.state.selectedCategory}
        onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
        categoryError={hook.state.errors.category}
        isUSD={hook.state.isUSD}
        exchangeRate={hook.state.exchangeRate}
        setExchangeRate={hook.setExchangeRate}
        rateOverride={hook.state.rateOverride}
        toggleRateOverride={hook.toggleRateOverride}
        rateError={hook.state.errors.rate}
        date={hook.state.date}
        setDate={hook.setDate}
        time={hook.state.time}
        setTime={hook.setTime}
        note={hook.state.note}
        setNote={hook.setNote}
        saving={hook.state.saving}
        onClose={hide}
        handleSave={hook.handleSave}
      />

      <AccountPickerSheet
        visible={hook.state.showAccountPicker}
        title={
          hook.state.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle
        }
        accounts={hook.state.accountsForFrom}
        selectedId={hook.state.accountId}
        onSelect={hook.selectAccount}
        onClose={() => hook.setShowAccountPicker(false)}
      />
      <AccountPickerSheet
        visible={hook.state.showToPicker}
        title={Strings.addTxPickToTitle}
        accounts={hook.state.accountsForTo}
        selectedId={hook.state.toAccountId}
        excludeId={hook.state.accountId}
        onSelect={hook.selectToAccount}
        onClose={() => hook.setShowToPicker(false)}
      />
      <CategoryPickerSheet
        visible={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onClose={() => hook.setShowCategoryPicker(false)}
      />
    </ActionSheet>
  );
}

// ─── Edit Transaction Sheet ───────────────────────────────────────────────────

interface EditProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  tx: Transaction | null;
}

export function EditTransactionSheet({ visible, onClose, onSaved, tx }: EditProps) {
  if (!tx) return null;
  return <EditSheetInner visible={visible} tx={tx} onClose={onClose} onSaved={onSaved} />;
}

// Inner component so useEditTransaction can be called with a guaranteed non-null tx.
// savedRef distinguishes a successful save from a cancel/gesture dismiss.
function EditSheetInner({
  visible,
  tx,
  onClose,
  onSaved,
}: {
  visible: boolean;
  tx: Transaction;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const sheetRef = useRef<ActionSheetRef>(null);
  const savedRef = useRef(false);

  const hide = useCallback(() => sheetRef.current?.hide(), []);

  const handleSaved = useCallback(() => {
    savedRef.current = true;
    sheetRef.current?.hide();
  }, []);

  const hook = useEditTransaction(tx, hide, handleSaved);

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  function handleSheetClose() {
    if (savedRef.current) {
      savedRef.current = false;
      onSaved?.();
    } else {
      onClose();
    }
  }

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={handleSheetClose}
      gestureEnabled
      useBottomSafeAreaPadding={false}
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <TransactionFormBody
        title={Strings.editTxTitle}
        locked={true}
        type={hook.state.type}
        onSelectType={() => {}}
        amountStr={hook.state.amountStr}
        handleNumpad={hook.handleNumpad}
        amountError={hook.state.errors.amount}
        selectedAccount={hook.state.selectedAccount}
        onOpenAccountPicker={() => {}}
        accountError={undefined}
        selectedToAccount={hook.state.selectedToAccount}
        onOpenToPicker={() => {}}
        toAccountError={undefined}
        selectedCategory={hook.state.selectedCategory}
        onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
        categoryError={hook.state.errors.category}
        isUSD={hook.state.isUSD}
        exchangeRate={hook.state.exchangeRate}
        setExchangeRate={hook.setExchangeRate}
        rateOverride={hook.state.rateOverride}
        toggleRateOverride={hook.toggleRateOverride}
        rateError={hook.state.errors.rate}
        date={hook.state.date}
        setDate={hook.setDate}
        time={hook.state.time}
        setTime={hook.setTime}
        note={hook.state.note}
        setNote={hook.setNote}
        saving={hook.state.saving}
        onClose={hide}
        handleSave={hook.handleSave}
      />

      <CategoryPickerSheet
        visible={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onClose={() => hook.setShowCategoryPicker(false)}
      />
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: WINDOW_HEIGHT * 0.92,
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
});
