import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import { Colors, Radius } from '@/constants/theme';
import type { Transaction } from '@/database/entities/transaction.entity';
import { useAddTransaction } from './add_transaction.hook';
import { useEditTransaction } from './edit_transaction.hook';
import { useAddTransactionAnim } from './transaction_form.anim';
import { AccountPickerSheet } from './components/account_picker_sheet';
import { CategoryPickerSheet } from './components/category_picker_sheet';
import { TransactionFormBody } from './transaction_form_body';

// ─── Add Transaction Sheet ────────────────────────────────────────────────────

interface AddProps {
  visible: boolean;
  onClose: () => void;
}

export function AddTransactionSheet({ visible, onClose }: AddProps) {
  const { sheetStyle, overlayStyle, openSheet, closeSheet } = useAddTransactionAnim();
  const hook = useAddTransaction(() => closeSheet(onClose));

  useEffect(() => {
    if (visible) openSheet();
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet(onClose)} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <TransactionFormBody
          title={Strings.addTxTitle}
          locked={false}
          type={hook.type}
          onSelectType={hook.setType}
          amountStr={hook.amountStr}
          handleNumpad={hook.handleNumpad}
          amountError={hook.errors.amount}
          selectedAccount={hook.selectedAccount}
          onOpenAccountPicker={() => hook.setShowAccountPicker(true)}
          accountError={hook.errors.account}
          selectedToAccount={hook.selectedToAccount}
          onOpenToPicker={() => hook.setShowToPicker(true)}
          toAccountError={hook.errors.toAccount}
          selectedCategory={hook.selectedCategory}
          onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
          categoryError={hook.errors.category}
          isUSD={hook.isUSD}
          exchangeRate={hook.exchangeRate}
          setExchangeRate={hook.setExchangeRate}
          rateOverride={hook.rateOverride}
          toggleRateOverride={hook.toggleRateOverride}
          rateError={hook.errors.rate}
          note={hook.note}
          setNote={hook.setNote}
          saving={hook.saving}
          onClose={() => closeSheet(onClose)}
          handleSave={hook.handleSave}
        />

        <AccountPickerSheet
          visible={hook.showAccountPicker}
          title={hook.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle}
          accounts={hook.accountsForFrom}
          selectedId={hook.accountId}
          onSelect={hook.selectAccount}
          onClose={() => hook.setShowAccountPicker(false)}
        />
        <AccountPickerSheet
          visible={hook.showToPicker}
          title={Strings.addTxPickToTitle}
          accounts={hook.accountsForTo}
          selectedId={hook.toAccountId}
          excludeId={hook.accountId}
          onSelect={hook.selectToAccount}
          onClose={() => hook.setShowToPicker(false)}
        />
        <CategoryPickerSheet
          visible={hook.showCategoryPicker}
          title={Strings.addTxPickCategoryTitle}
          categories={hook.visibleCategories}
          selectedId={hook.categoryId}
          onSelect={hook.selectCategory}
          onClose={() => hook.setShowCategoryPicker(false)}
        />
      </Animated.View>
    </>
  );
}

// ─── Edit Transaction Sheet ───────────────────────────────────────────────────

interface EditProps {
  visible: boolean;
  onClose: () => void;
  tx: Transaction | null;
}

export function EditTransactionSheet({ visible, onClose, tx }: EditProps) {
  const { sheetStyle, overlayStyle, openSheet, closeSheet } = useAddTransactionAnim();

  useEffect(() => {
    if (visible) openSheet();
  }, [visible]);

  if (!visible || !tx) return null;

  return (
    <EditSheetInner
      tx={tx}
      onClose={onClose}
      sheetStyle={sheetStyle}
      overlayStyle={overlayStyle}
      closeSheet={closeSheet}
    />
  );
}

// Inner component so useEditTransaction can be called with a guaranteed non-null tx
function EditSheetInner({
  tx,
  onClose,
  sheetStyle,
  overlayStyle,
  closeSheet,
}: {
  tx: Transaction;
  onClose: () => void;
  sheetStyle: object;
  overlayStyle: object;
  closeSheet: (cb?: () => void) => void;
}) {
  const hook = useEditTransaction(tx, () => closeSheet(onClose));

  return (
    <>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet(onClose)} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <TransactionFormBody
          title={Strings.editTxTitle}
          locked={true}
          type={hook.type}
          onSelectType={() => {}}
          amountStr={hook.amountStr}
          handleNumpad={hook.handleNumpad}
          amountError={hook.errors.amount}
          selectedAccount={hook.selectedAccount}
          onOpenAccountPicker={() => {}}
          accountError={undefined}
          selectedToAccount={hook.selectedToAccount}
          onOpenToPicker={() => {}}
          toAccountError={undefined}
          selectedCategory={hook.selectedCategory}
          onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
          categoryError={hook.errors.category}
          isUSD={hook.isUSD}
          exchangeRate={hook.exchangeRate}
          setExchangeRate={hook.setExchangeRate}
          rateOverride={hook.rateOverride}
          toggleRateOverride={hook.toggleRateOverride}
          rateError={hook.errors.rate}
          note={hook.note}
          setNote={hook.setNote}
          saving={hook.saving}
          onClose={() => closeSheet(onClose)}
          handleSave={hook.handleSave}
        />

        <CategoryPickerSheet
          visible={hook.showCategoryPicker}
          title={Strings.addTxPickCategoryTitle}
          categories={hook.visibleCategories}
          selectedId={hook.categoryId}
          onSelect={hook.selectCategory}
          onClose={() => hook.setShowCategoryPicker(false)}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '92%',
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    zIndex: 11,
  },
});
