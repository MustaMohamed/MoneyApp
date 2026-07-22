import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { BudgetPickerSheet } from '@/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet';
import { TransactionFormDataError } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_data_error';
import { TransactionFormLoading } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_loading';
import { useEditTransaction } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook';
import { TransactionFormBody } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body';

import type { RegisterTransactionFormV2Submit } from './transaction_form_v2.hook';
import { useTransactionFormV2Prerequisites } from './transaction_form_v2_prerequisites.hook';
import { useTransactionFormV2Session } from './transaction_form_v2_session.hook';

export interface EditTransactionV2SessionProps {
  sessionId: number;
  tx: Transaction;
  onRegisterSubmit: RegisterTransactionFormV2Submit;
  onClose: () => void;
  onSaved: (sessionId: number) => void;
}

export function EditTransactionV2Session(props: EditTransactionV2SessionProps): React.ReactElement {
  const prerequisites = useTransactionFormV2Prerequisites(props.sessionId, 'edit', props.tx);
  const hook = useEditTransaction(
    props.tx,
    props.onClose,
    () => props.onSaved(props.sessionId),
    prerequisites,
  );
  const footerDisabled =
    hook.state.saving ||
    !hook.state.formDataReady ||
    hook.state.budgetsLoading ||
    Boolean(hook.state.budgetLookupError);

  useTransactionFormV2Session({
    sessionId: props.sessionId,
    submit: hook.handleSave,
    footer: {
      visible: true,
      saving: hook.state.saving,
      disabled: footerDisabled,
    },
    onRegisterSubmit: props.onRegisterSubmit,
  });

  return (
    <>
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
      ) : (
        <TransactionFormLoading />
      )}

      <CategoryPickerSheet
        isOpen={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onOpenChange={hook.setShowCategoryPicker}
        onCloseComplete={() => hook.completePickerClose('category')}
      />
      <BudgetPickerSheet
        isOpen={hook.state.showBudgetPicker}
        budgets={hook.state.availableBudgets}
        selectedId={hook.state.budgetId || undefined}
        onSelect={hook.selectBudget}
        onOpenChange={hook.setShowBudgetPicker}
        onCloseComplete={() => hook.completePickerClose('budget')}
      />
    </>
  );
}
