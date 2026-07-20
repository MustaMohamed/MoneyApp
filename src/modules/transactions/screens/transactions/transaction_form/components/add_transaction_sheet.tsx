import { router } from 'expo-router';
import { useCallback, useLayoutEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountPickerSheet } from '@/modules/accounts/components/account_picker_sheet';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import { useAddTransaction } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useAddTransactionSheetLifecycle } from '@/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.hook';
import { useAddTransactionSheetState } from '@/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.state';
import { BudgetPickerSheet } from '@/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet';
import { NoAccountsEmpty } from '@/modules/transactions/screens/transactions/transaction_form/components/no_accounts_empty';
import { TransactionFormBody } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body';

interface AddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AddTransactionSheet(props: AddTransactionSheetProps): React.ReactElement | null {
  const state = useAddTransactionSheetLifecycle(props.visible);
  if (!props.visible && !state.readyToOpen && !state.shouldRenderInner) return null;

  return (
    <Sheet
      isOpen={props.visible && state.readyToOpen}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={Strings.addTxTitle}
      size="lg"
      scrollable
      isDismissable={!state.saving}
      footer={
        state.hasFooter ? (
          <Button
            variant="primary"
            label={Strings.addTxSaveCta}
            isLoading={state.saving}
            isDisabled={state.saveDisabled}
            onPress={state.saveAction}
          />
        ) : undefined
      }
    >
      {state.shouldRenderInner ? (
        <AddTransactionSheetInner
          visible={props.visible && state.readyToOpen}
          onClose={props.onClose}
        />
      ) : null}
    </Sheet>
  );
}

function AddTransactionSheetInner({
  visible,
  onClose,
}: AddTransactionSheetProps): React.ReactElement {
  const completeSave = useAddTransactionState.getState().completeSave;
  const hook = useAddTransaction(completeSave);
  const handleSaveRef = useRef(hook.handleSave);
  handleSaveRef.current = hook.handleSave;
  const publishFooter = useAddTransactionSheetState.getState().publishFooter;
  const clearFooter = useAddTransactionSheetState.getState().clearFooter;
  const invokeSave = useCallback(() => void handleSaveRef.current(), []);

  useLayoutEffect(() => {
    publishFooter(
      hook.state.hasAccounts,
      hook.state.saving,
      hook.state.saving || hook.state.budgetsLoading || Boolean(hook.state.budgetLookupError),
      invokeSave,
    );
    return clearFooter;
  }, [
    clearFooter,
    hook.state.budgetsLoading,
    hook.state.budgetLookupError,
    hook.state.hasAccounts,
    hook.state.saving,
    invokeSave,
    publishFooter,
  ]);

  const handleAddAccount = useCallback(() => {
    onClose();
    router.push('/accounts/add_account');
  }, [onClose]);

  return (
    <>
      {hook.state.hasAccounts ? (
        <TransactionFormBody
          visible={visible}
          locked={false}
          type={hook.state.type}
          typeLabel={hook.state.typeLabel}
          typeSupportingText={hook.state.typeSupportingText}
          onSelectType={hook.setType}
          amountStr={hook.state.amountStr}
          setAmountStr={hook.setAmountStr}
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
      ) : (
        <NoAccountsEmpty onAddAccount={handleAddAccount} />
      )}

      <AccountPickerSheet
        isOpen={hook.state.showAccountPicker}
        title={
          hook.state.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle
        }
        accounts={hook.state.accountsForFrom}
        selectedId={hook.state.accountId}
        onSelect={hook.selectAccount}
        onOpenChange={() => hook.setShowAccountPicker(false)}
      />
      <AccountPickerSheet
        isOpen={hook.state.showToPicker}
        title={Strings.addTxPickToTitle}
        accounts={hook.state.accountsForTo}
        selectedId={hook.state.toAccountId}
        excludeId={hook.state.accountId}
        onSelect={hook.selectToAccount}
        onOpenChange={() => hook.setShowToPicker(false)}
      />
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
