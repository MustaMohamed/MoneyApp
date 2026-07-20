import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { BudgetPickerSheet } from '@/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet';
import { useEditTransactionSheetLifecycle } from '@/modules/transactions/screens/transactions/transaction_form/components/edit_transaction_sheet.hook';
import { useEditTransaction } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { TransactionFormBody } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body';

export { AddTransactionSheet } from './components/add_transaction_sheet';

interface EditTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  tx: Transaction | null;
}

export function EditTransactionSheet(props: EditTransactionSheetProps): React.ReactElement | null {
  const lifecycle = useEditTransactionSheetLifecycle(props.visible);
  if (!props.tx) return null;
  return (
    <EditSheetInner
      key={lifecycle.sessionId}
      visible={props.visible}
      tx={props.tx}
      onClose={props.onClose}
      onSaved={props.onSaved}
      onCloseComplete={lifecycle.handleCloseComplete}
    />
  );
}

function EditSheetInner(
  props: Omit<EditTransactionSheetProps, 'tx'> & {
    tx: Transaction;
    onCloseComplete: () => void;
  },
) {
  const completeSave = useEditTransactionState.getState().completeSave;
  const onSaved = props.onSaved;
  const handleSaved = useCallback(() => {
    completeSave();
    onSaved?.();
  }, [completeSave, onSaved]);
  const hook = useEditTransaction(props.tx, props.onClose, handleSaved);

  return (
    <>
      <Sheet
        isOpen={props.visible}
        onOpenChange={(open) => {
          if (!open) props.onClose();
        }}
        onCloseComplete={props.onCloseComplete}
        title={Strings.editTxTitle}
        size="lg"
        scrollable
        isDismissable={!hook.state.saving}
        footer={
          <Button
            variant="primary"
            label={Strings.editTxSaveCta}
            isLoading={hook.state.saving}
            isDisabled={
              hook.state.saving ||
              hook.state.budgetsLoading ||
              Boolean(hook.state.budgetLookupError)
            }
            onPress={() => void hook.handleSave()}
          />
        }
      >
        <TransactionFormBody
          visible={props.visible}
          locked
          type={hook.state.type}
          typeLabel={hook.state.typeLabel}
          typeSupportingText={hook.state.typeSupportingText}
          onSelectType={() => {}}
          amountStr={hook.state.amountStr}
          setAmountStr={hook.setAmountStr}
          amountError={hook.state.errors.amount}
          selectedAccount={hook.state.selectedAccount}
          onOpenAccountPicker={() => {}}
          selectedToAccount={hook.state.selectedToAccount}
          onOpenToPicker={() => {}}
          selectedCategory={hook.state.selectedCategory}
          onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
          categoryError={hook.state.errors.category}
          showBudgetField={hook.state.showBudgetField}
          selectedBudget={hook.state.selectedBudget}
          budgetsLoading={hook.state.budgetsLoading}
          budgetLookupError={hook.state.budgetLookupError}
          onOpenBudgetPicker={() => hook.setShowBudgetPicker(true)}
          onRetryBudgetLookup={hook.retryBudgetLookup}
          budgetError={hook.state.errors.budget}
          errorMessage={hook.state.errorMessage}
          isUSD={hook.state.isUSD}
          exchangeRate={hook.state.exchangeRate}
          setExchangeRate={hook.setExchangeRate}
          rateOverride={hook.state.rateOverride}
          toggleRateOverride={hook.toggleRateOverride}
          rateUpdatedAt={hook.state.rateUpdatedAt}
          rateError={hook.state.errors.rate}
          date={hook.state.date}
          setDate={hook.setDate}
          note={hook.state.note}
          setNote={hook.setNote}
          currency={hook.state.selectedAccount?.currency ?? Currency.EGP}
        />
      </Sheet>

      <CategoryPickerSheet
        isOpen={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onOpenChange={() => hook.setShowCategoryPicker(false)}
      />
      <BudgetPickerSheet
        isOpen={hook.state.showBudgetPicker}
        budgets={hook.state.availableBudgets}
        selectedId={hook.state.budgetId || undefined}
        onSelect={hook.selectBudget}
        onOpenChange={hook.setShowBudgetPicker}
      />
    </>
  );
}
