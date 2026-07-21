import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

import {
  AddTransactionSheet,
  type TransactionSheetSessionProps,
} from './components/add_transaction_sheet';
import { BudgetPickerSheet } from './components/budget_picker_sheet';
import { TransactionFormDataError } from './components/transaction_form_data_error';
import { useEditTransaction } from './edit_transaction.hook';
import { TransactionFormBody } from './transaction_form_body';
import { useTransactionFormSessionReady } from './transaction_form_session.hook';

export { AddTransactionSheet };

interface EditTransactionSheetProps extends TransactionSheetSessionProps {
  tx: Transaction;
}

export function EditTransactionSheet(props: EditTransactionSheetProps): React.ReactElement {
  const hook = useEditTransaction(props.tx, props.onClose, props.onSaved);
  useTransactionFormSessionReady(
    props.sessionId,
    props.onReady,
    hook.state.formDataReady || hook.state.formDataLoadError,
  );

  return (
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
        hook.state.formDataReady ? (
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
        ) : undefined
      }
    >
      {hook.state.formDataLoadError ? (
        <TransactionFormDataError onRetry={hook.retryFormData} />
      ) : hook.state.formDataReady ? (
        <TransactionFormBody
          datePickerOwnerId={`edit:${props.sessionId}`}
          formMode="edit"
          locked
          type={hook.state.type}
          typeLabel={hook.state.typeLabel}
          typeSupportingText={hook.state.typeSupportingText}
          onSelectType={() => {}}
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
      ) : null}

      {hook.state.showCategoryPicker ? (
        <CategoryPickerSheet
          isOpen
          title={Strings.addTxPickCategoryTitle}
          categories={hook.state.visibleCategories}
          selectedId={hook.state.categoryId}
          onSelect={hook.selectCategory}
          onOpenChange={(open) => {
            if (!open) hook.setShowCategoryPicker(false);
          }}
        />
      ) : null}
      {hook.state.showBudgetPicker ? (
        <BudgetPickerSheet
          isOpen
          budgets={hook.state.availableBudgets}
          selectedId={hook.state.budgetId || undefined}
          onSelect={hook.selectBudget}
          onOpenChange={hook.setShowBudgetPicker}
        />
      ) : null}
    </Sheet>
  );
}
