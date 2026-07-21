import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountPickerSheet } from '@/modules/accounts/components/account_picker_sheet';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';

import { useAddTransaction } from '../add_transaction.hook';
import { TransactionFormBody } from '../transaction_form_body';
import { useTransactionFormSessionReady } from '../transaction_form_session.hook';
import { BudgetPickerSheet } from './budget_picker_sheet';
import { NoAccountsEmpty } from './no_accounts_empty';
import { TransactionFormDataError } from './transaction_form_data_error';
import { TransactionFormLoading } from './transaction_form_loading';

export interface TransactionSheetSessionProps {
  visible: boolean;
  sessionId: number;
  onReady: (sessionId: number) => void;
  onClose: () => void;
  onSaved: () => void;
  onCloseComplete: () => void;
}

export function AddTransactionSheet(props: TransactionSheetSessionProps): React.ReactElement {
  const hook = useAddTransaction(props.onSaved);
  useTransactionFormSessionReady(props.sessionId, props.onReady);

  return (
    <Sheet
      isOpen={props.visible}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      onCloseComplete={props.onCloseComplete}
      title={Strings.addTxTitle}
      size="lg"
      scrollable
      isDismissable={!hook.state.saving}
      footer={
        !hook.state.formDataReady || hook.state.hasAccounts ? (
          <Button
            variant="primary"
            label={Strings.addTxSaveCta}
            isLoading={hook.state.saving}
            isDisabled={
              hook.state.saving ||
              !hook.state.formDataReady ||
              !hook.state.hasAccounts ||
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
        <NoAccountsEmpty
          onAddAccount={() => {
            props.onClose();
            router.push('/accounts/add_account');
          }}
        />
      ) : (
        <TransactionFormLoading />
      )}

      {hook.state.showAccountPicker || hook.state.closingPicker === 'account' ? (
        <AccountPickerSheet
          isOpen={hook.state.showAccountPicker}
          title={
            hook.state.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle
          }
          accounts={hook.state.accountsForFrom}
          selectedId={hook.state.accountId}
          onSelect={hook.selectAccount}
          onOpenChange={(open) => {
            if (!open) hook.setShowAccountPicker(false);
          }}
          onCloseComplete={() => hook.completePickerClose('account')}
        />
      ) : null}
      {hook.state.showToPicker || hook.state.closingPicker === 'toAccount' ? (
        <AccountPickerSheet
          isOpen={hook.state.showToPicker}
          title={Strings.addTxPickToTitle}
          accounts={hook.state.accountsForTo}
          selectedId={hook.state.toAccountId}
          excludeId={hook.state.accountId}
          onSelect={hook.selectToAccount}
          onOpenChange={(open) => {
            if (!open) hook.setShowToPicker(false);
          }}
          onCloseComplete={() => hook.completePickerClose('toAccount')}
        />
      ) : null}
      {hook.state.showCategoryPicker || hook.state.closingPicker === 'category' ? (
        <CategoryPickerSheet
          isOpen={hook.state.showCategoryPicker}
          title={Strings.addTxPickCategoryTitle}
          categories={hook.state.visibleCategories}
          selectedId={hook.state.categoryId}
          onSelect={hook.selectCategory}
          onOpenChange={(open) => {
            if (!open) hook.setShowCategoryPicker(false);
          }}
          onCloseComplete={() => hook.completePickerClose('category')}
        />
      ) : null}
      {hook.state.showBudgetPicker || hook.state.closingPicker === 'budget' ? (
        <BudgetPickerSheet
          isOpen={hook.state.showBudgetPicker}
          budgets={hook.state.availableBudgets}
          selectedId={hook.state.budgetId || undefined}
          onSelect={hook.selectBudget}
          onOpenChange={hook.setShowBudgetPicker}
          onCloseComplete={() => hook.completePickerClose('budget')}
        />
      ) : null}
    </Sheet>
  );
}
