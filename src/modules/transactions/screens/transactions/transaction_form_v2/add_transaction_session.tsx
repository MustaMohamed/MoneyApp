import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountPickerSheet } from '@/modules/accounts/components/account_picker_sheet';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import { useAddTransaction } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook';
import { BudgetPickerSheet } from '@/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet';
import { NoAccountsEmpty } from '@/modules/transactions/screens/transactions/transaction_form/components/no_accounts_empty';
import { TransactionFormDataError } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_data_error';
import { TransactionFormLoading } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_loading';
import { TransactionFormBody } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body';

import type { RegisterTransactionFormV2Submit } from './transaction_form_v2.hook';
import { useTransactionFormV2Prerequisites } from './transaction_form_v2_prerequisites.hook';
import { useTransactionFormV2Session } from './transaction_form_v2_session.hook';

export interface AddTransactionV2SessionProps {
  sessionId: number;
  onRegisterSubmit: RegisterTransactionFormV2Submit;
  onSaved: (sessionId: number) => void;
  onRequestAccountCreation: (sessionId: number) => void;
}

export function AddTransactionV2Session(props: AddTransactionV2SessionProps): React.ReactElement {
  const prerequisites = useTransactionFormV2Prerequisites(props.sessionId, 'add', null);
  const hook = useAddTransaction(() => props.onSaved(props.sessionId), prerequisites);
  const footerVisible = !hook.state.formDataReady || hook.state.hasAccounts;
  const footerDisabled =
    hook.state.saving ||
    !hook.state.formDataReady ||
    !hook.state.hasAccounts ||
    hook.state.budgetsLoading ||
    Boolean(hook.state.budgetLookupError);

  useTransactionFormV2Session({
    sessionId: props.sessionId,
    submit: hook.handleSave,
    footer: {
      visible: footerVisible,
      saving: hook.state.saving,
      disabled: footerDisabled,
    },
    onRegisterSubmit: props.onRegisterSubmit,
  });

  return (
    <>
      {hook.state.formDataLoadError ? (
        <TransactionFormDataError onRetry={hook.retryFormData} />
      ) : hook.state.formDataReady && hook.state.hasAccounts ? (
        <TransactionFormBody
          datePickerOwnerId={`add:${props.sessionId}`}
          formMode="add"
          locked={false}
          type={hook.state.type}
          typeLabel={hook.state.typeLabel}
          typeSupportingText={hook.state.typeSupportingText}
          onSelectType={hook.setType}
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
      ) : hook.state.formDataReady ? (
        <NoAccountsEmpty onAddAccount={() => props.onRequestAccountCreation(props.sessionId)} />
      ) : (
        <TransactionFormLoading />
      )}

      <AccountPickerSheet
        isOpen={hook.state.showAccountPicker}
        title={
          hook.state.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle
        }
        accounts={hook.state.accountsForFrom}
        selectedId={hook.state.accountId}
        onSelect={hook.selectAccount}
        onOpenChange={hook.setShowAccountPicker}
        onCloseComplete={() => hook.completePickerClose('account')}
      />
      <AccountPickerSheet
        isOpen={hook.state.showToPicker}
        title={Strings.addTxPickToTitle}
        accounts={hook.state.accountsForTo}
        selectedId={hook.state.toAccountId}
        excludeId={hook.state.accountId}
        onSelect={hook.selectToAccount}
        onOpenChange={hook.setShowToPicker}
        onCloseComplete={() => hook.completePickerClose('toAccount')}
      />
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
